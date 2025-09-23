// 비밀번호 보안강화: 최소 8자, 최대 64자, 대문자, 숫자, 특수문자 포함
import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(64)
  @Matches(/^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).*$/, {
    message:
      '비밀번호는 대문자, 숫자, 특수문자를 각각 최소 1개 이상 포함해야 합니다',
  })
  password: string;
}
