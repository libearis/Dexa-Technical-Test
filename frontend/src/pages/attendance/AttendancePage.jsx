import { useEffect, useState } from 'react';
import { attendanceApi } from '../../api/attendanceApi';
import { Toast } from '../../components/Toast';
import './AttendancePage.css';

const CLOSING_HOUR = 17;

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

// Best-effort GPS read for the attendance audit trail — never blocks the
// check-in/out flow. Resolves to null on missing support, denied permission,
// or timeout instead of rejecting.
function getLocation() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ lat: position.coords.latitude, lng: position.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 60_000 },
    );
  });
}

function formatDuration(ms) {
  const totalSeconds = Number.isFinite(ms) ? Math.max(0, Math.floor(ms / 1000)) : 0;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':');
}

function formatDurationWords(ms) {
  const totalSeconds = Number.isFinite(ms) ? Math.max(0, Math.floor(ms / 1000)) : 0;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours} jam ${minutes} menit ${seconds} detik`;
}

function CameraIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 8a2 2 0 0 1 2-2h1.5l1.2-1.6A2 2 0 0 1 10.3 3.6h3.4a2 2 0 0 1 1.6.8L16.5 6H18a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8Z" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="5 13 10 18 19 7" />
    </svg>
  );
}

function DoorIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 21H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="15 16 20 12 15 8" />
      <line x1="20" y1="12" x2="9" y2="12" />
    </svg>
  );
}

export function AttendancePage() {
  const [todayRecord, setTodayRecord] = useState(null);
  const [photo, setPhoto] = useState(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState(null);
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

  // Ticks every second so the closing-hour gate and the live "checked in for..."
  // timer both stay accurate without a page reload.
  useEffect(() => {
    const interval = setInterval(() => forceTick((t) => t + 1), 1_000);
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

  const handlePhotoChange = (event) => {
    const file = event.target.files?.[0] ?? null;
    setPhoto(file);
    setPhotoPreviewUrl(file ? URL.createObjectURL(file) : null);
  };

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
      const location = await getLocation();
      const formData = new FormData();
      formData.append('photo', photo);
      if (location) {
        formData.append('lat', String(location.lat));
        formData.append('lng', String(location.lng));
      }
      await attendanceApi.post(`/attendances/${mode}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setToast({
        message: mode === 'check-in' ? 'Check-in berhasil' : 'Check-out berhasil',
        variant: 'success',
      });
      setPhoto(null);
      setPhotoPreviewUrl(null);
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

  // "Sudah check-in selama" freezes at the 17:00 mark — past closing hour it
  // stops being a live clock and any extra time is tracked as overtime instead.
  let regularElapsedMs = 0;
  let overtimeMs = 0;
  if (todayRecord) {
    const checkInDate = new Date(todayRecord.checkInTime);
    const closingTime = new Date(
      checkInDate.getFullYear(),
      checkInDate.getMonth(),
      checkInDate.getDate(),
      CLOSING_HOUR,
      0,
      0,
      0,
    ).getTime();
    const now = Date.now();
    regularElapsedMs = Math.min(now, closingTime) - checkInDate.getTime();
    overtimeMs = Math.max(0, now - closingTime);
  }
  const totalWorkedMs = todayRecord?.checkOutTime
    ? new Date(todayRecord.checkOutTime).getTime() - new Date(todayRecord.checkInTime).getTime()
    : 0;

  const buttonLabel = { 'check-in': 'Check-in', 'check-out': 'Check-out', done: 'Sudah check-out hari ini' }[
    mode
  ];
  const buttonDisabled = loading || mode === 'done' || (mode === 'check-out' && !isAfterClosingHour);

  const circleVariant =
    mode === 'done' ? 'done' : mode === 'check-out' && !isAfterClosingHour ? 'success' : 'action';
  const CircleIcon =
    mode === 'check-in' ? CameraIcon : mode === 'check-out' && isAfterClosingHour ? DoorIcon : CheckIcon;

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
        {mode !== 'done' ? (
          <label className={`attendance-circle attendance-circle--${circleVariant}`}>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              aria-label={mode === 'check-in' ? 'Foto check-in' : 'Foto check-out'}
              className="sr-only"
              onChange={handlePhotoChange}
            />
            {photoPreviewUrl ? (
              <img src={photoPreviewUrl} alt="Pratinjau foto" className="attendance-circle-preview" />
            ) : (
              <CircleIcon />
            )}
          </label>
        ) : (
          <div className={`attendance-circle attendance-circle--${circleVariant}`}>
            <CircleIcon />
          </div>
        )}

        <h2>{mode === 'check-in' ? 'Check-in' : mode === 'check-out' ? 'Check-out' : 'Selesai'}</h2>
        <p className="attendance-status">
          {mode === 'check-in' && 'Anda belum check-in hari ini.'}
          {mode === 'check-out' &&
            !isAfterClosingHour &&
            'Anda sudah check-in. Check-out akan aktif setelah pukul 17:00.'}
          {mode === 'check-out' && isAfterClosingHour && 'Saatnya check-out. Jangan lupa ambil foto sebelum pulang.'}
          {mode === 'done' && 'Absensi hari ini sudah lengkap. Sampai jumpa besok!'}
        </p>

        {mode === 'check-out' && (
          <div className="attendance-timer">
            <span className="attendance-timer-label">Sudah check-in selama</span>
            <span className="attendance-timer-value">{formatDuration(regularElapsedMs)}</span>
          </div>
        )}

        {mode === 'check-out' && isAfterClosingHour && (
          <p className="attendance-overtime">Jam lembur: {formatDurationWords(overtimeMs)}</p>
        )}

        {mode === 'done' && (
          <div className="attendance-timer attendance-timer--summary">
            <span className="attendance-timer-label">Total durasi kerja</span>
            <span className="attendance-timer-value">{formatDuration(totalWorkedMs)}</span>
          </div>
        )}

        {mode !== 'done' && (
          <p className="attendance-photo-hint">
            {photo
              ? `Foto ${mode === 'check-in' ? 'check-in' : 'check-out'} siap ✓`
              : `Klik ikon di atas untuk ambil foto ${mode === 'check-in' ? 'check-in' : 'check-out'}`}
          </p>
        )}
        <button disabled={buttonDisabled} onClick={handleSubmit}>
          {buttonLabel}
        </button>
      </div>
    </div>
  );
}
