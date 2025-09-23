// jwt 토큰 유효성 검사
// Bearer 토큰이 없거나 유효하지 않으면 401 에러 발생
// 유효한 토큰이면 req.user에 사용자 정보 추가

// 강제 로그아웃, 전체기기 로그아웃일 경우 access 토큰에서도 버전 검사 필요, 이 로직이 추가되어야 함
// 지금은 access 토큰의 짧은 지속시간에만 기대는 상황 (보안상 치명적일 수 있음)

import {
  CanActivate,
  ExecutionContext,
  Injectable,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const auth = req.headers['authorization'] || '';
    const token =
      typeof auth === 'string' && auth.startsWith('Bearer ')
        ? auth.slice(7)
        : null;

    // 토큰이 아예 없는 경우
    if (!token) {
      throw new HttpException(
        {
          code: 'AUTH_INVALID_CREDENTIALS',
          message: '토큰이 존재하지 않습니다 (Missing Bearer token)',
        },
        HttpStatus.UNAUTHORIZED, // 401
      );
    }

    try {
      const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET) as any;
      req.user = { id: payload.sub };
      return true;
    } catch (err: any) {
      // jwt.verify 실패: 기간 만료 or 위조된 토큰
      if (err.name === 'TokenExpiredError') {
        throw new HttpException(
          {
            code: 'AUTH_TOKEN_EXPIRED',
            message: 'AccessToken 만료',
          },
          HttpStatus.UNAUTHORIZED,
        );
      }

      throw new HttpException(
        {
          code: 'AUTH_INVALID_CREDENTIALS',
          message: '유효하지 않은 토큰',
        },
        HttpStatus.UNAUTHORIZED,
      );
    }
  }
}
