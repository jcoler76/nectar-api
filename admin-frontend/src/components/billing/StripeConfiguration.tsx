import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  EyeSlashIcon,
  CogIcon,
  LinkIcon,
  KeyIcon,
  GlobeAltIcon,
  DocumentTextIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'
import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'

interface StripeConfig {
  id?: string
  isLive: boolean
  publishableKey: string
  webhookSecret?: string
  defaultCurrency: string
  taxRateId?: string
  updatedBy?: string
  updatedAt?: string
  createdAt?: string
  webhookSecretConfigured?: boolean
}

interface StripeAccount {
  accountId: string
  country: string
  defaultCurrency: string
  chargesEnabled: boolean
  payoutsEnabled: boolean
  detailsSubmitted: boolean
}

interface WebhookEndpoint {
  id: string
  url: string
  status: string
  enabledEvents: string[]
  created: string
}

export default function StripeConfiguration() {
  const [config, setConfig] = useState<StripeConfig | null>(null)
  const [account, setAccount] = useState<StripeAccount | null>(null)
  const [webhooks, setWebhooks] = useState<WebhookEndpoint[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  // const [loadingWebhooks, setLoadingWebhooks] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  // Form states
  const [formData, setFormData] = useState<Partial<StripeConfig>>({
    isLive: false,
    publishableKey: '',
    webhookSecret: '',
    defaultCurrency: 'USD',
    taxRateId: ''
  })
  
  const [showWebhookSecret, setShowWebhookSecret] = useState(false)
  const [showPublishableKey, setShowPublishableKey] = useState(false)

  const loadConfiguration = useCallback(async () => {
    try {
      setError(null)
      const token = localStorage.getItem('admin_token')
      const response = await fetch('http://localhost:4001/api/stripe/config', {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.data) {
          setConfig(data.data)
          setFormData({
            isLive: data.data.isLive,
            publishableKey: data.data.publishableKey,
            webhookSecret: data.data.webhookSecret || '',
            defaultCurrency: data.data.defaultCurrency,
            taxRateId: data.data.taxRateId || ''
          })
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      setError(`Failed to load configuration: ${msg}`)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadConfiguration()
  }, [loadConfiguration])

  const loadWebhookEndpoints = useCallback(async () => {
    try {
      const token = localStorage.getItem('admin_token')
      const response = await fetch('http://localhost:4001/api/stripe/webhook-endpoints', {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        setWebhooks(data.data || [])
      }
    } catch (err: unknown) {
      console.error('Failed to load webhook endpoints:', err)
    }
  }, [])

  const testConnection = useCallback(async () => {
    try {
      setTesting(true)
      setError(null)
      const token = localStorage.getItem('admin_token')
      const response = await fetch('http://localhost:4001/api/stripe/test-connection', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      const data = await response.json()
      
      if (response.ok) {
        setAccount(data.data)
        void loadWebhookEndpoints()
      } else {
        setError(`Connection test failed: ${data.message}`)
        setAccount(null)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      setError(`Connection test failed: ${msg}`)
      setAccount(null)
    } finally {
      setTesting(false)
    }
  }, [loadWebhookEndpoints])

  const saveConfiguration = async () => {
    try {
      setSaving(true)
      setError(null)
      setSuccess(null)
      
      const token = localStorage.getItem('admin_token')
      const response = await fetch('http://localhost:4001/api/stripe/config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      })

      const data = await response.json()
      
      if (response.ok) {
        setConfig(data.data)
        setSuccess('Stripe configuration saved successfully!')
        // Test connection after saving
        setTimeout(() => testConnection(), 1000)
      } else {
        setError(`Failed to save configuration: ${data.error || data.message}`)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      setError(`Failed to save configuration: ${msg}`)
    } finally {
      setSaving(false)
    }
  }

  const handleInputChange = (field: keyof StripeConfig, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-64 bg-gray-200 rounded-lg animate-pulse" />
        <div className="h-48 bg-gray-200 rounded-lg animate-pulse" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Status Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md flex items-center gap-2">
          <ExclamationTriangleIcon className="h-5 w-5" />
          {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md flex items-center gap-2">
          <CheckCircleIcon className="h-5 w-5" />
          {success}
        </div>
      )}

      {/* Connection Status */}
      {account && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircleIcon className="h-5 w-5 text-green-500" />
              Stripe Connection Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <div className="flex items-center gap-2">
                  <GlobeAltIcon className="h-5 w-5 text-green-600" />
                  <span className="font-medium text-green-800">Account Details</span>
                </div>
                <div className="mt-2 text-sm text-green-700">
                  <p>ID: {account.accountId}</p>
                  <p>Country: {account.country}</p>
                  <p>Currency: {account.defaultCurrency}</p>
                </div>
              </div>
              
              <div className={`p-4 rounded-lg border ${account.chargesEnabled ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
                <div className="flex items-center gap-2">
                  <KeyIcon className={`h-5 w-5 ${account.chargesEnabled ? 'text-green-600' : 'text-yellow-600'}`} />
                  <span className={`font-medium ${account.chargesEnabled ? 'text-green-800' : 'text-yellow-800'}`}>
                    Charges
                  </span>
                </div>
                <div className={`mt-2 text-sm ${account.chargesEnabled ? 'text-green-700' : 'text-yellow-700'}`}>
                  {account.chargesEnabled ? 'Enabled' : 'Not Available'}
                </div>
              </div>
              
              <div className={`p-4 rounded-lg border ${account.payoutsEnabled ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
                <div className="flex items-center gap-2">
                  <LinkIcon className={`h-5 w-5 ${account.payoutsEnabled ? 'text-green-600' : 'text-yellow-600'}`} />
                  <span className={`font-medium ${account.payoutsEnabled ? 'text-green-800' : 'text-yellow-800'}`}>
                    Payouts
                  </span>
                </div>
                <div className={`mt-2 text-sm ${account.payoutsEnabled ? 'text-green-700' : 'text-yellow-700'}`}>
                  {account.payoutsEnabled ? 'Enabled' : 'Not Available'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Configuration Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CogIcon className="h-5 w-5" />
            Stripe Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Environment Toggle */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Environment</label>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="environment"
                  checked={!formData.isLive}
                  onChange={() => handleInputChange('isLive', false)}
                  className="text-blue-600"
                />
                <span className="text-sm">Test/Sandbox</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="environment"
                  checked={formData.isLive}
                  onChange={() => handleInputChange('isLive', true)}
                  className="text-blue-600"
                />
                <span className="text-sm">Live/Production</span>
              </label>
            </div>
          </div>

          {/* Publishable Key */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Publishable Key *
            </label>
            <div className="relative">
              <Input
                type={showPublishableKey ? 'text' : 'password'}
                value={formData.publishableKey || ''}
                onChange={(e) => handleInputChange('publishableKey', e.target.value)}
                placeholder={formData.isLive ? 'pk_live_...' : 'pk_test_...'}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPublishableKey(!showPublishableKey)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPublishableKey ? (
                  <EyeSlashIcon className="h-5 w-5" />
                ) : (
                  <EyeIcon className="h-5 w-5" />
                )}
              </button>
            </div>
            <p className="text-xs text-gray-500">
              This key is safe to use in your client-side code (marketing site)
            </p>
          </div>

          {/* Webhook Secret */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Webhook Secret
            </label>
            <div className="relative">
              <Input
                type={showWebhookSecret ? 'text' : 'password'}
                value={formData.webhookSecret || ''}
                onChange={(e) => handleInputChange('webhookSecret', e.target.value)}
                placeholder="whsec_..."
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowWebhookSecret(!showWebhookSecret)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showWebhookSecret ? (
                  <EyeSlashIcon className="h-5 w-5" />
                ) : (
                  <EyeIcon className="h-5 w-5" />
                )}
              </button>
            </div>
            <p className="text-xs text-gray-500">
              Used to verify webhook signatures from Stripe
            </p>
          </div>

          {/* Default Currency */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Default Currency
            </label>
            <select
              value={formData.defaultCurrency || 'USD'}
              onChange={(e) => handleInputChange('defaultCurrency', e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="USD">USD - US Dollar</option>
              <option value="EUR">EUR - Euro</option>
              <option value="GBP">GBP - British Pound</option>
              <option value="CAD">CAD - Canadian Dollar</option>
              <option value="AUD">AUD - Australian Dollar</option>
            </select>
          </div>

          {/* Tax Rate ID */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Tax Rate ID (Optional)
            </label>
            <Input
              type="text"
              value={formData.taxRateId || ''}
              onChange={(e) => handleInputChange('taxRateId', e.target.value)}
              placeholder="txr_..."
            />
            <p className="text-xs text-gray-500">
              Stripe tax rate ID to apply to subscriptions
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <Button
              onClick={saveConfiguration}
              disabled={saving || !formData.publishableKey}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {saving ? (
                <>
                  <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Configuration'
              )}
            </Button>
            
            {formData.publishableKey && (
              <Button
                onClick={testConnection}
                disabled={testing}
                variant="outline"
              >
                {testing ? (
                  <>
                    <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
                    Testing...
                  </>
                ) : (
                  'Test Connection'
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Webhook Endpoints */}
      {webhooks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LinkIcon className="h-5 w-5" />
              Configured Webhooks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {webhooks.map((webhook) => (
                <div key={webhook.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <DocumentTextIcon className="h-4 w-4 text-gray-500" />
                        <span className="font-medium text-sm">{webhook.url}</span>
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          webhook.status === 'enabled' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {webhook.status}
                        </span>
                      </div>
                      <div className="mt-2">
                        <p className="text-xs text-gray-500">
                          Events: {webhook.enabledEvents.slice(0, 3).join(', ')}
                          {webhook.enabledEvents.length > 3 && ` +${webhook.enabledEvents.length - 3} more`}
                        </p>
                        <p className="text-xs text-gray-500">
                          Created: {new Date(webhook.created).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Setup Instructions */}
      {!config && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DocumentTextIcon className="h-5 w-5" />
              Setup Instructions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none">
              <ol className="space-y-4">
                <li>
                  <strong>Get your Stripe keys:</strong>
                  <ul className="ml-4 mt-1 space-y-1">
                    <li>• Go to your <a href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">Stripe Dashboard → API Keys</a></li>
                    <li>• Copy your Publishable Key (starts with pk_test_ or pk_live_)</li>
                    <li>• Note: Secret key is configured via environment variables</li>
                  </ul>
                </li>
                <li>
                  <strong>Set up webhooks:</strong>
                  <ul className="ml-4 mt-1 space-y-1">
                    <li>• Go to <a href="https://dashboard.stripe.com/webhooks" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">Stripe Dashboard → Webhooks</a></li>
                    <li>• Add endpoint: <code className="bg-gray-100 px-1 rounded">https://yourdomain.com/api/webhooks/stripe</code></li>
                    <li>• Select events: customer.subscription.*, invoice.payment_*</li>
                    <li>• Copy the webhook signing secret (starts with whsec_)</li>
                  </ul>
                </li>
                <li>
                  <strong>Environment variables:</strong>
                  <ul className="ml-4 mt-1 space-y-1">
                    <li>• Add STRIPE_SECRET_KEY to your backend .env file</li>
                    <li>• Ensure DATABASE_URL is configured for subscription storage</li>
                  </ul>
                </li>
              </ol>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
