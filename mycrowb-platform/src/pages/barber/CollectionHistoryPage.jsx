import { Link } from 'react-router-dom';
import Layout from '../../components/layout/Layout';

const history = [
  { month: 'January 2026', weight: '38 kg', status: 'Collected' },
  { month: 'February 2026', weight: '41 kg', status: 'Collected' },
  { month: 'March 2026', weight: '12 kg', status: 'Pending pickup' }
];

export default function CollectionHistoryPage() {
  return (
    <Layout title="Collection History">
      <section className="rounded-xl bg-white p-6 shadow-sm">
        <p className="text-gray-700">Track monthly hair waste pickup records and status.</p>
        <ul className="mt-4 space-y-2 text-sm text-gray-700">
          {history.map((item) => (
            <li key={item.month} className="rounded-md border border-gray-200 p-3">
              <strong>{item.month}</strong> — {item.weight} — {item.status}
            </li>
          ))}
        </ul>
        <Link to="/barber/dashboard" className="mt-4 inline-block text-sm font-medium text-primaryGreen">← Back to dashboard</Link>
      </section>
    </Layout>
  );
}
