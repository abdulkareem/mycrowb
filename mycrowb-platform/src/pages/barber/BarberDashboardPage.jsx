import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import client from '../../api/client';
import Layout from '../../components/layout/Layout';

const quickActions = [
  { label: 'Collection history', to: '/barber/collections' },
  { label: 'Track collection vehicle', to: '/barber/track-vehicle' },
  { label: 'Certificates', to: '/barber/certificates' },
  { label: 'Service rating', to: '/barber/rating' },
  { label: 'Notifications', to: '/barber/notifications' },
  { label: 'Profile', to: '/barber/profile' }
];

function StatCard({ label, value }) {
  return (
    <article className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-gray-900">{value}</p>
    </article>
  );
}

export default function BarberDashboardPage() {
  const [shop, setShop] = useState(null);
  const [collections, setCollections] = useState([]);

  useEffect(() => {
    client.get('/shops/me').then((res) => setShop(res.data)).catch(() => setShop(null));
    client.get('/collections/my').then((res) => setCollections(res.data)).catch(() => setCollections([]));
  }, []);

  const stats = useMemo(() => {
    const total = collections.length;
    const collected = collections.filter((item) => item.collected).length;
    const paid = collections.filter((item) => item.paid).length;
    const pending = Math.max(0, 12 - paid);
    const missed = collections.filter((item) => item.status === 'MISSED').length;
    const collectionPercent = total ? Math.round((collected / total) * 100) : 0;
    const stars = collectionPercent >= 100 ? 5 : Math.max(1, Math.ceil((collectionPercent / 100) * 5));

    return {
      collectedMonths: paid,
      pending,
      paymentPending: pending,
      missed,
      collectionPercent,
      stars
    };
  }, [collections]);

  const starColor = stats.collectionPercent >= 100 ? 'text-green-600' : 'text-amber-500';

  return (
    <Layout title="Barber Dashboard">
      <section className="rounded-xl bg-white p-6 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
          {quickActions.map((action) => (
            <Link key={action.to} to={action.to} className="rounded-md border border-primaryGreen px-3 py-2 text-sm font-medium text-primaryGreen hover:bg-lightGreen/40">
              {action.label}
            </Link>
          ))}
        </div>

        <p className="text-gray-700">Monthly pickups, earnings, and sustainability points overview.</p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard label="Shop registration number" value={shop?.shopRegistrationNumber || '-'} />
          <StatCard label="Name of shop" value={shop?.shopName || '-'} />
          <StatCard label="Shop owner name" value={shop?.ownerName || shop?.owner?.name || '-'} />
          <StatCard label="Place" value={shop?.place || '-'} />
          <StatCard label="Cluster" value={shop?.clusterName || '-'} />
          <StatCard label="Joining date" value={shop?.joinedDate ? new Date(shop.joinedDate).toLocaleDateString() : '-'} />
          <StatCard label="Collected month" value={stats.collectedMonths} />
          <StatCard label="Pending" value={stats.pending} />
          <StatCard label="Payment pending" value={stats.paymentPending} />
          <StatCard label="Missed" value={stats.missed} />
        </div>

        <article className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
          <p className="text-sm text-gray-600">Star grading</p>
          <p className={`mt-1 text-2xl font-bold ${starColor}`}>{'★'.repeat(stats.stars)}{'☆'.repeat(5 - stats.stars)}</p>
          <p className="text-sm text-gray-700">Collection completion: {stats.collectionPercent}%</p>
        </article>

        <div className="mt-4 rounded-lg bg-lightGreen/40 p-4 text-sm text-gray-700">
          <p className="font-medium text-primaryGreen">Tips to improve score</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Complete monthly collection before due date.</li>
            <li>Ensure payment verification is completed by admin.</li>
            <li>Reduce missed pickups through route tracking.</li>
          </ul>
        </div>

      </section>
    </Layout>
  );
}
