import { Link } from 'react-router-dom';
import Layout from '../../components/layout/Layout';

const superAdminModules = [
  { label: 'Registered shops', to: '/admin/shops' },
  { label: 'CSV upload', to: '/admin/csv-upload' },
  { label: 'Collection management', to: '/admin/collections' },
  { label: 'Payment management', to: '/admin/payments' },
  { label: 'Add staff', to: '/admin/staff' },
  { label: 'Analytics dashboard', to: '/admin/analytics' },
  { label: 'Route optimization', to: '/admin/routes' },
  { label: 'Ratings dashboard', to: '/admin/ratings' },
  { label: 'Add admin numbers', to: '/super-admin/admin-numbers' },
  { label: 'Login activity logs', to: '/super-admin/login-activities' }
];

export default function SuperAdminOverviewPage() {
  return (
    <Layout title="Super Admin Overview">
      <section className="rounded-xl bg-white p-6 shadow-sm">
        <p className="text-gray-700">Full admin controls plus admin-number management and login audit views.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
          {superAdminModules.map((module) => (
            <Link key={module.to} to={module.to} className="rounded-md border border-primaryGreen px-3 py-2 text-sm font-medium text-primaryGreen hover:bg-lightGreen/40">
              {module.label}
            </Link>
          ))}
        </div>
      </section>
    </Layout>
  );
}
