import { useEffect, useState } from 'react';
import { monitoringApi } from '../../api/monitoringApi';
import { Modal } from '../../components/Modal';

export function DepartmentsPage() {
  const [departments, setDepartments] = useState([]);
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');

  const load = async () => {
    const { data } = await monitoringApi.get('/departments');
    setDepartments(data);
  };

  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect -- fetching from the API on mount, not deriving state
    load();
  }, []);

  const resetForm = () => {
    setName('');
    setEditingId(null);
  };

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
    try {
      if (editingId) {
        await monitoringApi.patch(`/departments/${editingId}`, { name });
      } else {
        await monitoringApi.post('/departments', { name });
      }
      setModalOpen(false);
      resetForm();
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal menyimpan departemen');
    }
  };

  const handleEdit = (department) => {
    setEditingId(department.id);
    setName(department.name);
    setError('');
    setModalOpen(true);
  };

  const handleDelete = async (id) => {
    await monitoringApi.delete(`/departments/${id}`);
    await load();
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    setSearch(searchDraft);
  };

  const filteredDepartments = departments.filter((department) => {
    const term = search.trim().toLowerCase();
    return !term || department.name.toLowerCase().includes(term);
  });

  return (
    <div>
      <h1>Departemen</h1>

      <div className="table-toolbar">
        <form className="inline-form" onSubmit={handleSearchSubmit}>
          <label>
            Cari
            <input
              type="search"
              placeholder="Nama departemen"
              value={searchDraft}
              onChange={(e) => setSearchDraft(e.target.value)}
            />
          </label>
          <button type="submit">Cari</button>
        </form>

        <button type="button" onClick={openAddModal}>
          + Tambah Departemen
        </button>
      </div>

      <table>
        <thead>
          <tr>
            <th>Nama</th>
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody>
          {filteredDepartments.map((department) => (
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
          {filteredDepartments.length === 0 && (
            <tr>
              <td colSpan={2} style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>
                Tidak ada departemen yang cocok
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {modalOpen && (
        <Modal title={editingId ? 'Update Departemen' : 'Tambah Departemen'} onClose={closeModal}>
          <form onSubmit={handleSubmit}>
            <label>
              Nama Departemen
              <input value={name} onChange={(e) => setName(e.target.value)} required />
            </label>
            {error && <p style={{ color: '#dc2626' }}>{error}</p>}
            <div className="modal-actions">
              <button type="button" className="secondary" onClick={closeModal}>
                Batal
              </button>
              <button type="submit">{editingId ? 'Update' : 'Tambah'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
