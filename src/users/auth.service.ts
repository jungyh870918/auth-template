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
    private tokenService: TokenService, // ✅ 주입
    private configService: ConfigService,
  ) {}

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
      if (client_secret) body.append('client_secret', client_secret);

      const tokenRes = await axios.post(
        'https://kauth.kakao.com/oauth/token',
        body,
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
      );
      console.log('tokenRes.data:', tokenRes.data);

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

  async rotateRefreshToken(refreshToken: string) {
    // 1) refresh 검증 + 서버 상태 확인
    const payload = await this.tokenService.validateRefreshToken(refreshToken);
    if (!payload) {
      throw new UnauthorizedException('invalid or expired refresh token');
    }

    // 2) 유저/토큰버전 확인 (DB 기준으로 보안 강화)
    const user = await this.usersService.findOne(payload.sub);
    if (!user) throw new NotFoundException('user not found');
    if (user.tokenVersion !== payload.v) {
      throw new UnauthorizedException('token version mismatch');
    }

    // 3) 이전 refresh 폐기 (jti)
    await this.tokenService.invalidateRefreshToken(user.id, payload.jti);

    // 4) 새 access / 새 refresh 발급
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
    // 1) Redis의 모든 refresh 키 삭제
    await this.tokenService.invalidateAllUserTokens(userId);

    // 2) (권장) tokenVersion 증가 -> 남아있는 access token 즉시 무효화
    //    access token payload에 v(=tokenVersion)가 들어가 있으므로
    //    이후의 검증 로직에서 불일치로 거부됨
    await this.usersService.incrementTokenVersion(userId);

    return { ok: true };
  }
}
