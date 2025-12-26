import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { RequestWithUser } from '../types/authenticated-user.type';

/**
 * Guard que valida si el usuario tiene permiso para acceder al recurso.
 * Los admins siempre tienen acceso.
 * Los usuarios normales solo tienen acceso si el ID del recurso coincide con su userId.
 */
@Injectable()
export class OwnershipGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const { user } = request;

    // Los admins siempre tienen acceso
    if (user.role === 'admin') {
      return true;
    }

    // Obtener el ID del recurso desde los parámetros de la ruta
    const resourceId = request.params['id'] as string | undefined;

    // Si no hay ID en los parámetros, denegar acceso
    if (!resourceId) {
      throw new ForbiddenException(
        'No se puede validar ownership sin ID de recurso',
      );
    }

    // Validar que el usuario solo acceda a sus propios recursos
    if (resourceId !== user.userId) {
      throw new ForbiddenException(
        'No tienes permiso para acceder a este recurso',
      );
    }

    return true;
  }
}
