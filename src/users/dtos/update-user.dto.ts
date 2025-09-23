// 비밀번호 보안강화: 최소 8자, 최대 64자, 대문자, 숫자, 특수문자 포함

import {
  IsEmail,
  IsString,
  IsOptional,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiPropertyOptional({
    example: 'new@example.com',
    description: '수정할 이메일 (선택)',
  })
  @IsEmail()
  @IsOptional()
  email: string;

  @ApiPropertyOptional({
    example: 'NewPass123!',
    description:
      '수정할 비밀번호 (선택, 최소 8자, 최대 64자, 대문자/숫자/특수문자 각각 최소 1개 포함)',
  })
  @IsString()
  @IsOptional()
  @MinLength(8)
  @MaxLength(64)
  @Matches(/^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).*$/, {
    message:
      '비밀번호는 대문자, 숫자, 특수문자를 각각 최소 1개 이상 포함해야 합니다',
  })
  password: string;

  @ApiPropertyOptional({
    example: '홍길동',
    description: '수정할 이름 (선택, 2~32자)',
  })
  @IsString()
  @IsOptional()
  @MinLength(2)
  @MaxLength(32)
  name: string;
}
