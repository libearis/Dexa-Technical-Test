import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { monitoringApi } from '../../api/monitoringApi';
import { ErrorState } from '../../components/ErrorState';
import './HrdDashboardPage.css';

const ID_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function formatIndonesianDate(isoDate) {
  const [year, month, day] = isoDate.split('-').map(Number);
  return `${String(day).padStart(2, '0')}-${ID_MONTHS[month - 1]}-${year}`;
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3.5" y="4.5" width="17" height="16" rx="2.5" />
      <line x1="3.5" y1="9.5" x2="20.5" y2="9.5" />
      <line x1="8" y1="2.5" x2="8" y2="6.5" />
      <line x1="16" y1="2.5" x2="16" y2="6.5" />
    </svg>
  );
}

export function HrdDashboardPage() {
  const [selectedDate, setSelectedDate] = useState(todayIso());
  const [summary, setSummary] = useState(null);
  const [loadError, setLoadError] = useState(false);

  const loadSummary = () => {
    setSummary(null);
    setLoadError(false);
    monitoringApi
      .get('/attendances/dashboard/summary', { params: { date: selectedDate } })
      .then(({ data }) => setSummary(data))
      .catch(() => setLoadError(true));
  };

  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect -- fetching from the API when the selected date changes
    loadSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  return (
    <div className="dashboard-page">
      <div className="dashboard-inner">
        <div className="dashboard-header">
          <h1>Dashboard Monitoring — {summary ? formatIndonesianDate(summary.date) : '...'}</h1>
          <label className="dashboard-date-picker">
            <CalendarIcon />
            <span className="sr-only">Pilih tanggal</span>
            <input
              type="date"
              max={todayIso()}
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
            />
          </label>
        </div>

        {loadError ? (
          <ErrorState
            compact
            message="Ringkasan dashboard tidak dapat dimuat. Pastikan monitoring-service berjalan."
            onRetry={loadSummary}
          />
        ) : !summary ? (
          <p>Memuat ringkasan...</p>
        ) : (
          <div className="card-grid">
            <Link
              className="summary-card"
              to={`/monitoring?status=PRESENT&from=${summary.date}&to=${summary.date}`}
            >
              <div className="value">{summary.presentToday}</div>
              <div>Hadir</div>
            </Link>
            <Link
              className="summary-card"
              to={`/monitoring?status=NOT_CHECKED_IN&from=${summary.date}&to=${summary.date}`}
            >
              <div className="value">{summary.notCheckedInToday}</div>
              <div>Belum Absen</div>
            </Link>
            <Link
              className="summary-card"
              to={`/monitoring?status=INCOMPLETE&from=${summary.date}&to=${summary.date}`}
            >
              <div className="value">{summary.incompleteToday}</div>
              <div>Belum Lengkap</div>
            </Link>
            <Link className="summary-card" to="/employees">
              <div className="value">{summary.totalActiveEmployees}</div>
              <div>Total Karyawan Aktif</div>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
