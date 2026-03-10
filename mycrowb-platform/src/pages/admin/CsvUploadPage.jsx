import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../../api/client';
import Layout from '../../components/layout/Layout';

const csvColumns = [
  { key: 'mobile', required: true, description: 'Owner mobile number (used as unique barber account id).' },
  { key: 'ownerName', required: true, description: 'Owner full name.' },
  { key: 'shopName', required: true, description: 'Shop display name.' },
  { key: 'address', required: true, description: 'Full shop address.' },
  { key: 'district', required: false, description: 'District name (or use city if district is unavailable).' },
  { key: 'city', required: false, description: 'Fallback district value when district is not provided.' },
  { key: 'state', required: true, description: 'State name.' },
  { key: 'latitude', required: true, description: 'Latitude in decimal format (example: 11.2588).' },
  { key: 'longitude', required: true, description: 'Longitude in decimal format (example: 75.7804).' },
  { key: 'roomNumber', required: false, description: 'Room number of the shop.' },
  { key: 'buildingNumber', required: false, description: 'Building number of the shop.' },
  { key: 'place', required: false, description: 'Place/area name of the shop location.' }
];

export default function CsvUploadPage() {
  const navigate = useNavigate();
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleUpload = async () => {
    if (!selectedFile) {
      setErrorMessage('Please select a CSV file before uploading.');
      setSuccessMessage('');
      return;
    }

    try {
      setIsUploading(true);
      setErrorMessage('');
      setSuccessMessage('');

      const formData = new FormData();
      formData.append('file', selectedFile);
      const response = await client.post('/shops/upload-csv', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const { imported, total } = response.data;
      setSuccessMessage(`Upload successful. ${imported} of ${total} rows were processed.`);
      setSelectedFile(null);
    } catch (error) {
      setErrorMessage(error.response?.data?.message || 'Upload failed. Please check your CSV format and try again.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Layout title="CSV Upload">
      <section className="max-w-3xl rounded-xl bg-white p-6 shadow-sm">
        <p className="text-gray-700">Bulk onboarding for shops across cities using a single CSV file. During upload, both mobile and ownerName are mandatory.</p>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700"
            onClick={() => navigate('/admin/overview')}
            type="button"
          >
            Back
          </button>
          <button
            className="rounded-md bg-primaryGreen px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:bg-green-300"
            disabled={isUploading}
            onClick={handleUpload}
            type="button"
          >
            {isUploading ? 'Uploading...' : 'Upload and process'}
          </button>
        </div>

        <input
          className="mt-4 w-full rounded-md border border-gray-300 p-2"
          type="file"
          accept=".csv"
          onChange={(event) => {
            const file = event.target.files?.[0] || null;
            setSelectedFile(file);
            setErrorMessage('');
            setSuccessMessage('');
          }}
        />

        {selectedFile && <p className="mt-2 text-sm text-gray-600">Selected file: {selectedFile.name}</p>}
        {successMessage && <p className="mt-3 rounded-md bg-green-50 p-2 text-sm text-green-700">{successMessage}</p>}
        {errorMessage && <p className="mt-3 rounded-md bg-red-50 p-2 text-sm text-red-700">{errorMessage}</p>}

        <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
          <h2 className="text-sm font-semibold text-gray-900">CSV column instructions</h2>
          <p className="mt-1 text-sm text-gray-600">Use the exact header names below in your CSV file.</p>
          <ul className="mt-3 space-y-2 text-sm text-gray-700">
            {csvColumns.map((column) => (
              <li key={column.key}>
                <span className="font-semibold">{column.key}</span>
                <span className="ml-2 rounded bg-gray-200 px-2 py-0.5 text-xs uppercase text-gray-700">
                  {column.required ? 'Required' : 'Optional'}
                </span>
                <p className="mt-1 text-gray-600">{column.description}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </Layout>
  );
}
