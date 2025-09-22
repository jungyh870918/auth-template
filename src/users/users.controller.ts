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

@Controller('auth')
@Serialize(UserDto)
export class UsersController {
  constructor(
    private usersService: UsersService,
    private authService: AuthService,
  ) {}

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
