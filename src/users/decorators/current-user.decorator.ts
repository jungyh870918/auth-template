import { createParamDecorator, ExecutionContext } from '@nestjs/common';

// @CurrentUser() 데코레이터를 사용하면 req.currentUser 에 접근 가능
export const CurrentUser = createParamDecorator(
  (data: never, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest();
    console.log('CurrentUser Decorator:', request.currentUser);
    return request.currentUser;
  },
);
