import { IsString, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateReportDto {
  @ApiProperty({
    description: '제조사',
    example: 'Samsung',
  })
  @IsString()
  manufacturer: string;

  @ApiProperty({
    description: '모델명',
    example: 'Galaxy S24',
  })
  @IsString()
  model: string;

  @ApiProperty({
    description: '화면 크기 (inch)',
    example: 6.1,
    minimum: 1,
    maximum: 10,
  })
  @IsNumber()
  @Min(1)
  @Max(10)
  screenSize: number;

  @ApiProperty({
    description: '가격',
    example: 1200000,
    minimum: 0,
    maximum: 10000000,
  })
  @IsNumber()
  @Min(0)
  @Max(10_000_000)
  price: number;
}
