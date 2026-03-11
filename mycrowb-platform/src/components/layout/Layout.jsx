import { Link, useNavigate } from 'react-router-dom';
import client from '../../api/client';

export default function Layout({ title, children }) {
  const navigate = useNavigate();

  const logout = async () => {
    const token = localStorage.getItem('token');
    const sessionId = localStorage.getItem('sessionId');

    if (token && sessionId) {
      try {
        await client.post('/auth/logout', { sessionId });
      } catch (_error) {
        // ignore logout tracking failure and clear local session anyway
      }
    }

    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('sessionId');
    navigate('/');
  };

  return (
    <div className="min-h-screen">
      <header className="bg-primaryGreen p-4 text-white flex justify-between">
        <h1 className="font-heading font-semibold">MYCROWB</h1>
        <div className="flex items-center gap-4">
          <Link to="/" className="text-sm">Home</Link>
          <button type="button" onClick={logout} className="rounded border border-white/60 px-2 py-1 text-xs">Logout</button>
        </div>
      </header>
      <main className="max-w-6xl mx-auto p-4">
        <h2 className="mb-4 font-heading text-2xl">{title}</h2>
        {children}
      </main>
    </div>
  );
}
