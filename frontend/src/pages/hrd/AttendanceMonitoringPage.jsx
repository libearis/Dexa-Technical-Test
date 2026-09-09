import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ATTENDANCE_BASE_URL } from '../../api/attendanceApi';
import { monitoringApi } from '../../api/monitoringApi';
import { ErrorState } from '../../components/ErrorState';
import { Spinner } from '../../components/Spinner';

const STATUS_LABELS = { PRESENT: 'Hadir', INCOMPLETE: 'Belum Lengkap', NOT_CHECKED_IN: 'Belum Absen' };

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function AttendanceMonitoringPage() {
  // Seeded from the dashboard's "click a status card" deep link, e.g.
  // /monitoring?status=PRESENT&from=2026-03-05&to=2026-03-05 — falls back to today.
  const [searchParams] = useSearchParams();
  const [departments, setDepartments] = useState([]);
  const [filters, setFilters] = useState({
    from: searchParams.get('from') || todayIso(),
    to: searchParams.get('to') || todayIso(),
    departmentId: '',
    status: searchParams.get('status') || '',
  });
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [records, setRecords] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadDepartments = () => {
    monitoringApi
      .get('/departments')
      .then(({ data }) => setDepartments(data))
      .catch(() => setLoadError(true));
  };

  const loadRecords = () => {
    setLoading(true);
    const params = Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== ''));
    monitoringApi
      .get('/attendances', { params })
      .then(({ data }) => setRecords(data))
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect -- fetching from the API on mount, not deriving state
    loadDepartments();
  }, []);

  // Date/department/status apply instantly on change; only the employee
  // name search below waits for the Cari button (or Enter).
  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect -- fetching from the API when filters change, not deriving state
    loadRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const handleRetry = () => {
    setLoadError(false);
    loadDepartments();
    loadRecords();
  };

  const handleFilterChange = (field) => (event) => setFilters({ ...filters, [field]: event.target.value });

  // "Not Checked In" is computed on the fly against one specific day, so
  // picking it collapses the range down to a single date field instead of
  // letting you build an invalid combination.
  const handleStatusChange = (event) => {
    const value = event.target.value;
    setFilters((current) => (value === 'NOT_CHECKED_IN' ? { ...current, status: value, to: current.from } : { ...current, status: value }));
  };

  const handleSingleDateChange = (event) => {
    const value = event.target.value;
    setFilters((current) => ({ ...current, from: value, to: value }));
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    setSearch(searchDraft);
  };

  const openDetail = async (id) => {
    const { data } = await monitoringApi.get(`/attendances/${id}`);
    setSelected(data);
  };

  const filteredRecords = records.filter((record) => {
    const term = search.trim().toLowerCase();
    return !term || (record.employee?.name ?? '').toLowerCase().includes(term);
  });

  return (
    <div>
      <h1>Monitoring Absensi</h1>
      {loading ? (
        <Spinner label="Memuat data absensi..." />
      ) : loadError ? (
        <ErrorState
          message="Data monitoring tidak dapat dimuat. Pastikan monitoring-service berjalan."
          onRetry={handleRetry}
        />
      ) : (
      <>
      <form className="inline-form" onSubmit={handleSearchSubmit}>
        {filters.status === 'NOT_CHECKED_IN' ? (
          <label>
            Tanggal
            <input type="date" value={filters.from} onChange={handleSingleDateChange} />
          </label>
        ) : (
          <>
            <label>
              Dari Tanggal
              <input type="date" value={filters.from} onChange={handleFilterChange('from')} />
            </label>
            <label>
              Sampai Tanggal
              <input type="date" value={filters.to} onChange={handleFilterChange('to')} />
            </label>
          </>
        )}
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
          Status
          <select value={filters.status} onChange={handleStatusChange}>
            <option value="">Semua</option>
            <option value="PRESENT">Hadir</option>
            <option value="INCOMPLETE">Belum Lengkap</option>
            <option value="NOT_CHECKED_IN">Belum Absen</option>
          </select>
        </label>
        <label>
          Cari Karyawan
          <input
            type="search"
            placeholder="Nama karyawan"
            value={searchDraft}
            onChange={(event) => setSearchDraft(event.target.value)}
          />
        </label>
        <button type="submit">Cari</button>
      </form>

      <div className="table-wrapper">
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
          {filteredRecords.map((record) => (
            <tr key={record.id ?? `not-checked-in-${record.employeeId}`}>
              <td>{record.attendanceDate}</td>
              <td>{record.employee?.name ?? '-'}</td>
              <td>{record.checkInTime && new Date(record.checkInTime).toLocaleTimeString()}</td>
              <td>{record.checkOutTime && new Date(record.checkOutTime).toLocaleTimeString()}</td>
              <td>{STATUS_LABELS[record.status] ?? record.status}</td>
              <td>
                {record.id != null ? (
                  <button className="secondary" onClick={() => openDetail(record.id)}>
                    Detail
                  </button>
                ) : (
                  '-'
                )}
              </td>
            </tr>
          ))}
          {filteredRecords.length === 0 && (
            <tr>
              <td colSpan={6} style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>
                Tidak ada data absensi yang cocok
              </td>
            </tr>
          )}
        </tbody>
      </table>
      </div>
      </>
      )}

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
              {selected.checkInLat && selected.checkInLng && (
                <p>
                  Lokasi:{' '}
                  <a
                    href={`https://maps.google.com/?q=${selected.checkInLat},${selected.checkInLng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Lihat di peta
                  </a>
                </p>
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
              {selected.checkOutLat && selected.checkOutLng && (
                <p>
                  Lokasi:{' '}
                  <a
                    href={`https://maps.google.com/?q=${selected.checkOutLat},${selected.checkOutLng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Lihat di peta
                  </a>
                </p>
              )}
            </div>
          </div>
          {selected.notes && <p>Catatan: {selected.notes}</p>}
        </div>
      )}
    </div>
  );
}
