import { useEffect, useState } from 'react';
import { monitoringApi } from '../../api/monitoringApi';

export function DepartmentsPage() {
  const [departments, setDepartments] = useState([]);
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');

  const load = async () => {
    const { data } = await monitoringApi.get('/departments');
    setDepartments(data);
  };

  useEffect(() => {
    load();
  }, []);

  const resetForm = () => {
    setName('');
    setEditingId(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    try {
      if (editingId) {
        await monitoringApi.patch(`/departments/${editingId}`, { name });
      } else {
        await monitoringApi.post('/departments', { name });
      }
      resetForm();
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal menyimpan departemen');
    }
  };

  const handleEdit = (department) => {
    setEditingId(department.id);
    setName(department.name);
  };

  const handleDelete = async (id) => {
    await monitoringApi.delete(`/departments/${id}`);
    await load();
  };

  return (
    <div>
      <h1>Departemen</h1>
      <form className="inline-form" onSubmit={handleSubmit}>
        <label>
          Nama Departemen
          <input value={name} onChange={(e) => setName(e.target.value)} required />
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
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody>
          {departments.map((department) => (
            <tr key={department.id}>
              <td>{department.name}</td>
              <td>
                <button className="secondary" onClick={() => handleEdit(department)}>
                  Edit
                </button>{' '}
                <button className="secondary" onClick={() => handleDelete(department.id)}>
                  Hapus
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
