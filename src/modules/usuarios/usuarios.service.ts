import {
  Injectable,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { Usuario, UsuarioDocument } from './entities/usuario.entity';
import { AuthService } from '../../auth/auth.service';

@Injectable()
export class UsuariosService {
  constructor(
    @InjectModel(Usuario.name)
    private readonly userModel: Model<UsuarioDocument>,
    private readonly authService: AuthService,
  ) {}

  async create(createUsuarioDto: CreateUsuarioDto) {
    const email = createUsuarioDto.email?.trim().toLowerCase();
    if (!email || !createUsuarioDto.password) {
      throw new ConflictException('Email y password son requeridos');
    }
    const exists = await this.userModel.exists({ email });
    if (exists) throw new ConflictException('Email ya registrado');
    const passwordHash = await this.authService.hashPassword(
      createUsuarioDto.password,
    );
    const doc = await this.userModel.create({
      email,
      passwordHash,
      nombre: createUsuarioDto.nombre ?? undefined,
      role: createUsuarioDto.role ?? 'user',
    });
    return {
      id: String(doc._id),
      email: doc.email,
      nombre: doc.nombre,
      role: doc.role,
    };
  }

  findAll() {
    return this.userModel.find().select('-passwordHash').lean().exec();
  }

  async findOne(id: string) {
    const doc = await this.userModel
      .findById(id)
      .select('-passwordHash')
      .lean()
      .exec();
    if (!doc) throw new NotFoundException('Usuario no encontrado');
    return doc;
  }

  async update(id: string, updateUsuarioDto: UpdateUsuarioDto) {
    const update: Partial<Usuario> = {};
    if (updateUsuarioDto.email)
      update.email = updateUsuarioDto.email.trim().toLowerCase();
    if (updateUsuarioDto.nombre) update.nombre = updateUsuarioDto.nombre;
    if (updateUsuarioDto.role) update.role = updateUsuarioDto.role;
    const doc = await this.userModel
      .findByIdAndUpdate(id, update, { new: true })
      .select('-passwordHash')
      .lean()
      .exec();
    if (!doc) throw new NotFoundException('Usuario no encontrado');
    return doc;
  }

  async remove(id: string) {
    const res = await this.userModel.findByIdAndDelete(id).exec();
    if (!res) throw new NotFoundException('Usuario no encontrado');
    return { ok: true };
  }

  findByEmail(email: string) {
    return this.userModel.findOne({ email: email.toLowerCase().trim() }).exec();
  }

  async login(email: string, password: string) {
    const user = await this.findByEmail(email);
    if (!user) throw new UnauthorizedException('Credenciales inválidas');
    const ok = await this.authService.comparePassword(
      password,
      user.passwordHash,
    );
    if (!ok) throw new UnauthorizedException('Credenciales inválidas');
    const token = this.authService.signToken({
      id: String(user._id),
      email: user.email,
      role: user.role,
    });
    return {
      token,
      user: {
        id: String(user._id),
        email: user.email,
        nombre: user.nombre,
        role: user.role,
      },
    };
  }
}
