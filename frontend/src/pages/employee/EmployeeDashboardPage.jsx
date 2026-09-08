import { useEffect, useState } from 'react';
import { ATTENDANCE_BASE_URL, attendanceApi } from '../../api/attendanceApi';
import { PhotoCaptureInput } from '../../components/PhotoCaptureInput';
import './EmployeeDashboardPage.css';

export function EmployeeDashboardPage() {
  const [history, setHistory] = useState([]);
  const [checkInPhoto, setCheckInPhoto] = useState(null);
  const [checkOutPhoto, setCheckOutPhoto] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const loadHistory = async () => {
    const { data } = await attendanceApi.get('/attendances/history');
    setHistory(data);
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const todayRecord = history.find(
    (record) => record.attendanceDate === new Date().toISOString().slice(0, 10),
  );

  const handleAction = async (action, photo) => {
    if (!photo) {
      setError('Silakan ambil foto terlebih dahulu');
      return;
    }
    setError('');
    setMessage('');
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('photo', photo);
      await attendanceApi.post(`/attendances/${action}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setMessage(action === 'check-in' ? 'Check-in berhasil' : 'Check-out berhasil');
      setCheckInPhoto(null);
      setCheckOutPhoto(null);
      await loadHistory();
    } catch (err) {
      setError(err.response?.data?.message || 'Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="employee-dashboard">
      <section className="attendance-actions">
        <div className="action-card">
          <h2>Check-in</h2>
          <PhotoCaptureInput onChange={setCheckInPhoto} />
          <button
            disabled={loading || !!todayRecord}
            onClick={() => handleAction('check-in', checkInPhoto)}
          >
            {todayRecord ? 'Sudah check-in hari ini' : 'Check-in'}
          </button>
        </div>
        <div className="action-card">
          <h2>Check-out</h2>
          <PhotoCaptureInput onChange={setCheckOutPhoto} />
          <button
            disabled={loading || !todayRecord || !!todayRecord?.checkOutTime}
            onClick={() => handleAction('check-out', checkOutPhoto)}
          >
            {todayRecord?.checkOutTime ? 'Sudah check-out hari ini' : 'Check-out'}
          </button>
        </div>
      </section>

      {message && <p className="feedback success">{message}</p>}
      {error && <p className="feedback error">{error}</p>}

      <section>
        <h2>Riwayat Absensi</h2>
        <table>
          <thead>
            <tr>
              <th>Tanggal</th>
              <th>Check-in</th>
              <th>Check-out</th>
              <th>Status</th>
              <th>Catatan</th>
            </tr>
          </thead>
          <tbody>
            {history.map((record) => (
              <tr key={record.id}>
                <td>{record.attendanceDate}</td>
                <td>
                  {record.checkInTime && new Date(record.checkInTime).toLocaleTimeString()}
                  {record.checkInPhotoUrl && (
                    <a href={`${ATTENDANCE_BASE_URL}${record.checkInPhotoUrl}`} target="_blank" rel="noreferrer">
                      {' '}
                      foto
                    </a>
                  )}
                </td>
                <td>
                  {record.checkOutTime && new Date(record.checkOutTime).toLocaleTimeString()}
                  {record.checkOutPhotoUrl && (
                    <a href={`${ATTENDANCE_BASE_URL}${record.checkOutPhotoUrl}`} target="_blank" rel="noreferrer">
                      {' '}
                      foto
                    </a>
                  )}
                </td>
                <td>{record.status}</td>
                <td>{record.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
