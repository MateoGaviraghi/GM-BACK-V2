import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/ (GET)', () => {
    // supertest expects a Node http.Server or similar; app.getHttpServer() is compatible
    return request(app.getHttpServer() as unknown as import('http').Server)
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });
});
