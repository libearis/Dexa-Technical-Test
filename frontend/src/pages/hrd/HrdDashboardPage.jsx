import { useEffect, useState } from 'react';
import { monitoringApi } from '../../api/monitoringApi';

export function HrdDashboardPage() {
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    monitoringApi.get('/attendances/dashboard/summary').then(({ data }) => setSummary(data));
  }, []);

  if (!summary) return <p>Memuat ringkasan...</p>;

  return (
    <div>
      <h1>Dashboard Monitoring — {summary.date}</h1>
      <div className="card-grid">
        <div className="summary-card">
          <div className="value">{summary.presentToday}</div>
          <div>Hadir Hari Ini</div>
        </div>
        <div className="summary-card">
          <div className="value">{summary.notCheckedInToday}</div>
          <div>Belum Absen</div>
        </div>
        <div className="summary-card">
          <div className="value">{summary.incompleteToday}</div>
          <div>Incomplete</div>
        </div>
        <div className="summary-card">
          <div className="value">{summary.totalActiveEmployees}</div>
          <div>Total Karyawan Aktif</div>
        </div>
      </div>
    </div>
  );
}
