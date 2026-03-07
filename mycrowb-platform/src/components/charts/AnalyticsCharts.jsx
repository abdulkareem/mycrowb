import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend } from 'chart.js';
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

export default function AnalyticsCharts() {
  const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May'];
  const cfg = (label, data, color) => ({ label, data, borderColor: color });
  return <div className="grid gap-4 md:grid-cols-2">{[
    ['Hair collected monthly', [500, 600, 700, 650, 800], '#2E7D32'],
    ['Active barber shops', [120, 140, 180, 210, 240], '#4CAF50'],
    ['Revenue trend', [45000, 49000, 52000, 60000, 67000], '#6D4C41'],
    ['Certificate issuance trend', [20, 24, 31, 45, 52], '#A5D6A7']
  ].map(([title, data, color]) => <div key={title} className="bg-white p-4 rounded-xl shadow"><h3 className="mb-2 font-medium">{title}</h3><Line data={{ labels, datasets: [cfg(title, data, color)] }} /></div>)}</div>;
}
