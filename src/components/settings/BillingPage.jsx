import { CreditCard, ExternalLink, AlertCircle } from 'lucide-react'
import React, { useState } from 'react'

export default function BillingPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const openPortal = async () => {
    try {
      setLoading(true)
      setError('')
      const res = await fetch('/api/checkout/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await res.json()
      if (data?.url) {
        window.location.href = data.url
      } else {
        setError(data?.error || 'Unable to open billing portal')
      }
    } catch (e) {
      setError('Unable to open billing portal')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="bg-white rounded-2xl p-8 border border-gray-200">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
            <CreditCard className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Billing</h1>
        </div>

        <p className="text-gray-600 mb-6">
          Manage your subscription, update payment methods, and view invoices.
        </p>

        {error && (
          <div className="flex items-center gap-2 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 mb-4">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        )}

        <button
          onClick={openPortal}
          disabled={loading}
          className={`inline-flex items-center gap-2 px-5 py-3 rounded-xl text-white font-semibold shadow-sm ${
            loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {loading ? 'Opening…' : 'Manage Billing'}
          <ExternalLink className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

