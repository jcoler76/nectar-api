import { useCallback, useEffect, useState } from 'react'
import { ChevronDown, Filter, Plus, User, Building, Calendar, TrendingUp } from 'lucide-react'

interface Contact {
  id: string
  name?: string
  email?: string
  company?: string
  leadScore?: number
  owner?: string
  updatedAt?: string
}

interface PipelineStage {
  status: string
  count: number
  contacts: Contact[]
}

const API_BASE: string = (
  (import.meta as unknown as { env?: { VITE_ADMIN_API_URL?: string } }).env?.VITE_ADMIN_API_URL ||
  'http://localhost:4001'
).trim()

const STAGE_CONFIG = {
  NEW: {
    label: 'New Leads',
    color: 'bg-blue-50 border-blue-200',
    headerColor: 'bg-blue-100 text-blue-800',
    cardColor: 'bg-blue-50 border-blue-200 hover:bg-blue-100'
  },
  QUALIFIED: {
    label: 'Qualified',
    color: 'bg-green-50 border-green-200',
    headerColor: 'bg-green-100 text-green-800',
    cardColor: 'bg-green-50 border-green-200 hover:bg-green-100'
  },
  NEGOTIATING: {
    label: 'Negotiating',
    color: 'bg-yellow-50 border-yellow-200',
    headerColor: 'bg-yellow-100 text-yellow-800',
    cardColor: 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100'
  },
  CONVERTED: {
    label: 'Converted',
    color: 'bg-emerald-50 border-emerald-200',
    headerColor: 'bg-emerald-100 text-emerald-800',
    cardColor: 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
  },
  LOST: {
    label: 'Lost',
    color: 'bg-red-50 border-red-200',
    headerColor: 'bg-red-100 text-red-800',
    cardColor: 'bg-red-50 border-red-200 hover:bg-red-100'
  },
}

interface PipelineViewProps {
  onViewLead?: (leadId: string) => void
  onEditLead?: (leadId: string) => void
}

