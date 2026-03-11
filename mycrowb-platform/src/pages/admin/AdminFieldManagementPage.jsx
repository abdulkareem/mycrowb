import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/layout/Layout';
import { getAdminFieldCatalog, saveAdminFieldCatalog } from '../../utils/adminFieldCatalog';

export default function AdminFieldManagementPage() {
  const navigate = useNavigate();
  const initialCatalog = useMemo(() => getAdminFieldCatalog(), []);
  const [catalog, setCatalog] = useState(initialCatalog);
  const [draft, setDraft] = useState({ clusters: '', districts: '', states: '' });

  const addField = (field) => {
    const value = draft[field].trim();
    if (!value) return;
    const next = saveAdminFieldCatalog({ ...catalog, [field]: [...catalog[field], value] });
    setCatalog(next);
    setDraft((prev) => ({ ...prev, [field]: '' }));
  };

  const removeField = (field, value) => {
    const next = saveAdminFieldCatalog({ ...catalog, [field]: catalog[field].filter((item) => item !== value) });
    setCatalog(next);
  };

  const labels = {
    clusters: 'Cluster',
    districts: 'District',
    states: 'State'
  };

  return (
    <Layout title="Manage Fields">
      <section className="rounded-xl bg-white p-6 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-gray-700">Add reusable cluster, district, and state values for admin filters.</p>
          <button type="button" onClick={() => navigate('/admin/overview')} className="rounded border border-gray-300 px-3 py-1.5 text-sm">Back</button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {Object.keys(labels).map((field) => (
            <div key={field} className="rounded-md border border-gray-200 p-3">
              <h3 className="text-sm font-semibold text-gray-800">{labels[field]}</h3>
              <div className="mt-2 flex gap-2">
                <input value={draft[field]} onChange={(event) => setDraft((prev) => ({ ...prev, [field]: event.target.value }))} className="w-full rounded border border-gray-300 px-2 py-1 text-sm" placeholder={`Add ${labels[field]}`} />
                <button type="button" onClick={() => addField(field)} className="rounded border border-primaryGreen px-3 py-1 text-xs font-medium text-primaryGreen">Add</button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {catalog[field].map((item) => (
                  <button key={item} type="button" onClick={() => removeField(field, item)} className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-700">
                    {item} ×
                  </button>
                ))}
                {!catalog[field].length && <p className="text-xs text-gray-500">No values added yet.</p>}
              </div>
            </div>
          ))}
        </div>
      </section>
    </Layout>
  );
}
