import { useNavigate } from 'react-router-dom';
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
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-20 bg-primaryGreen p-4 text-white shadow-sm">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between">
          <h1 className="font-heading font-semibold">MYCROWB</h1>
          <button type="button" onClick={logout} className="rounded border border-white/60 px-2 py-1 text-xs">
            Logout
          </button>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl p-4">
        <h2 className="mb-4 font-heading text-2xl">{title}</h2>
        {children}
      </main>
    </div>
  );
}
