import { useEffect, useState } from 'react';
import { ATTENDANCE_BASE_URL } from '../../api/attendanceApi';
import { monitoringApi } from '../../api/monitoringApi';

export function AttendanceMonitoringPage() {
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [filters, setFilters] = useState({ from: '', to: '', departmentId: '', employeeId: '', status: '' });
  const [records, setRecords] = useState([]);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    monitoringApi.get('/departments').then(({ data }) => setDepartments(data));
    monitoringApi.get('/employees').then(({ data }) => setEmployees(data));
  }, []);

  const loadRecords = async () => {
    const params = Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== ''));
    const { data } = await monitoringApi.get('/attendances', { params });
    setRecords(data);
  };

  useEffect(() => {
    loadRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFilterChange = (field) => (event) => setFilters({ ...filters, [field]: event.target.value });

  const handleFilterSubmit = (event) => {
    event.preventDefault();
    loadRecords();
  };

  const openDetail = async (id) => {
    const { data } = await monitoringApi.get(`/attendances/${id}`);
    setSelected(data);
  };

  return (
    <div>
      <h1>Monitoring Absensi</h1>
      <form className="inline-form" onSubmit={handleFilterSubmit}>
        <label>
          Dari Tanggal
          <input type="date" value={filters.from} onChange={handleFilterChange('from')} />
        </label>
        <label>
          Sampai Tanggal
          <input type="date" value={filters.to} onChange={handleFilterChange('to')} />
        </label>
        <label>
          Departemen
          <select value={filters.departmentId} onChange={handleFilterChange('departmentId')}>
            <option value="">Semua</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Karyawan
          <select value={filters.employeeId} onChange={handleFilterChange('employeeId')}>
            <option value="">Semua</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Status
          <select value={filters.status} onChange={handleFilterChange('status')}>
            <option value="">Semua</option>
            <option value="PRESENT">PRESENT</option>
            <option value="INCOMPLETE">INCOMPLETE</option>
          </select>
        </label>
        <button type="submit">Filter</button>
      </form>

      <table>
        <thead>
          <tr>
            <th>Tanggal</th>
            <th>Karyawan</th>
            <th>Check-in</th>
            <th>Check-out</th>
            <th>Status</th>
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody>
          {records.map((record) => (
            <tr key={record.id}>
              <td>{record.attendanceDate}</td>
              <td>{record.employee?.name ?? '-'}</td>
              <td>{record.checkInTime && new Date(record.checkInTime).toLocaleTimeString()}</td>
              <td>{record.checkOutTime && new Date(record.checkOutTime).toLocaleTimeString()}</td>
              <td>{record.status}</td>
              <td>
                <button className="secondary" onClick={() => openDetail(record.id)}>
                  Detail
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {selected && (
        <div className="detail-panel">
          <h2>Detail Absensi — {selected.employee?.name}</h2>
          <button className="secondary" onClick={() => setSelected(null)}>
            Tutup
          </button>
          <div className="detail-columns">
            <div>
              <h3>Check-in</h3>
              <p>Waktu server: {selected.checkInTime && new Date(selected.checkInTime).toLocaleString()}</p>
              <p>
                Waktu EXIF foto:{' '}
                {selected.checkInPhotoExifTime
                  ? new Date(selected.checkInPhotoExifTime).toLocaleString()
                  : 'tidak terbaca'}
              </p>
              {selected.checkInPhotoUrl && (
                <img
                  src={`${ATTENDANCE_BASE_URL}${selected.checkInPhotoUrl}`}
                  alt="check-in"
                  className="detail-photo"
                />
              )}
            </div>
            <div>
              <h3>Check-out</h3>
              <p>
                Waktu server:{' '}
                {selected.checkOutTime ? new Date(selected.checkOutTime).toLocaleString() : 'belum check-out'}
              </p>
              <p>
                Waktu EXIF foto:{' '}
                {selected.checkOutPhotoExifTime
                  ? new Date(selected.checkOutPhotoExifTime).toLocaleString()
                  : '-'}
              </p>
              {selected.checkOutPhotoUrl && (
                <img
                  src={`${ATTENDANCE_BASE_URL}${selected.checkOutPhotoUrl}`}
                  alt="check-out"
                  className="detail-photo"
                />
              )}
            </div>
          </div>
          {selected.notes && <p>Catatan: {selected.notes}</p>}
        </div>
      )}
    </div>
  );
}
