import Layout from '../../components/layout/Layout';

export default function CertificateVerifyPage() {
  return (
    <Layout title="Certificate Verification">
      <input className='p-2 border rounded w-full max-w-md' placeholder='Certificate code' />
    </Layout>
  );
}
