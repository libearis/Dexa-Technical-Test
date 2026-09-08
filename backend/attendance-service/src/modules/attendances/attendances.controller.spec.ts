import { Test, TestingModule } from '@nestjs/testing';
import { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { AttendancesController } from './attendances.controller';
import { AttendancesService } from './attendances.service';

describe('AttendancesController', () => {
  let controller: AttendancesController;
  let attendancesService: jest.Mocked<AttendancesService>;

  const user: CurrentUserPayload = {
    employeeId: 7,
    username: 'bob',
    role: 'EMPLOYEE',
  };
  const photo = { originalname: 'photo.jpg' } as Express.Multer.File;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AttendancesController],
      providers: [
        {
          provide: AttendancesService,
          useValue: {
            checkIn: jest.fn(),
            checkOut: jest.fn(),
            getHistory: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get(AttendancesController);
    attendancesService = module.get(AttendancesService);
  });

  it('checkIn delegates to the service with the current employee id and the uploaded photo', async () => {
    await controller.checkIn(user, photo);
    expect(attendancesService.checkIn).toHaveBeenCalledWith(7, photo);
  });

  it('checkOut delegates to the service with the current employee id and the uploaded photo', async () => {
    await controller.checkOut(user, photo);
    expect(attendancesService.checkOut).toHaveBeenCalledWith(7, photo);
  });

  it('getHistory delegates to the service with the current employee id and the date filter', async () => {
    await controller.getHistory(user, '2026-01-01', '2026-01-31');
    expect(attendancesService.getHistory).toHaveBeenCalledWith(7, {
      from: '2026-01-01',
      to: '2026-01-31',
    });
  });
});
