import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RefreshDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...', // 실제 JWT 예시
    description: 'Refresh 토큰',
  })
  @IsString()
  refreshToken!: string;
}
