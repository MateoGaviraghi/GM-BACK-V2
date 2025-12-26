import { PartialType } from '@nestjs/mapped-types';
import { CreateVehiculos0kmDto } from './create-vehiculos0km.dto';

export class UpdateVehiculos0kmDto extends PartialType(CreateVehiculos0kmDto) {}
