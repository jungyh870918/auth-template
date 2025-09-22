import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Module({
    providers: [
        {
            provide: 'REDIS_CLIENT',
            inject: [ConfigService],
            useFactory: (config: ConfigService) => {
                const url = config.get<string>('REDIS_URL') || 'redis://localhost:6379';
                return new Redis(url);
            },
        },
    ],
    exports: ['REDIS_CLIENT'],
})
export class RedisModule { }
