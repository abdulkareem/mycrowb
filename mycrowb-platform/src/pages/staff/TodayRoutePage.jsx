import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import Layout from '../../components/layout/Layout';

const STAFF_ASSIGNMENT_KEY = 'mycrowb_staff_route_assignments';

const staffActions = [
  { label: 'Open shop map', to: '/staff/shop-map' },
  { label: 'Collection confirmation', to: '/staff/collection-confirm' },
  { label: 'Payment confirmation', to: '/staff/payment-confirm' }
];

export default function TodayRoutePage() {
  const assignments = useMemo(() => {
    const value = JSON.parse(localStorage.getItem(STAFF_ASSIGNMENT_KEY) || '{}');
    return Object.values(value);
  }, []);

  return (
    <Layout title="Today's Collection Route">
      <section className="rounded-xl bg-white p-6 shadow-sm">
        <p className="text-gray-700">Route allocations sent from admin are listed below by staff ID.</p>
        <div className="mt-4 space-y-3">
          {assignments.map((assignment) => (
            <article className="rounded-lg border border-gray-200 p-3" key={assignment.staffIdNumber}>
              <p className="text-sm font-semibold text-gray-800">{assignment.staffName} ({assignment.staffIdNumber})</p>
              <p className="text-xs text-gray-600">Vehicle: {assignment.vehicleNumber || '-'} | Cluster: {assignment.clusterName} | Date: {assignment.date}</p>
              <ol className="mt-2 list-decimal pl-5 text-sm text-gray-700">
                {assignment.shops.map((shop) => (
                  <li key={shop.id}>{shop.shopName}</li>
                ))}
              </ol>
            </article>
          ))}
          {!assignments.length && <p className="text-sm text-gray-500">No route assignment has been sent yet.</p>}
        </div>
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
