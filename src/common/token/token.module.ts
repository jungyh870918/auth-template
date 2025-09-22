import { Module } from '@nestjs/common';
import { RedisModule } from '../../../redis.module';
import { TokenService } from './token.service';

@Module({
  imports: [RedisModule], // ⬅️ 여기서 RedisModule 연결
  providers: [TokenService],
  exports: [TokenService],
})
export class TokenModule {}
