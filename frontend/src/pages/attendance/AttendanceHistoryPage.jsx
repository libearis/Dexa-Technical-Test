import { useEffect, useState } from 'react';
import { ATTENDANCE_BASE_URL, attendanceApi } from '../../api/attendanceApi';

export function AttendanceHistoryPage() {
  const [history, setHistory] = useState([]);

  const loadHistory = async () => {
    const { data } = await attendanceApi.get('/attendances/history');
    setHistory(data);
  };

  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect -- fetching from the API on mount, not deriving state
    loadHistory();
  }, []);

  return (
    <div>
      <h1>Riwayat Absensi</h1>
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
    </div>
  );
}
