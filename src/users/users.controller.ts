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
  UseInterceptors,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CreateUserDto } from './dtos/create-user.dto';
import { UpdateUserDto } from './dtos/update-user.dto';
import { SignInUserDto } from './dtos/signin-user.dto';
import { RefreshDto } from './dtos/refresh.dto';

// 스웨거 문서를 위한 DTO 임포트
import { AuthResponseDto } from './dtos/auth-response.dto';
import { TokenResponseDto } from './dtos/token-response.dto';
import { LogoutResponseDto } from './dtos/logout-response.dto';
import { SuccessResponseDto } from './dtos/success-response.dto';


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
import { CurrentUserInterceptor } from './interceptors/current-user.interceptor';




@ApiTags('auth') // Swagger 그룹 이름
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
  @ApiOperation({ summary: '카카오 로그인 페이지 리다이렉트' })
  async kakaoLogin(@Res() res: Response) {
    const clientId = this.configService.get<string>('KAKAO_REST_API_KEY')!;
    const redirectUri = this.configService.get<string>('KAKAO_REDIRECT_URI')!;

    const state = crypto.randomUUID();
    await this.redis.set(`oauth:state:${state}`, '1', 'EX', 300);

    const url =
      `https://kauth.kakao.com/oauth/authorize?response_type=code` +
      `&client_id=${clientId}&redirect_uri=${redirectUri}` +
      `&scope=${encodeURIComponent('profile_nickname,account_email')}` +
      `&state=${encodeURIComponent(state)}`;
    return res.redirect(url);
  }

  @Get('/kakao/callback')
  @ApiOperation({ summary: '카카오 로그인 콜백 처리' })
  async kakaoCallback(@Query('code') code: string, @Query('state') state: string) {
    if (!state) throw new BadRequestException('missing state');

    const key = `oauth:state:${state}`;
    const saved = await this.redis.getdel(key);

    if (!saved) throw new BadRequestException('invalid state');

    return this.authService.signInWithKakao(code);
  }

  @Get('/me')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '현재 로그인한 사용자 정보 조회' })
  @ApiResponse({ status: 200, type: UserDto })
  me(@CurrentUser() user: User) {
    return { user };
  }

  @Post('/refresh')
  @ApiOperation({ summary: '리프레시 토큰 갱신' })
  @ApiResponse({ status: 201, type: TokenResponseDto })
  async refresh(@Body() body: RefreshDto) {
    return await this.authService.rotateRefreshToken(body.refreshToken);
  }

  @Post('/signout')
  @ApiOperation({ summary: '로그아웃 (리프레시 토큰 무효화)' })
  @ApiResponse({ status: 200, type: LogoutResponseDto })
  async signOut(@Body() body: RefreshDto) {
    return this.authService.logout(body.refreshToken);
  }

  @Post('/signup')
  @ApiOperation({ summary: '회원가입' })
  @ApiResponse({ status: 201, description: '회원가입 성공', type: AuthResponseDto })
  async createUser(@Body() body: CreateUserDto) {
    const { user, accessToken, refreshToken } = await this.authService.signup(
      body.email,
      body.password,
      body.name,
    );
    return { user, accessToken, refreshToken };
  }

  @Post('/signin')
  @ApiOperation({ summary: '로그인' })
  @ApiResponse({ status: 201, type: AuthResponseDto })
  async signin(@Body() body: SignInUserDto) {
    const { user, accessToken, refreshToken } = await this.authService.signin(
      body.email,
      body.password,
    );
    return { user, accessToken, refreshToken };
  }

  @Get('/:id')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '특정 사용자 조회' })
  @ApiResponse({ status: 200, type: UserDto })
  async findUser(@Param('id') id: string) {
    const user = await this.usersService.findOne(parseInt(id));
    if (!user) {
      throw new HttpException(
        {
          code: 'AUTH_USER_NOT_FOUND',
          message: '해당 사용자를 찾을 수 없습니다',
        },
        HttpStatus.NOT_FOUND, // 404
      );
    }
    return user;
  }

  @Get()
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '사용자 전체 조회 (이메일 필터 가능)' })
  @ApiResponse({ status: 200, type: [UserDto] })
  findAllUsers(@Query('email') email: string) {
    return this.usersService.find(email);
  }

  @Delete('/:id')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '사용자 삭제' })
  @ApiResponse({ status: 200, type: SuccessResponseDto })
  async removeUser(@Param('id') id: string) {
    await this.usersService.remove(parseInt(id));
    return { success: true };
  }

  @Patch('/:id')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '사용자 정보 수정' })
  @ApiResponse({ status: 200, type: UserDto })
  async updateUser(@Param('id') id: string, @Body() body: UpdateUserDto) {
    return await this.usersService.update(parseInt(id), body);
  }
}
