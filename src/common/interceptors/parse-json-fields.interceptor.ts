import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  BadRequestException,
} from '@nestjs/common';
import { Observable } from 'rxjs';

/**
 * Interceptor para parsear campos JSON que vienen como strings en FormData
 * Esto es necesario porque cuando se envía JSON dentro de FormData,
 * los arrays y objetos complejos vienen como strings y deben ser parseados
 * ANTES de que NestJS valide el DTO.
 */
@Injectable()
export class ParseJsonFieldsInterceptor implements NestInterceptor {
  constructor(private readonly fields: string[] = []) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const request = context.switchToHttp().getRequest();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const body = request.body;

    if (!body || typeof body !== 'object') {
      return next.handle();
    }

    // Parsear cada campo especificado
    for (const field of this.fields) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (field in body && typeof body[field] === 'string') {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        const fieldValue: string = body[field];

        // Si es string vacío, establecer como array vacío
        if (fieldValue.trim() === '') {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          body[field] = [];
          continue;
        }

        // Intentar parsear el JSON
        try {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
          body[field] = JSON.parse(fieldValue);
        } catch {
          throw new BadRequestException(
            `El campo '${field}' tiene un formato JSON inválido`,
          );
        }
      }
    }

    return next.handle();
  }
}
