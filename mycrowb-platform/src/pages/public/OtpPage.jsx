import Layout from '../../components/layout/Layout';

export default function OtpPage() {
  return (
    <Layout title="OTP Verification">
      <form className='grid gap-3 max-w-md'><input className='p-2 border rounded' placeholder='Enter OTP' /><button className='bg-primaryGreen text-white rounded p-2'>Verify</button></form>
    </Layout>
  );
}
