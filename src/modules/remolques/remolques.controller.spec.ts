import { Test, TestingModule } from '@nestjs/testing';
import { RemolquesController } from './remolques.controller';

describe('RemolquesController', () => {
  let controller: RemolquesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RemolquesController],
    }).compile();

    controller = module.get<RemolquesController>(RemolquesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
