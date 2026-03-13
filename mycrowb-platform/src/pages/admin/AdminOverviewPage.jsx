import { Link } from 'react-router-dom';
import Layout from '../../components/layout/Layout';

const adminModules = [
  { label: 'Registered shops', to: '/admin/shops' },
  { label: 'CSV upload', to: '/admin/csv-upload' },
  { label: 'Collection management', to: '/admin/collections' },
  { label: 'Payment management', to: '/admin/payments' },
  { label: 'Add staff', to: '/admin/staff' },
  { label: 'Analytics dashboard', to: '/admin/analytics' },
  { label: 'Route optimization', to: '/admin/routes' },
  { label: 'Ratings dashboard', to: '/admin/ratings' },
  { label: 'Total', to: '/admin/total' },
  { label: 'Manage fields', to: '/admin/fields' },
  { label: 'Track staff', to: '/admin/track-staff' },
  { label: 'New registration requests', to: '/admin/registration-requests' }
];

export default function AdminOverviewPage() {
  const user = JSON.parse(localStorage.getItem('user') || 'null');

  return (
    <Layout title="Admin Overview">
      <section className="rounded-xl bg-white p-6 shadow-sm">
        <p className="text-gray-700">Operations health, KPI trends, and process alerts.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
          {adminModules.map((module) => (
            <Link key={module.to} to={module.to} className="rounded-md border border-primaryGreen px-3 py-2 text-sm font-medium text-primaryGreen hover:bg-lightGreen/40">
              {module.label}
            </Link>
          ))}
          {user?.role === 'SUPER_ADMIN' && (
            <Link to="/super-admin/overview" className="rounded-md border border-amber-500 px-3 py-2 text-sm font-medium text-amber-600 hover:bg-amber-50">
              Go to Super Admin Dashboard
            </Link>
          )}
        </div>
      </section>
    </Layout>
  );
}
