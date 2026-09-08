import { useEffect, useState } from 'react';
import { attendanceApi } from '../../api/attendanceApi';
import { PhotoCaptureInput } from '../../components/PhotoCaptureInput';
import { Toast } from '../../components/Toast';
import './AttendancePage.css';

const CLOSING_HOUR = 17;

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function AttendancePage() {
  const [todayRecord, setTodayRecord] = useState(null);
  const [photo, setPhoto] = useState(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null); // { message, variant, duration }
  const [, forceTick] = useState(0);

  const loadToday = async () => {
    const { data } = await attendanceApi.get('/attendances/history');
    setTodayRecord(data.find((record) => record.attendanceDate === todayIso()) ?? null);
  };

  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect -- fetching from the API on mount, not deriving state
    loadToday();
  }, []);

  // Re-evaluate "is it past 17:00 yet" periodically so the check-out button
  // enables itself once the clock passes, without needing a page reload.
  useEffect(() => {
    const interval = setInterval(() => forceTick((t) => t + 1), 30_000);
    return () => clearInterval(interval);
  }, []);

  const isAfterClosingHour = new Date().getHours() >= CLOSING_HOUR;
  const mode = !todayRecord ? 'check-in' : !todayRecord.checkOutTime ? 'check-out' : 'done';

  useEffect(() => {
    if (mode === 'check-out' && !isAfterClosingHour) {
      setToast({
        message: `Check-out baru bisa dilakukan setelah pukul ${CLOSING_HOUR}:00`,
        variant: 'info',
        duration: null,
      });
    } else {
      setToast((current) => (current?.variant === 'info' ? null : current));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, isAfterClosingHour]);

  const handleSubmit = async () => {
    if (!photo) {
      setToast({ message: 'Silakan ambil foto terlebih dahulu', variant: 'error' });
      return;
    }
    if (mode === 'check-out' && !isAfterClosingHour) {
      setToast({
        message: `Check-out baru bisa dilakukan setelah pukul ${CLOSING_HOUR}:00`,
        variant: 'info',
        duration: null,
      });
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('photo', photo);
      await attendanceApi.post(`/attendances/${mode}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setToast({
        message: mode === 'check-in' ? 'Check-in berhasil' : 'Check-out berhasil',
        variant: 'success',
      });
      setPhoto(null);
      await loadToday();
    } catch (err) {
      setToast({
        message: err.response?.data?.message || 'Terjadi kesalahan',
        variant: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const buttonLabel = { 'check-in': 'Check-in', 'check-out': 'Check-out', done: 'Sudah check-out hari ini' }[
    mode
  ];
  const buttonDisabled = loading || mode === 'done' || (mode === 'check-out' && !isAfterClosingHour);

  return (
    <div className="attendance-page">
      <Toast
        message={toast?.message}
        variant={toast?.variant}
        duration={toast?.duration}
        onDismiss={() => setToast(null)}
      />

      <h1>Absensi</h1>
      <div className="attendance-card">
        <h2>{mode === 'check-in' ? 'Check-in' : 'Check-out'}</h2>
        <p className="attendance-status">
          {mode === 'check-in' && 'Anda belum check-in hari ini.'}
          {mode === 'check-out' && 'Anda sudah check-in, silakan check-out setelah pukul 17:00.'}
          {mode === 'done' && 'Absensi hari ini sudah lengkap.'}
        </p>
        {mode !== 'done' && (
          <PhotoCaptureInput
            label={mode === 'check-in' ? 'Foto check-in' : 'Foto check-out'}
            onChange={setPhoto}
          />
        )}
        <button disabled={buttonDisabled} onClick={handleSubmit}>
          {buttonLabel}
        </button>
      </div>
    </div>
  );
}
