// Oauth 를 고려한 User Dto

import { Expose } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class UserDto {
  // primary key
  @ApiProperty({ example: 1, description: '사용자 고유 ID' })
  @Expose()
  id: number;

  // oauth 를 고려하여 email nullable 허용
  @ApiProperty({ example: 'test@example.com', nullable: true, description: '이메일 (OAuth 사용자일 경우 null 가능)' })
  @Expose()
  email: string | null;

  // ex: google, kakao
  @ApiProperty({ example: 'google', nullable: true, description: 'OAuth 제공자 (google, kakao 등)' })
  @Expose()
  provider?: string | null;

  // oauth 관련, provider 가 내부에서 관리하는 user id
  @ApiProperty({ example: '1234567890', nullable: true, description: 'OAuth 제공자가 발급한 사용자 ID' })
  @Expose()
  providerId?: string | null;

  // oauth 에서 제공하는 이름(예, 닉네임) || 본 서비스 유저 이름
  @ApiProperty({ example: '홍길동', nullable: true, description: '사용자 이름 또는 닉네임' })
  @Expose()
  name?: string | null;

  // oauth 에서 제공하는 프로필 사진 (삭제 예정)
  @ApiProperty({ example: 'https://example.com/avatar.png', nullable: true, description: '사용자 프로필 이미지 URL (삭제 예정)' })
  @Expose()
  avatarUrl?: string | null;
}
