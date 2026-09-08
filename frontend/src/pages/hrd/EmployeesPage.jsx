import { useEffect, useState } from 'react';
import { monitoringApi } from '../../api/monitoringApi';

const emptyForm = {
  name: '',
  username: '',
  email: '',
  password: '',
  role: 'EMPLOYEE',
  departmentId: '',
  position: '',
  joinDate: '',
};

export function EmployeesPage() {
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');

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
    setForm(emptyForm);
    setEditingId(null);
  };

  const handleChange = (field) => (event) => setForm({ ...form, [field]: event.target.value });

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    const payload = {
      ...form,
      departmentId: form.departmentId ? Number(form.departmentId) : undefined,
    };
    if (!payload.password) delete payload.password;

    try {
      if (editingId) {
        await monitoringApi.patch(`/employees/${editingId}`, payload);
      } else {
        await monitoringApi.post('/employees', payload);
      }
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
      role: employee.role,
      departmentId: employee.departmentId ?? '',
      position: employee.position,
      joinDate: employee.joinDate?.slice(0, 10) ?? '',
    });
  };

  const handleDeactivate = async (id) => {
    await monitoringApi.patch(`/employees/${id}/deactivate`);
    await load();
  };

  return (
    <div>
      <h1>Karyawan</h1>
      <form className="inline-form" onSubmit={handleSubmit}>
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
          Role
          <select value={form.role} onChange={handleChange('role')}>
            <option value="EMPLOYEE">EMPLOYEE</option>
            <option value="HRD_ADMIN">HRD_ADMIN</option>
          </select>
        </label>
        <label>
          Departemen
          <select value={form.departmentId} onChange={handleChange('departmentId')}>
            <option value="">-</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Posisi
          <input value={form.position} onChange={handleChange('position')} required />
        </label>
        <label>
          Tanggal Bergabung
          <input type="date" value={form.joinDate} onChange={handleChange('joinDate')} required />
        </label>
        <button type="submit">{editingId ? 'Update' : 'Tambah'}</button>
        {editingId && (
          <button type="button" className="secondary" onClick={resetForm}>
            Batal
          </button>
        )}
      </form>
      {error && <p style={{ color: '#dc2626' }}>{error}</p>}
      <table>
        <thead>
          <tr>
            <th>Nama</th>
            <th>Username</th>
            <th>Email</th>
            <th>Role</th>
            <th>Departemen</th>
            <th>Status</th>
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody>
          {employees.map((employee) => (
            <tr key={employee.id}>
              <td>{employee.name}</td>
              <td>{employee.username}</td>
              <td>{employee.email}</td>
              <td>{employee.role}</td>
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
        </tbody>
      </table>
    </div>
  );
}
