import { Test, TestingModule } from '@nestjs/testing';
import { Vehiculos0kmService } from './vehiculos0km.service';

describe('Vehiculos0kmService', () => {
  let service: Vehiculos0kmService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [Vehiculos0kmService],
    }).compile();

    service = module.get<Vehiculos0kmService>(Vehiculos0kmService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
