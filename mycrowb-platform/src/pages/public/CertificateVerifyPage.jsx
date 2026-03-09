import { useState } from 'react';
import { Link } from 'react-router-dom';
import client from '../../api/client';
import Layout from '../../components/layout/Layout';

export default function CertificateVerifyPage() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const verifyCertificate = async (event) => {
    event.preventDefault();
    if (!code.trim()) return;

    setLoading(true);
    setError('');
    setResult(null);
    try {
      const response = await client.get(`/certificates/verify/${code.trim()}`);
      setResult(response.data);
    } catch (_err) {
      setError('Certificate not verified. Please check the code and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout title="Certificate Verification">
      <section className="max-w-2xl rounded-xl bg-white p-6 shadow-sm">
        <form className="grid gap-3" onSubmit={verifyCertificate}>
          <input
            value={code}
            onChange={(event) => setCode(event.target.value)}
            className="rounded-md border border-gray-300 p-2"
            placeholder="Enter certificate code"
          />
          <div className="flex gap-2">
            <button className="rounded-md bg-primaryGreen px-3 py-2 text-white" type="submit" disabled={loading}>
              {loading ? 'Verifying...' : 'Verify'}
            </button>
            <Link to="/" className="rounded-md border border-primaryGreen px-3 py-2 text-primaryGreen">Back</Link>
          </div>
        </form>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        {result?.valid && (
          <div className="mt-5 rounded-md border border-green-200 bg-green-50 p-4 text-sm text-gray-700">
            <p className="font-semibold text-green-700">Certificate verified ✅</p>
            <p className="mt-2"><strong>Shop:</strong> {result.shop.shopName}</p>
            <p><strong>Owner:</strong> {result.shop.ownerName || 'N/A'}</p>
            <p><strong>Mobile:</strong> {result.shop.mobile || 'N/A'}</p>
            <p><strong>Address:</strong> {result.shop.address}</p>
            <a className="mt-2 inline-block text-primaryGreen underline" href={result.shop.location.mapUrl} target="_blank" rel="noreferrer">
              View location on map
            </a>
          </div>
        )}
      </section>
    </Layout>
  );
}
