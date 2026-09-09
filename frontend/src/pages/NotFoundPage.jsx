import { Link } from 'react-router-dom';
import './NotFoundPage.css';

export function NotFoundPage() {
  return (
    <div className="not-found-page">
      <div className="not-found-card">
        <div className="not-found-code">404</div>
        <h1>Halaman tidak ditemukan</h1>
        <p>URL yang Anda tuju tidak ada atau sudah dipindahkan.</p>
        <Link to="/">Kembali ke Beranda</Link>
      </div>
    </div>
  );
}
