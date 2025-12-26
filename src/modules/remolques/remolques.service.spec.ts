import { Test, TestingModule } from '@nestjs/testing';
import { RemolquesService } from './remolques.service';

describe('RemolquesService', () => {
  let service: RemolquesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RemolquesService],
    }).compile();

    service = module.get<RemolquesService>(RemolquesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
