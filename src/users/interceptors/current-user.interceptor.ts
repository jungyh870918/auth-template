// src/users/interceptors/current-user.interceptor.ts
import {
  Injectable, NestInterceptor, ExecutionContext, CallHandler,
} from '@nestjs/common';
import { UsersService } from '../users.service';

@Injectable()
export class CurrentUserInterceptor implements NestInterceptor {
  constructor(private readonly usersService: UsersService) { }

  async intercept(context: ExecutionContext, next: CallHandler) {
    const req = context.switchToHttp().getRequest();
    const userId: number | undefined = req.user?.id; // ✅ 올바른 추출
    console.log('CurrentUser Interceptor - req.user:', req.user);
    // 가드가 안 붙은 라우트(= 비인증)에서는 req.user가 없으니 그냥 스킵
    if (userId) {
      const user = await this.usersService.findOne(userId);
      req.currentUser = user ?? null;
    }

    return next.handle();
  }
}
