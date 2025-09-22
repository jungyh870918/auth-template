// src/common/token/token.service.ts
import { Inject, Injectable } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';
import { Redis } from 'ioredis';
import { ConfigService } from '@nestjs/config';

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
        return crypto.createHash('sha256').update(token).digest('hex');
    }

    private refreshKey(userId: number, jti: string) {
        return `refresh:${userId}:${jti}`;
    }

    async generateAccessToken(user: { id: number; tokenVersion: number }) {
        const secret = this.config.get<string>('JWT_ACCESS_SECRET', 'access_secret');
        const expiresIn = this.config.get<jwt.SignOptions['expiresIn']>('JWT_ACCESS_EXPIRES', '15m');
        return jwt.sign({ sub: user.id, v: user.tokenVersion, typ: 'access' }, secret, { expiresIn });
    }

    async generateRefreshToken(user: { id: number; tokenVersion: number }) {
        const secret = this.config.get<string>('JWT_REFRESH_SECRET', 'refresh_secret');
        const expiresIn = this.config.get<jwt.SignOptions['expiresIn']>('JWT_REFRESH_EXPIRES', '7d');
        const jti = crypto.randomUUID();

        const token = jwt.sign(
            { sub: user.id, v: user.tokenVersion, jti, typ: 'refresh' },
            secret,
            { expiresIn },
        );

        const key = this.refreshKey(user.id, jti);
        // TTL은 expiresIn과 1:1로 맞추기 위해 환경값을 초로 변환해도 되지만,
        // 간단히 7일(기본값)로 지정해둡니다. 필요 시 파싱 로직 추가 가능.
        const ttl = 60 * 60 * 24 * 7; // 7일
        await this.redis.set(key, this.hashToken(token), 'EX', ttl);

        const savedTtl = await this.redis.ttl(key);
        console.log(`[Redis] Refresh token stored -> key: ${key}, ttl: ${savedTtl}s`);

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
            const secret = this.config.get<string>('JWT_REFRESH_SECRET', 'refresh_secret');
            const payload = jwt.verify(token, secret) as unknown as RefreshPayload;

            // typ 검사 (refresh 토큰인지 확인)
            if (payload.typ !== 'refresh') return null;

            // Redis에서 해시 확인
            const key = `refresh:${payload.sub}:${payload.jti}`;
            const storedHash = await this.redis.get(key);
            if (!storedHash) return null;

            // 토큰 해시 일치 여부
            if (storedHash !== this.hashToken(token)) return null;

            return payload; // payload까지 반환하면 이후 로직에서 재사용 가능
        } catch {
            return null;
        }
    }


    async invalidateRefreshToken(userId: number, jti: string) {
        const key = this.refreshKey(userId, jti);
        const deleted = await this.redis.del(key);
        console.log(`[Redis] Refresh token deleted -> key: ${key}, deleted: ${deleted}`);
    }

    async invalidateAllUserTokens(userId: number) {
        const stream = this.redis.scanStream({ match: `refresh:${userId}:*`, count: 100 });
        stream.on('data', (keys: string[]) => {
            if (keys.length) {
                const pipeline = this.redis.pipeline();
                keys.forEach((k) => pipeline.del(k));
                pipeline.exec();
            }
        });
    }
}
