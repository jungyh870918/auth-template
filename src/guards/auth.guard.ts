import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
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

    if (!token) throw new UnauthorizedException('Missing Bearer token');

    try {
      const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET) as any;
      req.user = { id: payload.sub };
      return true;
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
