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
  UseGuards,
  Res,
  Inject,
  BadRequestException,
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
import { Redis } from 'ioredis';
import * as crypto from 'crypto';
import { UseInterceptors } from '@nestjs/common';
import { CurrentUserInterceptor } from './interceptors/current-user.interceptor';

@Controller('auth')
@UseInterceptors(CurrentUserInterceptor)
@Serialize(UserDto)
export class UsersController {
  constructor(
    private usersService: UsersService,
    private authService: AuthService,
    private configService: ConfigService,
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
  ) { }

  @Get('/kakao/login')
  async kakaoLogin(@Res() res: Response) {
    const clientId = this.configService.get<string>('KAKAO_REST_API_KEY')!;
    const redirectUri = this.configService.get<string>('KAKAO_REDIRECT_URI')!;
    const state = crypto.randomUUID();
    await this.redis.set(`oauth:state:${state}`, '1', 'EX', 300); // 5분 TTL

    const url =
      `https://kauth.kakao.com/oauth/authorize?response_type=code` +
      `&client_id=${clientId}&redirect_uri=${redirectUri}` +
      `&scope=${encodeURIComponent('profile_nickname,account_email')}` +
      `&state=${encodeURIComponent(state)}`;
    return res.redirect(url); // 인터셉터 영향 없음
  }

  @Get('/kakao/callback')
  async kakaoCallback(
    @Query('code') code: string,
    @Query('state') state: string,
  ) {
    if (!state) {
      throw new BadRequestException('missing state');
    }

    const key = `oauth:state:${state}`;

    const saved = await this.redis.getdel(key);

    if (!saved) {
      throw new BadRequestException('invalid state');
    }

    return this.authService.signInWithKakao(code);
  }

  @Get('/whoami')
  @UseGuards(AuthGuard) // ✅ access token 필요
  whoAmI(@CurrentUser() user: User) {
    console.log('user:', user);
    return { user };
  }

  @Post('/refresh')
  async refresh(@Body() body: RefreshDto) {
    return await this.authService.rotateRefreshToken(body.refreshToken);
  }

  @Post('/signout')
  async signOut(@Body('refreshToken') refreshToken: string) {
    return this.authService.logout(refreshToken);
  }


  @Post('/signup')
  async createUser(@Body() body: CreateUserDto) {
    const { user, accessToken, refreshToken } = await this.authService.signup(
      body.email,
      body.password,
    );

    return { user, accessToken, refreshToken };
  }

  @Post('/signin')
  async signin(@Body() body: CreateUserDto) {
    const { user, accessToken, refreshToken } = await this.authService.signin(
      body.email,
      body.password,
    );

    return { user, accessToken, refreshToken };
  }

  @Get('/:id')
  @UseGuards(AuthGuard) // ✅ 유저 정보 보호
  async findUser(@Param('id') id: string) {
    const user = await this.usersService.findOne(parseInt(id));
    if (!user) {
      throw new NotFoundException('user not found');
    }
    return { user };
  }

  @Get()
  @UseGuards(AuthGuard) // ✅ 유저 검색 보호
  findAllUsers(@Query('email') email: string) {
    return this.usersService.find(email);
  }

  @Delete('/:id')
  @UseGuards(AuthGuard) // ✅ 삭제 보호
  async removeUser(@Param('id') id: string) {
    const result = await this.usersService.remove(parseInt(id));
    console.log(result);
    return { success: true };
  }

  @Patch('/:id')
  @UseGuards(AuthGuard) // ✅ 수정 보호
  async updateUser(@Param('id') id: string, @Body() body: UpdateUserDto) {
    const user = await this.usersService.update(parseInt(id), body);
    return { user };
  }
}
