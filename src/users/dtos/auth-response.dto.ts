import { ApiProperty } from '@nestjs/swagger';
import { UserDto } from './user.dto';
export class AuthResponseDto {
    @ApiProperty({ type: UserDto })
    user: UserDto;

    @ApiProperty({ example: 'eyJhbGciOi...' })
    accessToken: string;

    @ApiProperty({ example: 'eyJhbGciOi...' })
    refreshToken: string;
}