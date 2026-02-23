'use client';

import { useState } from 'react';
import { StashPay } from '@stashgg/stash-pay';

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [purchaseResult, setPurchaseResult] = useState<{ success: boolean; data?: Record<string, unknown> } | null>(null);
  const [cardWidth, setCardWidth] = useState<string>('');

  const generateCheckoutLink = async () => {
    setLoading(true);
    setError(null);
    setCheckoutUrl(null);

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}), // Uses default payload from API route
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate checkout link');
      }

      setCheckoutUrl(data.url);
      setIsModalOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handlePurchaseSuccess = (data?: Record<string, unknown>) => {
    setPurchaseResult({ success: true, data });
    console.log('Purchase successful:', data);
  };

  const handlePurchaseFailed = (data?: Record<string, unknown>) => {
    setPurchaseResult({ success: false, data });
    console.log('Purchase failed:', data);
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="max-w-2xl w-full space-y-6">
        <h1 className="text-4xl font-bold mb-4 text-center">Stash Checkout Web Component</h1>
        
        <div className="space-y-2">
          <label htmlFor="width" className="block text-sm font-medium text-gray-700">
            Card Width (optional)
          </label>
          <input
            id="width"
            type="text"
            value={cardWidth}
            onChange={(e) => setCardWidth(e.target.value)}
            placeholder="e.g., 500px, 80%, 50vw"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
          <p className="text-xs text-gray-500">Leave empty for default width</p>
        </div>

        <button
          onClick={generateCheckoutLink}
          disabled={loading}
          className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Generating...' : 'Generate Checkout Link'}
        </button>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            <p className="font-semibold">Error:</p>
            <p>{error}</p>
          </div>
        )}

        {purchaseResult && (
          <div
            className={`p-4 border rounded-lg ${
              purchaseResult.success
                ? 'bg-green-50 border-green-200 text-green-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            <p className="font-semibold">
              {purchaseResult.success ? '✓ Payment Successful' : '✗ Payment Failed'}
            </p>
            {purchaseResult.data && (
              <pre className="mt-2 text-xs overflow-auto">
                {JSON.stringify(purchaseResult.data, null, 2)}
              </pre>
            )}
          </div>
        )}
      </div>

      <StashPay
        isOpen={isModalOpen}
        checkoutUrl={checkoutUrl}
        onClose={handleCloseModal}
        onPurchaseSuccess={handlePurchaseSuccess}
        onPurchaseFailed={handlePurchaseFailed}
        width={cardWidth || undefined}
      />
    </main>
  );
}
