import { Expose, Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class ReportDto {
  @ApiProperty({ description: '리포트 고유 ID' })
  @Expose()
  id: number;

  @ApiProperty({ description: '제조사', example: 'Samsung' })
  @Expose()
  manufacturer: string; // 제조사

  @ApiProperty({ description: '모델명', example: 'Galaxy S24' })
  @Expose()
  model: string; // 모델명

  @ApiProperty({ description: '화면 크기 (inch 단위)', example: 6.8 })
  @Expose()
  screenSize: number; // 화면 크기

  @ApiProperty({ description: '가격 (원)', example: 1200000 })
  @Expose()
  price: number; // 가격

  @ApiProperty({ description: '작성자 유저 ID', example: 1 })
  @Transform(({ obj }) => obj.user?.id)
  @Expose()
  userId: number;
}
