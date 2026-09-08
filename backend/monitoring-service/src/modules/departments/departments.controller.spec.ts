import { Test, TestingModule } from '@nestjs/testing';
import { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { DepartmentsController } from './departments.controller';
import { DepartmentsService } from './departments.service';

describe('DepartmentsController', () => {
  let controller: DepartmentsController;
  let departmentsService: jest.Mocked<DepartmentsService>;

  const actor: CurrentUserPayload = {
    employeeId: 1,
    username: 'hrd.admin',
    role: 'HRD_ADMIN',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DepartmentsController],
      providers: [
        {
          provide: DepartmentsService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get(DepartmentsController);
    departmentsService = module.get(DepartmentsService);
  });

  it('create delegates to the service with the acting HRD admin id', async () => {
    const dto = { name: 'HRD' };
    await controller.create(dto, actor);
    expect(departmentsService.create).toHaveBeenCalledWith(dto, 1);
  });

  it('findAll delegates to the service', async () => {
    await controller.findAll();
    expect(departmentsService.findAll).toHaveBeenCalled();
  });

  it('findOne delegates to the service', async () => {
    await controller.findOne(3);
    expect(departmentsService.findOne).toHaveBeenCalledWith(3);
  });

  it('update delegates to the service with the acting HRD admin id', async () => {
    const dto = { name: 'HRD Team' };
    await controller.update(3, dto, actor);
    expect(departmentsService.update).toHaveBeenCalledWith(3, dto, 1);
  });

  it('remove delegates to the service with the acting HRD admin id', async () => {
    await controller.remove(3, actor);
    expect(departmentsService.remove).toHaveBeenCalledWith(3, 1);
  });
});
