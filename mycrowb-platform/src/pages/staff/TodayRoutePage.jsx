import { Link } from 'react-router-dom';
import Layout from '../../components/layout/Layout';

const staffActions = [
  { label: 'Open shop map', to: '/staff/shop-map' },
  { label: 'Collection confirmation', to: '/staff/collection-confirm' },
  { label: 'Payment confirmation', to: '/staff/payment-confirm' }
];

export default function TodayRoutePage() {
  return (
    <Layout title="Today's Collection Route">
      <section className="rounded-xl bg-white p-6 shadow-sm">
        <p className="text-gray-700">Optimized route generated from OSRM trip planner.</p>
        <ol className="mt-4 list-decimal space-y-1 pl-5 text-sm text-gray-600">
          <li>Green Cut — 9:00 AM</li>
          <li>Style Hub — 10:30 AM</li>
          <li>Urban Fade — 12:00 PM</li>
        </ol>
        <div className="mt-4 flex flex-wrap gap-2">
          {staffActions.map((action) => (
            <Link key={action.to} to={action.to} className="rounded-md bg-primaryGreen px-3 py-2 text-sm font-medium text-white hover:bg-leafGreen">
              {action.label}
            </Link>
          ))}
        </div>
      </section>
    </Layout>
  );
}
