import { useEffect, useState } from 'react';
import { monitoringApi } from '../../api/monitoringApi';
import { Modal } from '../../components/Modal';

// Backend still stores/validates EMPLOYEE/HRD_ADMIN — these are just friendlier
// FE-only display labels, not a real roles master.
const ROLE_LABELS = { EMPLOYEE: 'Staf', HRD_ADMIN: 'Manajer' };

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function getEmptyForm() {
  return {
    name: '',
    username: '',
    email: '',
    password: '',
    departmentId: '',
    role: '',
    joinDate: todayIso(),
  };
}

export function EmployeesPage() {
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [form, setForm] = useState(getEmptyForm);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [departmentId, setDepartmentId] = useState('');

  const load = async () => {
    const [employeesRes, departmentsRes] = await Promise.all([
      monitoringApi.get('/employees'),
      monitoringApi.get('/departments'),
    ]);
    setEmployees(employeesRes.data);
    setDepartments(departmentsRes.data);
  };

  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect -- fetching from the API on mount, not deriving state
    load();
  }, []);

  const departmentName = (id) => departments.find((d) => d.id === id)?.name ?? '-';

  const resetForm = () => {
    setForm(getEmptyForm());
    setEditingId(null);
  };

  const handleChange = (field) => (event) => setForm({ ...form, [field]: event.target.value });

  const openAddModal = () => {
    resetForm();
    setError('');
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setError('');
    resetForm();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    const payload = {
      ...form,
      departmentId: form.departmentId ? Number(form.departmentId) : undefined,
    };
    if (!payload.password) delete payload.password;
    // "Posisi" isn't a separate field in this form anymore — the backend still
    // requires it, so mirror the role label for new hires; leave it untouched on edit.
    if (!editingId) payload.position = ROLE_LABELS[form.role] ?? form.role;

    try {
      if (editingId) {
        await monitoringApi.patch(`/employees/${editingId}`, payload);
      } else {
        await monitoringApi.post('/employees', payload);
      }
      setModalOpen(false);
      resetForm();
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal menyimpan karyawan');
    }
  };

  const handleEdit = (employee) => {
    setEditingId(employee.id);
    setForm({
      name: employee.name,
      username: employee.username,
      email: employee.email,
      password: '',
      departmentId: employee.departmentId ?? '',
      role: employee.role,
      joinDate: employee.joinDate?.slice(0, 10) ?? '',
    });
    setError('');
    setModalOpen(true);
  };

  const handleDeactivate = async (id) => {
    await monitoringApi.patch(`/employees/${id}/deactivate`);
    await load();
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    setSearch(searchDraft);
  };

  const isFormValid = Boolean(
    form.name &&
      form.username &&
      form.email &&
      (editingId || form.password) &&
      form.departmentId &&
      form.role &&
      form.joinDate,
  );

  const filteredEmployees = employees.filter((employee) => {
    const term = search.trim().toLowerCase();
    const matchesSearch =
      !term ||
      employee.name.toLowerCase().includes(term) ||
      employee.username.toLowerCase().includes(term) ||
      employee.email.toLowerCase().includes(term);
    const matchesDepartment = !departmentId || employee.departmentId === Number(departmentId);
    return matchesSearch && matchesDepartment;
  });

  return (
    <div>
      <h1>Karyawan</h1>

      <div className="table-toolbar">
        <form className="inline-form" onSubmit={handleSearchSubmit}>
          <label>
            Cari
            <input
              type="search"
              placeholder="Nama, username, atau email"
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
            />
          </label>
          <label>
            Departemen
            <select value={departmentId} onChange={(event) => setDepartmentId(event.target.value)}>
              <option value="">Semua</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </label>
          <button type="submit">Cari</button>
        </form>

        <button type="button" onClick={openAddModal}>
          + Tambah Karyawan
        </button>
      </div>

      <table>
        <thead>
          <tr>
            <th>Nama</th>
            <th>Username</th>
            <th>Email</th>
            <th>Peran</th>
            <th>Departemen</th>
            <th>Status</th>
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody>
          {filteredEmployees.map((employee) => (
            <tr key={employee.id}>
              <td>{employee.name}</td>
              <td>{employee.username}</td>
              <td>{employee.email}</td>
              <td>{ROLE_LABELS[employee.role] ?? employee.role}</td>
              <td>{departmentName(employee.departmentId)}</td>
              <td>{employee.status}</td>
              <td>
                <button className="secondary" onClick={() => handleEdit(employee)}>
                  Edit
                </button>{' '}
                {employee.status === 'ACTIVE' && (
                  <button className="secondary" onClick={() => handleDeactivate(employee.id)}>
                    Nonaktifkan
                  </button>
                )}
              </td>
            </tr>
          ))}
          {filteredEmployees.length === 0 && (
            <tr>
              <td colSpan={7} style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>
                Tidak ada karyawan yang cocok
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {modalOpen && (
        <Modal title={editingId ? 'Update Karyawan' : 'Tambah Karyawan'} onClose={closeModal}>
          <form onSubmit={handleSubmit}>
            <label>
              Nama
              <input value={form.name} onChange={handleChange('name')} required />
            </label>
            <label>
              Username (untuk login)
              <input value={form.username} onChange={handleChange('username')} required />
            </label>
            <label>
              Email
              <input type="email" value={form.email} onChange={handleChange('email')} required />
            </label>
            <label>
              Password {editingId && '(kosongkan jika tidak diubah)'}
              <input
                type="password"
                value={form.password}
                onChange={handleChange('password')}
                required={!editingId}
              />
            </label>
            <label>
              Departemen
              <select value={form.departmentId} onChange={handleChange('departmentId')} required>
                <option value="" disabled>
                  Pilih Departemen
                </option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Peran
              <select value={form.role} onChange={handleChange('role')} required>
                <option value="" disabled>
                  Pilih Peran
                </option>
                <option value="EMPLOYEE">{ROLE_LABELS.EMPLOYEE}</option>
                <option value="HRD_ADMIN">{ROLE_LABELS.HRD_ADMIN}</option>
              </select>
            </label>
            <label>
              Tanggal Bergabung
              <input type="date" value={form.joinDate} onChange={handleChange('joinDate')} required />
            </label>
            {error && <p style={{ color: '#dc2626' }}>{error}</p>}
            <div className="modal-actions">
              <button type="button" className="secondary" onClick={closeModal}>
                Batal
              </button>
              <button type="submit" className={isFormValid ? undefined : 'pending'}>
                {editingId ? 'Update' : 'Tambah'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
