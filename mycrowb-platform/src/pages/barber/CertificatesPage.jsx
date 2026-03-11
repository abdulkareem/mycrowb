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
      const downloadUrl = `${client.defaults.baseURL.replace('/api/v1', '')}/api/v1/certificates/my/latest/download`;
      const token = localStorage.getItem('token');
      const pdfResponse = await fetch(downloadUrl, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      if (!pdfResponse.ok) {
        throw new Error('Certificate download failed');
      }

      const pdfBlob = await pdfResponse.blob();
      const blobUrl = window.URL.createObjectURL(pdfBlob);
      const anchor = document.createElement('a');
      anchor.href = blobUrl;
      anchor.download = `mycrowb-certificate-${response.data.certificateCode}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(blobUrl);

      setMessage('Certificate generated and downloaded successfully.');
    } catch (err) {
      if (err?.response?.status === 401) {
        setMessage('Session expired or unauthorized. Please log in with a barber account and try again.');
        return;
      }
      if (err?.response?.status === 404) {
        setMessage(err.response.data?.message || 'No certificate has been issued yet.');
        return;
      }
      setMessage('Unable to download certificate. Please try again.');
    }
  };

  return (
    <Layout title="Certificates">
      <section className="max-w-2xl rounded-xl bg-white p-6 shadow-sm">
        <p className="text-gray-700">Generate and download the latest certificate PDF from stored certificate data.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button className="rounded-md bg-primaryGreen px-3 py-2 text-sm text-white" onClick={downloadLatestCertificate} type="button">
            Download latest certificate
          </button>
          <Link className="rounded-md border border-primaryGreen px-3 py-2 text-sm text-primaryGreen" to="/barber/dashboard">Back</Link>
        </div>
        {message && <p className="mt-3 text-sm text-gray-700">{message}</p>}
      </section>
    </Layout>
  );
}
