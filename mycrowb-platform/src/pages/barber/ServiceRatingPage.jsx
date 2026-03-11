import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import client from '../../api/client';
import Layout from '../../components/layout/Layout';

export default function ServiceRatingPage() {
  const [collections, setCollections] = useState([]);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    client.get('/collections/my').then((res) => setCollections(res.data || [])).catch(() => setCollections([]));
  }, []);

  const latestCollected = useMemo(
    () => collections.find((item) => item.collected && item.collectorId),
    [collections]
  );

  const handleSubmit = async () => {
    setMessage('');
    if (!latestCollected?.collectorId || !latestCollected?.shopId) {
      setMessage('No completed collection found yet. Submit rating after your first collection.');
      return;
    }

    try {
      await client.post('/ratings', {
        shopId: latestCollected.shopId,
        collectorId: latestCollected.collectorId,
        rating: Number(rating),
        comment: comment.trim()
      });
      setComment('');
      setRating(5);
      setMessage('Rating submitted successfully and shared with admin dashboard.');
    } catch (_error) {
      setMessage('Unable to submit rating. Please try again.');
    }
  };

  return (
    <Layout title="Service Rating">
      <section className="max-w-2xl rounded-xl bg-white p-6 shadow-sm">
        <p className="text-gray-700">Rate the latest collection service to help improve operations.</p>
        <label className="mt-3 block text-sm text-gray-700" htmlFor="rating-input">Rating (1-5)</label>
        <input
          id="rating-input"
          className="mt-1 w-32 rounded-md border border-gray-300 p-2"
          type="number"
          min="1"
          max="5"
          value={rating}
          onChange={(event) => setRating(Math.max(1, Math.min(5, Number(event.target.value) || 1)))}
        />
        <textarea
          className="mt-3 w-full rounded-md border border-gray-300 p-2"
          placeholder="Share your feedback"
          rows={4}
          value={comment}
          onChange={(event) => setComment(event.target.value)}
        ></textarea>
        <button className="mt-3 rounded-md bg-primaryGreen px-3 py-2 text-sm text-white" type="button" onClick={handleSubmit}>Submit rating</button>
        {message && <p className="mt-3 text-sm text-gray-700">{message}</p>}
        <Link to="/barber/dashboard" className="mt-4 block text-sm font-medium text-primaryGreen">← Back</Link>
      </section>
    </Layout>
  );
}
