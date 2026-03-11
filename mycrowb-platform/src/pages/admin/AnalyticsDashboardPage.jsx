import { useNavigate } from 'react-router-dom';
import Layout from '../../components/layout/Layout';
import AnalyticsCharts from '../../components/charts/AnalyticsCharts';

export default function AnalyticsDashboardPage() {
  const navigate = useNavigate();

  return (
    <Layout title="Analytics Dashboard">
      <section className="mb-4 flex justify-end">
        <button className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-700" onClick={() => navigate('/admin/overview')} type="button">
          Back
        </button>
      </section>
      <AnalyticsCharts />
    </Layout>
  );
}
