import { Link } from 'react-router-dom';

export default function Layout({ title, children }) {
  return (
    <div className="min-h-screen">
      <header className="bg-primaryGreen text-white p-4 flex justify-between">
        <h1 className="font-heading font-semibold">MYCROWB</h1>
        <Link to="/" className="text-sm">Home</Link>
      </header>
      <main className="p-4 max-w-6xl mx-auto">
        <h2 className="font-heading text-2xl mb-4">{title}</h2>
        {children}
      </main>
    </div>
  );
}
