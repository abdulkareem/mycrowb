import { useNavigate } from 'react-router-dom';
import Layout from '../../components/layout/Layout';

export default function AboutPage() {
  const navigate = useNavigate();

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate('/');
  };

  return (
    <Layout title="About Mycrowb" showLogout={false}>
      <button
        type="button"
        onClick={handleBack}
        className="mb-4 rounded-md border border-primaryGreen px-4 py-2 text-sm font-medium text-primaryGreen hover:bg-lightGreen/30"
      >
        ← Back
      </button>
      <p>MYCROWB YOUR ECO FRIEND LLP converts salon hair waste into circular economy eco-products.</p>
    </Layout>
  );
}
