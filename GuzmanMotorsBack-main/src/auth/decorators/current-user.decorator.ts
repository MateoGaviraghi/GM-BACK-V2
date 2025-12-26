import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { RequestWithUser } from '../types/authenticated-user.type';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();
    return request.user;
  },
);
