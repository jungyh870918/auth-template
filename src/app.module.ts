import { Module, ValidationPipe, MiddlewareConsumer } from '@nestjs/common';
import { APP_PIPE } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { ReportsModule } from './reports/reports.module';
// rate limiting 장치
import { ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env.${process.env.NODE_ENV}`,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60,    // 60초 단위
        limit: 20,  // 1분 동안 20회 요청 가능
      },
    ]),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        type: 'sqlite',
        database: cfg.get<string>('DB_NAME', 'db.sqlite'),
        autoLoadEntities: true,
        synchronize: false,

      }),
    }), UsersModule,
    ReportsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        // DTO 검증 설정, 필요없는 값 제거
        whitelist: true,
        // DTO 에 존재하지 않는 값 오면 예외 발생 (보안 강화)
        forbidNonWhitelisted: true,
        // 타입 자동 변환 (예: '42' -> 42)
        transform: true,
      }),
    },
  ],
})
export class AppModule {


}
