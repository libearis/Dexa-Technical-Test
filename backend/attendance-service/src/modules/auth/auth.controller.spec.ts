import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: { login: jest.fn() } }],
    }).compile();

    controller = module.get(AuthController);
    authService = module.get(AuthService);
  });

  describe('login', () => {
    it('delegates to AuthService.login with the request body', async () => {
      const dto = { username: 'bob', password: 'secret' };
      authService.login.mockResolvedValue({ accessToken: 'token' } as any);

      const result = await controller.login(dto);

      expect(authService.login).toHaveBeenCalledWith(dto);
      expect(result).toEqual({ accessToken: 'token' });
    });
  });
});
