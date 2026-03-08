import { Link } from 'react-router-dom';
import Layout from '../../components/layout/Layout';

const quickActions = [
  { label: 'Collection history', to: '/barber/collections' },
  { label: 'Receipt downloads', to: '/barber/receipts' },
  { label: 'Certificates', to: '/barber/certificates' },
  { label: 'Service rating', to: '/barber/rating' },
  { label: 'Notifications', to: '/barber/notifications' },
  { label: 'Profile', to: '/barber/profile' }
];

export default function BarberDashboardPage() {
  return (
    <Layout title="Barber Dashboard">
      <section className="rounded-xl bg-white p-6 shadow-sm">
        <p className="text-gray-700">Monthly pickups, earnings, and sustainability points overview.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
          {quickActions.map((action) => (
            <Link key={action.to} to={action.to} className="rounded-md border border-primaryGreen px-3 py-2 text-sm font-medium text-primaryGreen hover:bg-lightGreen/40">
              {action.label}
            </Link>
          ))}
        </div>
      </section>
    </Layout>
  );
}
