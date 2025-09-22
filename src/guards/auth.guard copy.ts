// src/guards/auth.guard.ts
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { UsersService } from '../users/users.service'; // 주입 필요
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly users: UsersService,
    private readonly config: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    const auth = req.headers['authorization'] || '';
    const token =
      typeof auth === 'string' && auth.startsWith('Bearer ')
        ? auth.slice(7)
        : null;

    if (!token) throw new UnauthorizedException('Missing Bearer token');

    let payload: any;
    try {
      payload = jwt.verify(token, this.config.get<string>('JWT_ACCESS_SECRET'));
    } catch {
      throw new UnauthorizedException('Invalid token');
    }

    // typ 검사 (access 토큰만 통과)
    if (payload.typ !== 'access') {
      throw new UnauthorizedException('Invalid token type');
    }

    const user = await this.users.findOne(payload.sub);
    if (!user) throw new UnauthorizedException('User not found');

    // 🔐 토큰 버전 검증 — 여기서 바로 과거 토큰 차단
    if (payload.v !== user.tokenVersion) {
      throw new UnauthorizedException('Token version mismatch');
    }

    req.user = { id: user.id };
    return true;
  }
}
