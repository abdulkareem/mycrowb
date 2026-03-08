import Layout from '../../components/layout/Layout';

export default function PaymentConfirmPage() {
  return (
    <Layout title="Payment Confirmation">
      <form className="max-w-2xl rounded-xl bg-white p-6 shadow-sm grid gap-3">
        <p className="text-gray-700">Confirm payment handover and trigger receipt generation.</p>
        <input className="rounded-md border border-gray-300 p-2" placeholder="Shop name" defaultValue="Green Cut" />
        <input className="rounded-md border border-gray-300 p-2" placeholder="Paid amount" />
        <button className="rounded-md bg-primaryGreen p-2 text-white" type="button">Confirm payment & generate receipt</button>
      </form>
    </Layout>
  );
}
