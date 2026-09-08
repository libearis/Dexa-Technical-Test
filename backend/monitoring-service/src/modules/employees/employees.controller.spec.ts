import { Test, TestingModule } from '@nestjs/testing';
import { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { EmployeesController } from './employees.controller';
import { EmployeesService } from './employees.service';

describe('EmployeesController', () => {
  let controller: EmployeesController;
  let employeesService: jest.Mocked<EmployeesService>;

  const actor: CurrentUserPayload = {
    employeeId: 1,
    username: 'hrd.admin',
    role: 'HRD_ADMIN',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EmployeesController],
      providers: [
        {
          provide: EmployeesService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            deactivate: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get(EmployeesController);
    employeesService = module.get(EmployeesService);
  });

  it('create delegates to the service with the acting HRD admin id', async () => {
    const dto = { name: 'A' } as any;
    await controller.create(dto, actor);
    expect(employeesService.create).toHaveBeenCalledWith(dto, 1);
  });

  it('findAll converts the departmentId query param to a number', async () => {
    await controller.findAll('3', 'ACTIVE');
    expect(employeesService.findAll).toHaveBeenCalledWith({
      departmentId: 3,
      status: 'ACTIVE',
    });
  });

  it('findAll passes undefined filters through untouched when omitted', async () => {
    await controller.findAll();
    expect(employeesService.findAll).toHaveBeenCalledWith({
      departmentId: undefined,
      status: undefined,
    });
  });

  it('findOne delegates to the service', async () => {
    await controller.findOne(5);
    expect(employeesService.findOne).toHaveBeenCalledWith(5);
  });

  it('update delegates to the service with the acting HRD admin id', async () => {
    const dto = { name: 'B' } as any;
    await controller.update(5, dto, actor);
    expect(employeesService.update).toHaveBeenCalledWith(5, dto, 1);
  });

  it('deactivate delegates to the service with the acting HRD admin id', async () => {
    await controller.deactivate(5, actor);
    expect(employeesService.deactivate).toHaveBeenCalledWith(5, 1);
  });
});
