import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { attendanceApi } from '../../api/attendanceApi';
import { AttendancePage } from './AttendancePage';

vi.mock('../../api/attendanceApi', () => ({
  ATTENDANCE_BASE_URL: 'http://localhost:3001',
  attendanceApi: { get: vi.fn(), post: vi.fn() },
}));

beforeEach(() => {
  vi.clearAllMocks();
  global.URL.createObjectURL = vi.fn(() => 'blob:preview-url');
});

afterEach(() => {
  vi.useRealTimers();
});

const uploadPhoto = async (user, label) => {
  const file = new File(['bytes'], 'photo.jpg', { type: 'image/jpeg' });
  await user.upload(screen.getByLabelText(label), file);
};

describe('AttendancePage', () => {
  it('shows check-in mode when there is no record for today', async () => {
    attendanceApi.get.mockResolvedValue({ data: [] });
    render(<AttendancePage />);

    expect(await screen.findByRole('button', { name: 'Check-in' })).toBeEnabled();
  });

  it('rejects submitting without a photo', async () => {
    const user = userEvent.setup();
    attendanceApi.get.mockResolvedValue({ data: [] });
    render(<AttendancePage />);

    await user.click(await screen.findByRole('button', { name: 'Check-in' }));

    expect(await screen.findByText('Silakan ambil foto terlebih dahulu')).toBeInTheDocument();
    expect(attendanceApi.post).not.toHaveBeenCalled();
  });

  it('submits a check-in with the selected photo', async () => {
    const user = userEvent.setup();
    attendanceApi.get.mockResolvedValue({ data: [] });
    attendanceApi.post.mockResolvedValue({ data: {} });
    render(<AttendancePage />);

    await uploadPhoto(user, 'Foto check-in');
    await user.click(await screen.findByRole('button', { name: 'Check-in' }));

    await waitFor(() => expect(attendanceApi.post).toHaveBeenCalledWith(
      '/attendances/check-in',
      expect.any(FormData),
      expect.objectContaining({ headers: { 'Content-Type': 'multipart/form-data' } }),
    ));
    expect(await screen.findByText('Check-in berhasil')).toBeInTheDocument();
  });

  it('disables check-out and shows an info toast before 17:00', async () => {
    vi.useFakeTimers({ toFake: ['Date'] }).setSystemTime(new Date('2026-01-01T10:00:00'));
    attendanceApi.get.mockResolvedValue({
      data: [{ id: 1, attendanceDate: '2026-01-01', checkOutTime: null }],
    });
    render(<AttendancePage />);

    expect(await screen.findByRole('button', { name: 'Check-out' })).toBeDisabled();
    expect(
      await screen.findByText('Check-out baru bisa dilakukan setelah pukul 17:00'),
    ).toBeInTheDocument();
  });

  it('allows check-out after 17:00', async () => {
    vi.useFakeTimers({ toFake: ['Date'] }).setSystemTime(new Date('2026-01-01T18:00:00'));
    attendanceApi.get.mockResolvedValue({
      data: [{ id: 1, attendanceDate: '2026-01-01', checkOutTime: null }],
    });
    attendanceApi.post.mockResolvedValue({ data: {} });
    const user = userEvent.setup();
    render(<AttendancePage />);

    expect(await screen.findByRole('button', { name: 'Check-out' })).toBeEnabled();

    await uploadPhoto(user, 'Foto check-out');
    await user.click(screen.getByRole('button', { name: 'Check-out' }));

    await waitFor(() =>
      expect(attendanceApi.post).toHaveBeenCalledWith(
        '/attendances/check-out',
        expect.any(FormData),
        expect.anything(),
      ),
    );
  });

  it('shows a disabled done state once check-out is complete', async () => {
    attendanceApi.get.mockResolvedValue({
      data: [
        {
          id: 1,
          attendanceDate: new Date().toISOString().slice(0, 10),
          checkOutTime: '2026-01-01T18:00:00Z',
        },
      ],
    });
    render(<AttendancePage />);

    expect(
      await screen.findByRole('button', { name: 'Sudah check-out hari ini' }),
    ).toBeDisabled();
  });
});
