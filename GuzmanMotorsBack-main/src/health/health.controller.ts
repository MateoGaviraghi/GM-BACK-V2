import { Controller, Get } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import type { Connection } from 'mongoose';

@Controller('health')
export class HealthController {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  @Get()
  getHealth() {
    const dbUp = Number(this.connection?.readyState) === 1;
    return {
      status: 'ok',
      db: dbUp ? 'up' : 'down',
    };
  }
}
