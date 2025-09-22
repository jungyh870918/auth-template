// src/common/token/token.service.ts
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
  ) {}

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

    // 환경변수에서 만료시간 문자열 가져오기 (기본값 "7d")
    const expiresInStr =
      this.config.get<jwt.SignOptions['expiresIn']>('JWT_REFRESH_EXPIRES') ||
      '7d';

    // JWT 생성
    const jti = crypto.randomUUID();
    const token = jwt.sign(
      { sub: user.id, v: user.tokenVersion, jti, typ: 'refresh' },
      secret,
      { expiresIn: expiresInStr },
    );

    // TTL = expiresIn 파싱 (밀리초 → 초 변환)
    let ttl = 60 * 60 * 24 * 7; // fallback = 7일
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
    await this.redis.set(key, this.hashToken(token), 'EX', ttl);

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

      // typ 검사 (refresh 토큰인지 확인)
      if (payload.typ !== 'refresh') return null;

      // Redis에서 해시 확인
      const key = `refresh:${payload.sub}:${payload.jti}`;
      const storedHash = await this.redis.get(key);
      if (!storedHash) return null;

      // 토큰 해시 일치 여부
      if (!this.safeEqualsHex(storedHash, this.hashToken(token))) return null;

      return payload; // payload까지 반환하면 이후 로직에서 재사용 가능
    } catch {
      return null;
    }
  }

  async invalidateRefreshToken(userId: number, jti: string) {
    const key = this.refreshKey(userId, jti);
    const deleted = await this.redis.del(key);
    console.log(
      `[Redis] Refresh token deleted -> key: ${key}, deleted: ${deleted}`,
    );
  }

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
