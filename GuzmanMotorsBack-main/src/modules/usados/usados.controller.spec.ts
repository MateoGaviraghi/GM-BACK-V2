import { Test, TestingModule } from '@nestjs/testing';
import { UsadosController } from './usados.controller';

describe('UsadosController', () => {
  let controller: UsadosController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsadosController],
    }).compile();

    controller = module.get<UsadosController>(UsadosController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
