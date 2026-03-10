import { useEffect, useMemo, useState } from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend } from 'chart.js';
import client from '../../api/client';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

const monthFormatter = new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });

const chartConfigs = [
  { key: 'totalHairCollected', title: 'Hair collected monthly (kg)', color: '#2E7D32' },
  { key: 'activeShops', title: 'Active barber shops', color: '#4CAF50' },
  { key: 'revenue', title: 'Revenue trend', color: '#6D4C41' },
  { key: 'certificatesIssued', title: 'Certificate issuance trend', color: '#A5D6A7' }
];

function toMonthLabel(entry) {
  const date = new Date(Date.UTC(entry.year, entry.month - 1, 1));
  return monthFormatter.format(date);
}

export default function AnalyticsCharts() {
  const [analytics, setAnalytics] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function loadAnalytics() {
      try {
        setIsLoading(true);
        setError('');
        const response = await client.get('/analytics/trends');
        if (isMounted) setAnalytics(Array.isArray(response.data) ? response.data : []);
      } catch (_err) {
        if (isMounted) setError('Unable to load analytics data right now.');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadAnalytics();

    return () => {
      isMounted = false;
    };
  }, []);

  const labels = useMemo(() => analytics.map(toMonthLabel), [analytics]);

  const renderChart = ({ key, title, color }) => {
    const data = analytics.map((entry) => entry[key] ?? 0);
    const cfg = { label: title, data, borderColor: color, backgroundColor: color, tension: 0.3 };

    return (
      <div key={key} className="bg-white p-4 rounded-xl shadow">
        <h3 className="mb-2 font-medium">{title}</h3>
        <Line data={{ labels, datasets: [cfg] }} />
      </div>
    );
  };

  if (isLoading) return <div className="rounded-xl bg-white p-4 shadow">Loading analytics...</div>;
  if (error) return <div className="rounded-xl bg-white p-4 text-red-600 shadow">{error}</div>;
  if (!analytics.length) return <div className="rounded-xl bg-white p-4 shadow">No analytics data available yet.</div>;

  return <div className="grid gap-4 md:grid-cols-2">{chartConfigs.map(renderChart)}</div>;
}
