// Oauth 를 고려한 User Dto

import { Expose } from 'class-transformer';

export class UserDto {
  // primary key
  @Expose()
  id: number;

  // oauth 를 고려하여 email nullable 허용
  @Expose()
  email: string | null;

  // ex: google, kakao
  @Expose()
  provider?: string | null;

  // oauth 관련, provider 가 내부에서 관리하는 user id
  @Expose()
  providerId?: string | null;

  // oauth 에서 제공하는 이름
  @Expose()
  name?: string | null;

  // oauth 에서 제공하는 프로필 사진 (삭제 예정)
  @Expose()
  avatarUrl?: string | null;
}
