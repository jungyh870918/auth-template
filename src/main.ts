// main.ts
import { writeFileSync } from 'fs';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = new DocumentBuilder()
    .setTitle('Auth API')
    .setDescription('회원가입, 로그인, 토큰 갱신 API 문서')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);

  // swagger.json 파일로 저장
  writeFileSync('./swagger.json', JSON.stringify(document, null, 2));

  SwaggerModule.setup('docs', app, document);

  await app.listen(3000);
}
bootstrap();
