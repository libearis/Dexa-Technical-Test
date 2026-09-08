import { Test, TestingModule } from '@nestjs/testing';
import { AttendancesController } from './attendances.controller';
import { AttendancesService } from './attendances.service';
import { AttendanceFilterDto } from './dto/attendance-filter.dto';

describe('AttendancesController', () => {
  let controller: AttendancesController;
  let attendancesService: jest.Mocked<AttendancesService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AttendancesController],
      providers: [
        {
          provide: AttendancesService,
          useValue: {
            findAll: jest.fn(),
            findOne: jest.fn(),
            getDashboardSummary: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get(AttendancesController);
    attendancesService = module.get(AttendancesService);
  });

  it('findAll delegates to the service with the parsed filter', async () => {
    const filter: AttendanceFilterDto = { status: 'PRESENT' };
    await controller.findAll(filter);
    expect(attendancesService.findAll).toHaveBeenCalledWith(filter);
  });

  it('getDashboardSummary delegates to the service', async () => {
    await controller.getDashboardSummary();
    expect(attendancesService.getDashboardSummary).toHaveBeenCalled();
  });

  it('findOne delegates to the service', async () => {
    await controller.findOne(12);
    expect(attendancesService.findOne).toHaveBeenCalledWith(12);
  });
});
