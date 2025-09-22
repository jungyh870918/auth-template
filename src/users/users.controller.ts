import {
  Body,
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Query,
  NotFoundException,
  Session,
  UseGuards,
  Res,
} from '@nestjs/common';
import { CreateUserDto } from './dtos/create-user.dto';
import { UpdateUserDto } from './dtos/update-user.dto';
import { RefreshDto } from './dtos/refresh.dto';
import { UsersService } from './users.service';
import { Serialize } from '../interceptors/serialize.interceptor';
import { UserDto } from './dtos/user.dto';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { User } from './user.entity';
import { AuthGuard } from '../guards/auth.guard';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';

@Controller('auth')
@Serialize(UserDto)
export class UsersController {
  constructor(
    private usersService: UsersService,
    private authService: AuthService,
    private configService: ConfigService,
  ) {}

  @Get('/kakao/login')
  kakaoLogin(@Res() res: Response) {
    const clientId = this.configService.get<string>('KAKAO_REST_API_KEY')!;
    const redirectUri = this.configService.get<string>('KAKAO_REDIRECT_URI')!;
    const url =
      `https://kauth.kakao.com/oauth/authorize?response_type=code` +
      `&client_id=${clientId}&redirect_uri=${encodeURIComponent(
        redirectUri,
      )}&scope=profile_nickname,account_email
`;
    return res.redirect(url); // 인터셉터 영향 없음
  }

  @Get('/kakao/callback')
  async kakaoCallback(@Query('code') code: string) {
    return this.authService.signInWithKakao(code);
  }

  @Get('/whoami')
  @UseGuards(AuthGuard) // ✅ access token 필요
  whoAmI(@CurrentUser() user: User) {
    return user;
  }

  @Post('/refresh')
  async refresh(@Body() body: RefreshDto) {
    return this.authService.rotateRefreshToken(body.refreshToken);
  }

  @Post('/signout')
  signOut(@Session() session: any) {
    session.userId = null; // ❌ Guard 선택 사항 (정책에 따라)
  }

  @Post('/signup')
  async createUser(@Body() body: CreateUserDto, @Session() session: any) {
    const { user, accessToken, refreshToken } = await this.authService.signup(
      body.email,
      body.password,
    );
    session.userId = user.id;
    return { user, accessToken, refreshToken };
  }

  @Post('/signin')
  async signin(@Body() body: CreateUserDto, @Session() session: any) {
    const { user, accessToken, refreshToken } = await this.authService.signin(
      body.email,
      body.password,
    );
    session.userId = user.id;
    return { user, accessToken, refreshToken };
  }

  @Get('/:id')
  @UseGuards(AuthGuard) // ✅ 유저 정보 보호
  async findUser(@Param('id') id: string) {
    const user = await this.usersService.findOne(parseInt(id));
    if (!user) {
      throw new NotFoundException('user not found');
    }
    return user;
  }

  @Get()
  @UseGuards(AuthGuard) // ✅ 유저 검색 보호
  findAllUsers(@Query('email') email: string) {
    return this.usersService.find(email);
  }

  @Delete('/:id')
  @UseGuards(AuthGuard) // ✅ 삭제 보호
  removeUser(@Param('id') id: string) {
    return this.usersService.remove(parseInt(id));
  }

  @Patch('/:id')
  @UseGuards(AuthGuard) // ✅ 수정 보호
  updateUser(@Param('id') id: string, @Body() body: UpdateUserDto) {
    return this.usersService.update(parseInt(id), body);
  }
}
