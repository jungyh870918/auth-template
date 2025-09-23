// auth guard 에서 심은 req.user.id를 바탕으로 실제 user 엔티티를 찾아 req.currentUser에 심어주는 인터셉터

import {
  Injectable, NestInterceptor, ExecutionContext, CallHandler,
} from '@nestjs/common';
import { UsersService } from '../users.service';

@Injectable()
export class CurrentUserInterceptor implements NestInterceptor {
  constructor(private readonly usersService: UsersService) { }

  async intercept(context: ExecutionContext, next: CallHandler) {
    const req = context.switchToHttp().getRequest();
    const userId: number | undefined = req.user?.id;
    if (userId) {
      const user = await this.usersService.findOne(userId);
      req.currentUser = user ?? null;
    }

    return next.handle();
  }
}
