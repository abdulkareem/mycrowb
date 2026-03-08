import Layout from '../../components/layout/Layout';

export default function CsvUploadPage() {
  return (
    <Layout title="CSV Upload">
      <section className="max-w-2xl rounded-xl bg-white p-6 shadow-sm">
        <p className="text-gray-700">Bulk onboarding for 10,000+ shops across cities.</p>
        <input className="mt-4 w-full rounded-md border border-gray-300 p-2" type="file" accept=".csv" />
        <button className="mt-3 rounded-md bg-primaryGreen px-3 py-2 text-sm text-white" type="button">Upload and process</button>
      </section>
    </Layout>
  );
}
