import { Inject, Injectable } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';
import { Redis } from 'ioredis';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TokenService {
    constructor(
        @Inject('REDIS_CLIENT') private readonly redis: Redis,
        private readonly config: ConfigService,
    ) { }

    private hashToken(token: string): string {
        return crypto.createHash('sha256').update(token).digest('hex');
    }

    async generateAccessToken(user: { id: number; tokenVersion: number }) {
        const secret = this.config.get<string>('JWT_ACCESS_SECRET', 'access_secret');
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
        const secret = this.config.get<string>('JWT_REFRESH_SECRET', 'refresh_secret');
        const expiresIn = this.config.get<jwt.SignOptions['expiresIn']>(
            'JWT_REFRESH_EXPIRES',
            '15m',
        ); const options: jwt.SignOptions = { expiresIn };

        const jti = crypto.randomUUID();
        const token = jwt.sign(
            { sub: user.id, v: user.tokenVersion, jti, typ: 'refresh' },
            secret,
            options,
        );

        const key = `refresh:${user.id}:${jti}`;
        const ttl = 60 * 60 * 24 * 30; // 30일
        await this.redis.set(key, this.hashToken(token), 'EX', ttl);

        return token;
    }

    async validateRefreshToken(userId: number, token: string): Promise<boolean> {
        try {
            const secret = this.config.get<string>('JWT_REFRESH_SECRET', 'refresh_secret');
            const payload = jwt.verify(token, secret) as any;

            const key = `refresh:${userId}:${payload.jti}`;
            const storedHash = await this.redis.get(key);
            return !!storedHash && storedHash === this.hashToken(token);
        } catch {
            return false;
        }
    }

    async invalidateRefreshToken(userId: number, jti: string) {
        await this.redis.del(`refresh:${userId}:${jti}`);
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
