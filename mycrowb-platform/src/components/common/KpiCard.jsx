export default function KpiCard({ label, value }) {
  return <div className="bg-white rounded-xl shadow p-4"><p className="text-sm text-gray-500">{label}</p><p className="text-2xl font-semibold">{value}</p></div>;
}
