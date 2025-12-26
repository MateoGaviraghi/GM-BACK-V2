import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { UsuariosService } from './usuarios.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { OwnershipGuard } from '../../auth/guards/ownership.guard';
import { Roles } from '../../auth/decorators/roles.decorator';

@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  // Registro (público) - Rate limit estricto
  @Throttle({ short: { limit: 3, ttl: 60000 } }) // 3 intentos por minuto
  @Post()
  create(@Body() createUsuarioDto: CreateUsuarioDto) {
    return this.usuariosService.create(createUsuarioDto);
  }

  // Login (público) - Rate limit estricto para prevenir brute force
  @Throttle({ short: { limit: 5, ttl: 60000 } }) // 5 intentos por minuto
  @Post('login')
  async login(@Body() body: { email: string; password: string }): Promise<{
    token: string;
    user: {
      id: string;
      email: string;
      nombre?: string;
      role: 'user' | 'admin';
    };
  }> {
    const result = await this.usuariosService.login(body.email, body.password);
    return result;
  }

  // Solo admins pueden ver todos los usuarios
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get()
  findAll() {
    return this.usuariosService.findAll();
  }

  // Admins pueden ver cualquier usuario, users solo pueden verse a sí mismos
  @UseGuards(JwtAuthGuard, OwnershipGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usuariosService.findOne(id);
  }

  // Admins pueden editar cualquier usuario, users solo pueden editarse a sí mismos
  @UseGuards(JwtAuthGuard, OwnershipGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUsuarioDto: UpdateUsuarioDto) {
    return this.usuariosService.update(id, updateUsuarioDto);
  }

  // Solo admins pueden eliminar usuarios
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usuariosService.remove(id);
  }
}
