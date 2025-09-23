import { Inject, Injectable } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';
import { Redis } from 'ioredis';
import { ConfigService } from '@nestjs/config';
import ms from 'ms';

export type RefreshPayload = {
  sub: number;
  v: number;
  jti: string;
  typ: 'refresh';
  iat: number;
  exp: number;
};

@Injectable()
export class TokenService {
  constructor(
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
    private readonly config: ConfigService,
  ) { }

  private hashToken(token: string): string {
    const secret = this.config.get<string>(
      'TOKEN_HASH_SECRET',
      'default_hash_secret',
    );
    return crypto.createHmac('sha256', secret).update(token).digest('hex');
  }

  private safeEqualsHex(aHex: string, bHex: string) {
    const a = Buffer.from(aHex, 'hex');
    const b = Buffer.from(bHex, 'hex');
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  }

  private refreshKey(userId: number, jti: string) {
    return `refresh:${userId}:${jti}`;
  }

  async generateAccessToken(user: { id: number; tokenVersion: number }) {
    const secret =
      this.config.get<string>('JWT_ACCESS_SECRET') || 'default_access_secret';
    const expiresIn = this.config.get<jwt.SignOptions['expiresIn']>(
      'JWT_ACCESS_EXPIRES',
      '15m',
    );
    return jwt.sign(
      { sub: user.id, v: user.tokenVersion, typ: 'access' },
      secret,
      { expiresIn },
    );
  }

  async generateRefreshToken(user: { id: number; tokenVersion: number }) {
    const secret =
      this.config.get<string>('JWT_REFRESH_SECRET') || 'default_refresh_secret';


    const expiresInStr =
      this.config.get<jwt.SignOptions['expiresIn']>('JWT_REFRESH_EXPIRES') ||
      '7d';

    // redis 에서 관리할 토큰이므로 식별자 (jti) 를 포함한 토큰 발급
    // 전체 로그아웃 말고 기기별 로그아웃 할때는 유저 아이디만으로는 토큰 식별 불가
    const jti = crypto.randomUUID();
    const token = jwt.sign(
      { sub: user.id, v: user.tokenVersion, jti, typ: 'refresh' },
      secret,
      { expiresIn: expiresInStr },
    );


    let ttl = 60 * 60 * 24 * 7;
    // redis ttl 은 초 단위, 환경변수에 저장된 문자열 파싱 필요 ("7d" -> ?? seconds)
    try {
      const parsed = ms(expiresInStr as ms.StringValue);
      if (typeof parsed === 'number') {
        ttl = Math.floor(parsed / 1000);
      }
    } catch (e) {
      console.warn(
        `[Redis] Failed to parse JWT_REFRESH_EXPIRES=${expiresInStr}, fallback=${ttl}s`,
      );
    }

    const key = this.refreshKey(user.id, jti);

    // 레디스 토큰 탈취 방지를 위해 해시값으로 저장
    await this.redis.set(key, this.hashToken(token), 'EX', ttl);


    // 레디스에 저장된 토큰 해쉬 결과값 출력용 코드
    const savedTtl = await this.redis.ttl(key);
    console.log(
      `[Redis] Refresh token stored -> key: ${key}, ttl: ${savedTtl}s`,
    );

    return token;
  }

  isRefreshPayload(payload: any): payload is RefreshPayload {
    return (
      payload &&
      typeof payload.sub === 'number' &&
      typeof payload.v === 'number' &&
      typeof payload.jti === 'string' &&
      payload.typ === 'refresh'
    );
  }

  async validateRefreshToken(token: string): Promise<RefreshPayload | null> {
    try {
      const secret = this.config.get<string>('JWT_REFRESH_SECRET');
      const payload = jwt.verify(token, secret) as unknown as RefreshPayload;


      if (payload.typ !== 'refresh') return null;

      // Redis에서 토큰 해시 확인
      const key = `refresh:${payload.sub}:${payload.jti}`;
      const storedHash = await this.redis.get(key);
      if (!storedHash) return null;

      // 토큰 해시 일치 여부
      if (!this.safeEqualsHex(storedHash, this.hashToken(token))) return null;

      return payload;
    } catch {
      return null;
    }
  }

  async invalidateRefreshToken(userId: number, jti: string) {
    const key = this.refreshKey(userId, jti);

    // redis 에서 토큰 해시값 삭제 확인용 출력을 위한 로직
    const deleted = await this.redis.del(key);
    console.log(
      `[Redis] Refresh token deleted -> key: ${key}, deleted: ${deleted}`,
    );
  }


  // 삭제 방법을 조금 더 안전하고( await 키워드 ), 부하가 덜 가게 바꿀수도 있다.
  async invalidateAllUserTokens(userId: number) {
    const stream = this.redis.scanStream({
      match: `refresh:${userId}:*`,
      count: 100,
    });
    stream.on('data', (keys: string[]) => {
      if (keys.length) {
        const pipeline = this.redis.pipeline();
        keys.forEach((k) => pipeline.del(k));
        pipeline.exec();
      }
    });
  }
}
