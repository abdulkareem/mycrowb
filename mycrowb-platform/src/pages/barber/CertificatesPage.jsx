import { useState } from 'react';
import { Link } from 'react-router-dom';
import client from '../../api/client';
import Layout from '../../components/layout/Layout';

export default function CertificatesPage() {
  const [message, setMessage] = useState('');

  const downloadLatestCertificate = async () => {
    setMessage('');
    try {
      const response = await client.get('/certificates/my/latest');
      const downloadUrl = `${client.defaults.baseURL.replace('/api/v1', '')}${response.data.pdfUrl}`;
      window.open(downloadUrl, '_blank', 'noopener,noreferrer');
      setMessage('Latest certificate downloaded.');
    } catch (_err) {
      setMessage('Unable to download certificate.');
    }
  };

  return (
    <Layout title="Certificates">
      <section className="max-w-2xl rounded-xl bg-white p-6 shadow-sm">
        <p className="text-gray-700">Download latest certificate PDF generated from database details with verification code.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button className="rounded-md bg-primaryGreen px-3 py-2 text-sm text-white" onClick={downloadLatestCertificate} type="button">
            Download latest certificate
          </button>
          <Link className="rounded-md border border-primaryGreen px-3 py-2 text-sm text-primaryGreen" to="/verify-certificate">Verify a certificate</Link>
          <Link className="rounded-md border border-primaryGreen px-3 py-2 text-sm text-primaryGreen" to="/barber/dashboard">Back</Link>
        </div>
        {message && <p className="mt-3 text-sm text-gray-700">{message}</p>}
      </section>
    </Layout>
  );
}
