import { Module, ValidationPipe, MiddlewareConsumer } from '@nestjs/common';
import { APP_PIPE } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { ReportsModule } from './reports/reports.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env.${process.env.NODE_ENV}`,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        type: 'sqlite',
        database: cfg.get<string>('DB_NAME', 'db.sqlite'),
        autoLoadEntities: true,   // 엔티티 자동 로드 (Nest 권장)
        synchronize: false,       // 개발 중에만 true 가능; 마이그레이션 사용시 false
        // migrations: [__dirname + '/migrations/*{.ts,.js}'],
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
