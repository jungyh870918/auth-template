import { Expose } from 'class-transformer';

export class UserDto {
  @Expose()
  id: number;

  @Expose()
  email: string | null;

  @Expose()
  provider?: string | null;

  @Expose()
  providerId?: string | null;

  @Expose()
  name?: string | null;

  @Expose()
  avatarUrl?: string | null;
}
