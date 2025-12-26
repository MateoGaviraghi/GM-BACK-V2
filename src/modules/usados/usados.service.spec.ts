import { Test, TestingModule } from '@nestjs/testing';
import { UsadosService } from './usados.service';

describe('UsadosService', () => {
  let service: UsadosService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UsadosService],
    }).compile();

    service = module.get<UsadosService>(UsadosService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
