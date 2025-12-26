import { Test, TestingModule } from '@nestjs/testing';
import { Vehiculos0kmController } from './vehiculos0km.controller';
import { Vehiculos0kmService } from './vehiculos0km.service';

describe('Vehiculos0kmController', () => {
  let controller: Vehiculos0kmController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [Vehiculos0kmController],
      providers: [Vehiculos0kmService],
    }).compile();

    controller = module.get<Vehiculos0kmController>(Vehiculos0kmController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
