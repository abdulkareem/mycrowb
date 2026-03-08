import { Link } from 'react-router-dom';
import Layout from '../../components/layout/Layout';

export default function CertificatesPage() {
  return (
    <Layout title="Certificates">
      <section className="max-w-2xl rounded-xl bg-white p-6 shadow-sm">
        <p className="text-gray-700">View and download all recycling certificates.</p>
        <div className="mt-4 flex gap-2">
          <button className="rounded-md bg-primaryGreen px-3 py-2 text-sm text-white">Download latest certificate</button>
          <Link className="rounded-md border border-primaryGreen px-3 py-2 text-sm text-primaryGreen" to="/verify-certificate">Verify a certificate</Link>
        </div>
      </section>
    </Layout>
  );
}