export default function PipelineView({ onViewLead, onEditLead }: PipelineViewProps) {
  const [pipelineData, setPipelineData] = useState<PipelineStage[]>([])
  const [loading, setLoading] = useState(true)
  const [draggedContact, setDraggedContact] = useState<Contact | null>(null)
  const [dragOverStage, setDragOverStage] = useState<string | null>(null)

  // Filtering
  const [ownerFilter, setOwnerFilter] = useState<string>('')
  const [scoreFilter, setScoreFilter] = useState<string>('')
  const [showFilters, setShowFilters] = useState(false)

  const token = localStorage.getItem('admin_token')

  const loadPipelineData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/crm/pipeline`, {
        headers: { 'Authorization': `Bearer ${token}` },
      })
      const data = await res.json()
      if (data?.data) {
        setPipelineData(data.data)
      }
    } catch (error) {
      console.error('Failed to load pipeline data:', error)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    void loadPipelineData()
  }, [loadPipelineData])

  const updateContactStatus = async (contactId: string, newStatus: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/crm/contacts/${contactId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ lead_status: newStatus }),
      })

      if (res.ok) {
        await loadPipelineData() // Reload data to reflect changes
      }
    } catch (error) {
      console.error('Failed to update contact status:', error)
    }
  }

  const handleDragStart = (e: React.DragEvent, contact: Contact) => {
    setDraggedContact(contact)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, stage: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverStage(stage)
  }

  const handleDragLeave = () => {
    setDragOverStage(null)
  }

  const handleDrop = async (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault()
    setDragOverStage(null)

    if (draggedContact && draggedContact.id) {
      await updateContactStatus(draggedContact.id, targetStatus)
    }
    setDraggedContact(null)
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-red-600 bg-red-100'
    if (score >= 60) return 'text-yellow-600 bg-yellow-100'
    if (score >= 40) return 'text-blue-600 bg-blue-100'
    return 'text-gray-600 bg-gray-100'
  }

  const filteredPipelineData = pipelineData.map(stage => ({
    ...stage,
    contacts: stage.contacts.filter(contact => {
      if (ownerFilter && !contact.owner?.toLowerCase().includes(ownerFilter.toLowerCase())) {
        return false
      }
      if (scoreFilter) {
        const score = contact.leadScore || 0
        switch (scoreFilter) {
          case 'high': return score >= 80
          case 'medium': return score >= 40 && score < 80
          case 'low': return score < 40
          default: return true
        }
      }
      return true
    })
  }))

  const totalLeads = filteredPipelineData.reduce((sum, stage) => sum + stage.contacts.length, 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading pipeline...</span>
      </div>
    )
  }

  return (
    <div className="h-full">
      {/* Header */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-4 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Sales Pipeline</h2>
            <p className="text-sm text-gray-600">{totalLeads} total leads across {filteredPipelineData.length} stages</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-3 py-2 border rounded-md flex items-center gap-1 ${showFilters ? 'bg-blue-50 border-blue-300' : ''}`}
            >
              <Filter className="h-4 w-4" />
              Filters
              <ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="bg-gray-50 rounded-md p-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Owner</label>
                <input
                  value={ownerFilter}
                  onChange={e => setOwnerFilter(e.target.value)}
                  placeholder="Enter owner name"
                  className="w-full px-3 py-2 border rounded-md text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Score</label>
                <select
                  value={scoreFilter}
                  onChange={e => setScoreFilter(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md text-sm"
                >
                  <option value="">All Scores</option>
                  <option value="high">High (80+)</option>
                  <option value="medium">Medium (40-79)</option>
                  <option value="low">Low (&lt;40)</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { setOwnerFilter(''); setScoreFilter('') }}
                className="px-3 py-1 text-sm border rounded-md"
              >
                Clear Filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Pipeline Board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {filteredPipelineData.map(stage => {
          const config = STAGE_CONFIG[stage.status as keyof typeof STAGE_CONFIG]
          const isDragOver = dragOverStage === stage.status

          return (
            <div
              key={stage.status}
              className={`min-w-80 flex-shrink-0 ${config.color} rounded-lg border-2 transition-colors ${
                isDragOver ? 'border-blue-500 bg-blue-50' : ''
              }`}
              onDragOver={(e) => handleDragOver(e, stage.status)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, stage.status)}
            >
              {/* Stage Header */}
              <div className={`${config.headerColor} px-4 py-3 rounded-t-lg border-b`}>
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{config.label}</h3>
                  <span className="px-2 py-1 text-xs font-medium bg-white bg-opacity-60 rounded-full">
                    {stage.contacts.length}
                  </span>
                </div>
              </div>

              {/* Stage Content */}
              <div className="p-3 space-y-3 max-h-96 overflow-y-auto">
                {stage.contacts.length > 0 ? stage.contacts.map(contact => (
                  <div
                    key={contact.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, contact)}
                    className={`${config.cardColor} border rounded-lg p-3 cursor-move transition-colors`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-gray-900 text-sm">
                        {contact.name || 'Unnamed Lead'}
                      </h4>
                      {contact.leadScore !== undefined && (
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getScoreColor(contact.leadScore)}`}>
                          {contact.leadScore}
                        </span>
                      )}
                    </div>

                    <div className="space-y-1 text-xs text-gray-600">
                      {contact.email && (
                        <div className="flex items-center gap-1">
                          <span>✉</span>
                          <span className="truncate">{contact.email}</span>
                        </div>
                      )}
                      {contact.company && (
                        <div className="flex items-center gap-1">
                          <Building className="h-3 w-3" />
                          <span className="truncate">{contact.company}</span>
                        </div>
                      )}
                      {contact.owner && (
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          <span className="truncate">{contact.owner}</span>
                        </div>
                      )}
                      {contact.updatedAt && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>{new Date(contact.updatedAt).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-3 pt-2 border-t border-gray-200">
                      <button
                        onClick={() => onViewLead?.(contact.id)}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                      >
                        View
                      </button>
                      <button
                        onClick={() => onEditLead?.(contact.id)}
                        className="text-xs text-gray-600 hover:text-gray-800 font-medium"
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-8 text-gray-500">
                    <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-2">
                      <Plus className="h-6 w-6 text-gray-400" />
                    </div>
                    <p className="text-sm">No leads in this stage</p>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Pipeline Summary */}
      <div className="mt-6 bg-white rounded-lg shadow border border-gray-200 p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Pipeline Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {filteredPipelineData.map(stage => {
            const config = STAGE_CONFIG[stage.status as keyof typeof STAGE_CONFIG]
            const percentage = totalLeads > 0 ? Math.round((stage.contacts.length / totalLeads) * 100) : 0

            return (
              <div key={stage.status} className={`${config.color} rounded-lg p-3 border`}>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{stage.contacts.length}</div>
                  <div className="text-sm font-medium text-gray-700">{config.label}</div>
                  <div className="text-xs text-gray-500">{percentage}% of total</div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}