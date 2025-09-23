import axios from 'axios';

import {
  Injectable,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { randomBytes, scrypt as _scrypt } from 'crypto';
import { promisify } from 'util';
import { TokenService } from '../common/token/token.service'; // ✅ TokenService import
import { ConfigService } from '@nestjs/config';

const scrypt = promisify(_scrypt);

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private tokenService: TokenService,
    private configService: ConfigService,
  ) { }

  async signInWithKakao(code: string) {
    try {
      const client_id = this.configService.get<string>('KAKAO_REST_API_KEY')!;
      const redirect_uri =
        this.configService.get<string>('KAKAO_REDIRECT_URI')!;
      const client_secret = this.configService.get<string>(
        'KAKAO_CLIENT_SECRET',
      );

      const body = new URLSearchParams({
        grant_type: 'authorization_code',
        client_id,
        redirect_uri,
        code,
      });

      // 현재 카카오 앱 콘솔 설정에서는 secret 사용하지 않음으로 해둠, 그래서 현재는 옵션처리
      if (client_secret) body.append('client_secret', client_secret);


      const tokenRes = await axios.post(
        'https://kauth.kakao.com/oauth/token',
        body,
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
      );

      const kakaoAccessToken = tokenRes.data.access_token as string;


      const meRes = await axios.get('https://kapi.kakao.com/v2/user/me', {
        headers: { Authorization: `Bearer ${kakaoAccessToken}` },
      });

      console.log('meRes.data:', meRes.data);

      const kakaoId = String(meRes.data.id);
      const kakaoAccount = meRes.data.kakao_account ?? {};
      const profile = kakaoAccount.profile ?? {};
      const email: string | undefined = kakaoAccount.email;
      const name: string | undefined = profile.nickname;
      const avatarUrl: string | undefined = profile.profile_image_url;

      console.log('kakaoId, email, name, avatarUrl:', kakaoId, email, name, avatarUrl);
      const user = await this.usersService.upsertOAuthUser({
        provider: 'kakao',
        providerId: kakaoId,
        email: email ?? null,
        name: name ?? null,
        avatarUrl: avatarUrl ?? null,
      });

      const accessToken = await this.tokenService.generateAccessToken({
        id: user.id,
        tokenVersion: user.tokenVersion,
      });
      const refreshToken = await this.tokenService.generateRefreshToken({
        id: user.id,
        tokenVersion: user.tokenVersion,
      });

      return { user, accessToken, refreshToken };
    } catch (e: any) {
      if (e.response) {
        console.error('Error status:', e.response.status);
        console.error('Error data:', e.response.data);
      } else {
        console.error('Error message:', e.message);
      }
      throw e;
    }
  }

  async signup(email: string, password: string, name: string) {

    const users = await this.usersService.find(email);
    if (users.length) {
      throw new BadRequestException('email in use');
    }


    const salt = randomBytes(8).toString('hex');
    const hash = (await scrypt(password, salt, 32)) as Buffer;
    const result = `${salt}.${hash.toString('hex')}`;


    const user = await this.usersService.create(email, result, name);


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

    const [user] = await this.usersService.find(email);
    if (!user) {
      throw new NotFoundException('user not found');
    }


    const [salt, storedHash] = user.password.split('.');
    const hash = (await scrypt(password, salt, 32)) as Buffer;
    if (storedHash !== hash.toString('hex')) {
      throw new BadRequestException('bad password');
    }


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

  // access 토큰 갱신하면서 refresh 토큰도 재발급 (보안 강화 목적)
  async rotateRefreshToken(refreshToken: string) {

    const payload = await this.tokenService.validateRefreshToken(refreshToken);
    if (!payload) {
      throw new UnauthorizedException('invalid or expired refresh token');
    }


    const user = await this.usersService.findOne(payload.sub);
    if (!user) throw new NotFoundException('user not found');

    // 강제로그아웃, 혹은 모든기기에서 로그아웃 할 경우 유저 tokenVersion 증가된 상태
    // 예전 버전의 refresh token 으로 갱신하려고 하면 거부당함
    if (user.tokenVersion !== payload.v) {
      throw new UnauthorizedException('token version mismatch');
    }

    // 특정 유저의 refresh token 식별 jwt payload 의 jti(=jwt id) 값
    await this.tokenService.invalidateRefreshToken(user.id, payload.jti);


    const accessToken = await this.tokenService.generateAccessToken({
      id: user.id,
      tokenVersion: user.tokenVersion,
    });
    const newRefreshToken = await this.tokenService.generateRefreshToken({
      id: user.id,
      tokenVersion: user.tokenVersion,
    });

    return { accessToken, refreshToken: newRefreshToken };
  }

  async logout(refreshToken: string) {
    const payload = await this.tokenService.validateRefreshToken(refreshToken);
    if (!payload) {
      throw new UnauthorizedException('invalid or expired refresh token');
    }
    await this.tokenService.invalidateRefreshToken(payload.sub, payload.jti);
    return { ok: true };
  }

  async logoutAll(userId: number) {

    await this.tokenService.invalidateAllUserTokens(userId);

    // tokenVersion 올리기 (기존 토큰 무효화)
    await this.usersService.incrementTokenVersion(userId);

    return { ok: true };
  }
}
