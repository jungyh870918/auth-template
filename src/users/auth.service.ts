import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { randomBytes, scrypt as _scrypt } from 'crypto';
import { promisify } from 'util';
import { TokenService } from '../common/token/token.service'; // ✅ TokenService import

const scrypt = promisify(_scrypt);

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private tokenService: TokenService, // ✅ 주입
  ) { }

  async signup(email: string, password: string) {
    // 1. 이메일 중복 체크
    const users = await this.usersService.find(email);
    if (users.length) {
      throw new BadRequestException('email in use');
    }

    // 2. 비밀번호 해싱
    const salt = randomBytes(8).toString('hex');
    const hash = (await scrypt(password, salt, 32)) as Buffer;
    const result = `${salt}.${hash.toString('hex')}`;

    // 3. 유저 생성
    const user = await this.usersService.create(email, result);

    // 4. 토큰 발급
    const accessToken = await this.tokenService.generateAccessToken({
      id: user.id,
      tokenVersion: user.tokenVersion,
    });
    const refreshToken = await this.tokenService.generateRefreshToken({
      id: user.id,
      tokenVersion: user.tokenVersion,
    });

    return { user, accessToken, refreshToken };
  }

  async signin(email: string, password: string) {
    // 1. 유저 조회
    const [user] = await this.usersService.find(email);
    if (!user) {
      throw new NotFoundException('user not found');
    }

    // 2. 비밀번호 검증
    const [salt, storedHash] = user.password.split('.');
    const hash = (await scrypt(password, salt, 32)) as Buffer;
    if (storedHash !== hash.toString('hex')) {
      throw new BadRequestException('bad password');
    }

    // 3. 토큰 발급
    const accessToken = await this.tokenService.generateAccessToken({
      id: user.id,
      tokenVersion: user.tokenVersion,
    });
    const refreshToken = await this.tokenService.generateRefreshToken({
      id: user.id,
      tokenVersion: user.tokenVersion,
    });

    return { user, accessToken, refreshToken };
  }
}
