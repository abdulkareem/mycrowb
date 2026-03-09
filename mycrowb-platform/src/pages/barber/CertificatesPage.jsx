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
      const pdfResponse = await fetch(downloadUrl);
      if (!pdfResponse.ok) {
        throw new Error('PDF download failed');
      }
      const pdfBlob = await pdfResponse.blob();
      const blobUrl = window.URL.createObjectURL(pdfBlob);

      const pdfWindow = window.open(blobUrl, '_blank', 'noopener,noreferrer');

      if (!pdfWindow) {
        const anchor = document.createElement('a');
        anchor.href = blobUrl;
        anchor.download = `mycrowb-certificate-${response.data.certificateCode}.pdf`;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
      }

      window.URL.revokeObjectURL(blobUrl);
      if (response.data.isPlaceholder) {
        setMessage(response.data.message || 'Blank certificate downloaded.');
      } else {
        setMessage('Latest certificate opened in a new tab.');
      }
    } catch (err) {
      if (err?.response?.status === 401) {
        setMessage('Session expired or unauthorized. Please log in with a barber account and try again.');
        return;
      }
      setMessage('Unable to download certificate. Please try again.');
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
          <Link className="rounded-md border border-primaryGreen px-3 py-2 text-sm text-primaryGreen" to="/barber/dashboard">Back</Link>
        </div>
        {message && <p className="mt-3 text-sm text-gray-700">{message}</p>}
      </section>
    </Layout>
  );
}
