import React, { useState, useEffect } from 'react'
import { supabase } from '../../services/supabaseClient'

const leaveTypes = [
  { value: 'Casual Leave', label: 'Casual Leave', icon: '🏖️', balance: 12, color: '#10b981' },
  { value: 'Sick Leave', label: 'Sick Leave', icon: '🤒', balance: 7, color: '#ef4444' },
  { value: 'Paid Leave', label: 'Paid Leave', icon: '✈️', balance: 21, color: '#3b82f6' },
  { value: 'Unpaid Leave', label: 'Unpaid Leave', icon: '⏸️', balance: 'Unlimited', color: '#6b7280' },
  { value: 'Other', label: 'Other', icon: '📋', balance: 0, color: '#8b5cf6' }
]

const LeaveRequest = ({ employeeId }) => {
  const [form, setForm] = useState({
    leave_type: '',
    start_date: '',
    end_date: '',
    reason: ''
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('')
  const [requests, setRequests] = useState([])
  const [leaveBalance, setLeaveBalance] = useState({})
  const [leaveCalendar, setLeaveCalendar] = useState([])
  const [activeTab, setActiveTab] = useState('request')

  useEffect(() => {
    fetchRequests()
    fetchLeaveBalance()
    fetchLeaveCalendar()
  }, [employeeId])

  const fetchRequests = async () => {
    const { data } = await supabase
      .from('leave_requests')
      .select('*')
      .eq('employee_id', employeeId)
      .order('created_at', { ascending: false })
      .limit(10)
    setRequests(data || [])
  }

  const fetchLeaveBalance = async () => {
    const { data } = await supabase
      .from('leave_requests')
      .select('leave_type, start_date, end_date')
      .eq('employee_id', employeeId)
      .eq('status', 'approved')

    const usedLeaves = {}
    data?.forEach(leave => {
      const days = calculateLeaveDays(leave.start_date, leave.end_date)
      usedLeaves[leave.leave_type] = (usedLeaves[leave.leave_type] || 0) + days
    })

    const balance = {}
    leaveTypes.forEach(type => {
      if (typeof type.balance === 'number') {
        balance[type.value] = Math.max(0, type.balance - (usedLeaves[type.value] || 0))
      } else {
        balance[type.value] = type.balance
      }
    })

    setLeaveBalance(balance)
  }

  const fetchLeaveCalendar = async () => {
    const currentYear = new Date().getFullYear()
    const { data } = await supabase
      .from('leave_requests')
      .select('*')
      .eq('employee_id', employeeId)
      .gte('start_date', `${currentYear}-01-01`)
      .lte('end_date', `${currentYear}-12-31`)
      .order('start_date', { ascending: true })

    setLeaveCalendar(data || [])
  }

  const calculateLeaveDays = (startDate, endDate) => {
    const start = new Date(startDate)
    const end = new Date(endDate)
    const diffTime = Math.abs(end - start)
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
    return diffDays
  }

  const handleChange = e => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async e => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      if (!form.leave_type || !form.start_date || !form.end_date) {
        throw new Error('All fields are required')
      }

      const days = calculateLeaveDays(form.start_date, form.end_date)
      const selectedType = leaveTypes.find(t => t.value === form.leave_type)
      
      if (selectedType && typeof selectedType.balance === 'number') {
        if (days > leaveBalance[form.leave_type]) {
          throw new Error(`Insufficient leave balance. You have ${leaveBalance[form.leave_type]} days remaining.`)
        }
      }

      await supabase.from('leave_requests').insert([{
        employee_id: employeeId,
        leave_type: form.leave_type,
        start_date: form.start_date,
        end_date: form.end_date,
        reason: form.reason,
        status: 'pending'
      }])

      setMessage('✅ Leave request submitted successfully!')
      setMessageType('success')
      setForm({ leave_type: '', start_date: '', end_date: '', reason: '' })
      fetchRequests()
      fetchLeaveBalance()
    } catch (err) {
      setMessage('❌ ' + err.message)
      setMessageType('error')
    } finally {
      setLoading(false)
    }
  }

  const cancelRequest = async (requestId) => {
    if (!window.confirm('Are you sure you want to cancel this leave request?')) return

    try {
      await supabase
        .from('leave_requests')
        .delete()
        .eq('id', requestId)
        .eq('employee_id', employeeId)
        .eq('status', 'pending')

      setMessage('✅ Leave request cancelled successfully!')
      setMessageType('success')
      fetchRequests()
      fetchLeaveBalance()
    } catch (error) {
      setMessage('❌ Error cancelling request: ' + error.message)
      setMessageType('error')
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { icon: '⏳', class: 'status-warning', label: 'Pending' },
      approved: { icon: '✅', class: 'status-success', label: 'Approved' },
      rejected: { icon: '❌', class: 'status-danger', label: 'Rejected' }
    }
    return statusConfig[status] || { icon: '📋', class: 'status-secondary', label: status }
  }

  const getLeaveTypeConfig = (leaveType) => {
    return leaveTypes.find(t => t.value === leaveType) || leaveTypes[4]
  }

  return (
    <div className="leave-request-enhanced">
      {/* Header */}
      <div className="page-header-gradient">
        <div className="header-content-flex">
          <div className="header-text-section">
            <h1>🏖️ Leave Management</h1>
            <p>Request time off and manage your leave balance</p>
          </div>
        </div>
      </div>

      {/* Alert Message */}
      {message && (
        <div className={`alert-banner ${messageType}`}>
          <span>{message}</span>
          <button onClick={() => setMessage('')} className="alert-close">✕</button>
        </div>
      )}

      {/* Leave Balance Cards */}
      <div className="balance-cards-grid">
        {leaveTypes.map(type => {
          const remaining = leaveBalance[type.value]
          const total = type.balance
          const percentage = typeof total === 'number' && typeof remaining === 'number' 
            ? (remaining / total) * 100 
            : 100

          return (
            <div key={type.value} className="balance-card-enhanced" style={{ borderLeftColor: type.color }}>
              <div className="balance-header">
                <span className="balance-icon">{type.icon}</span>
                <span className="balance-type-name">{type.label}</span>
              </div>
              <div className="balance-stats">
                <div className="balance-remaining">
                  {typeof remaining === 'number' ? `${remaining}` : remaining || total}
                </div>
                <div className="balance-label">
                  {typeof remaining === 'number' ? 'days remaining' : 'available'}
                </div>
              </div>
              {typeof total === 'number' && (
                <div className="balance-progress">
                  <div className="progress-track-mini">
                    <div 
                      className="progress-fill-mini" 
                      style={{ 
                        width: `${percentage}%`,
                        backgroundColor: type.color 
                      }}
                    ></div>
                  </div>
                  <div className="balance-total-text">of {total} days</div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Tabs */}
      <div className="tabs-modern">
        <button 
          className={`tab-button ${activeTab === 'request' ? 'active' : ''}`}
          onClick={() => setActiveTab('request')}
        >
          <span className="tab-icon">➕</span>
          <span>New Request</span>
        </button>
        <button 
          className={`tab-button ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          <span className="tab-icon">📋</span>
          <span>My Requests</span>
        </button>
        <button 
          className={`tab-button ${activeTab === 'calendar' ? 'active' : ''}`}
          onClick={() => setActiveTab('calendar')}
        >
          <span className="tab-icon">📅</span>
          <span>Calendar</span>
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content-modern">
        {/* New Request Tab */}
        {activeTab === 'request' && (
          <div className="content-card-modern">
            <div className="card-title-section">
              <h3>➕ Submit New Leave Request</h3>
              <p className="card-subtitle">Fill in the details for your leave application</p>
            </div>
            <form onSubmit={handleSubmit} className="leave-form-enhanced">
              <div className="form-row-enhanced">
                <div className="form-field-enhanced">
                  <label>Leave Type *</label>
                  <select 
                    name="leave_type" 
                    value={form.leave_type} 
                    onChange={handleChange} 
                    required
                  >
                    <option value="">Select leave type</option>
                    {leaveTypes.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.icon} {type.label} ({typeof leaveBalance[type.value] === 'number' ? 
                          `${leaveBalance[type.value]} days left` : 
                          leaveBalance[type.value] || `${type.balance} available`})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row-enhanced">
                <div className="form-field-enhanced">
                  <label>Start Date *</label>
                  <input 
                    type="date" 
                    name="start_date" 
                    value={form.start_date} 
                    onChange={handleChange}
                    min={new Date().toISOString().split('T')[0]}
                    required 
                  />
                </div>

                <div className="form-field-enhanced">
                  <label>End Date *</label>
                  <input 
                    type="date" 
                    name="end_date" 
                    value={form.end_date} 
                    onChange={handleChange}
                    min={form.start_date || new Date().toISOString().split('T')[0]}
                    required 
                  />
                </div>
              </div>

              {form.start_date && form.end_date && (
                <div className="duration-display">
                  <span className="duration-icon">📅</span>
                  <span className="duration-text">
                    Duration: <strong>{calculateLeaveDays(form.start_date, form.end_date)} day(s)</strong>
                  </span>
                </div>
              )}

              <div className="form-row-enhanced">
                <div className="form-field-enhanced full">
                  <label>Reason (Optional)</label>
                  <textarea 
                    name="reason" 
                    value={form.reason} 
                    onChange={handleChange}
                    placeholder="Briefly explain the reason for your leave"
                    rows="4"
                  />
                </div>
              </div>

              <div className="form-actions-enhanced">
                <button 
                  type="submit" 
                  className="btn-submit-leave" 
                  disabled={loading}
                >
                  {loading ? '⏳ Submitting...' : '📤 Submit Request'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="content-card-modern">
            <div className="card-title-section">
              <h3>📋 My Leave Requests</h3>
              <span className="badge-count">{requests.length} request{requests.length !== 1 ? 's' : ''}</span>
            </div>
            
            {requests.length > 0 ? (
              <div className="requests-list-enhanced">
                {requests.map(request => {
                  const statusInfo = getStatusBadge(request.status)
                  const typeConfig = getLeaveTypeConfig(request.leave_type)
                  
                  return (
                    <div key={request.id} className="request-card-modern">
                      <div className="request-card-header">
                        <div className="request-type-badge" style={{ backgroundColor: typeConfig.color }}>
                          {typeConfig.icon} {request.leave_type}
                        </div>
                        <div className={`request-status-badge ${statusInfo.class}`}>
                          {statusInfo.icon} {statusInfo.label}
                        </div>
                      </div>
                      
                      <div className="request-card-body">
                        <div className="request-dates-section">
                          <div className="date-block">
                            <span className="date-label">From</span>
                            <span className="date-value">{formatDate(request.start_date)}</span>
                          </div>
                          <div className="date-arrow">→</div>
                          <div className="date-block">
                            <span className="date-label">To</span>
                            <span className="date-value">{formatDate(request.end_date)}</span>
                          </div>
                          <div className="date-duration">
                            <span className="duration-badge">
                              {calculateLeaveDays(request.start_date, request.end_date)} day(s)
                            </span>
                          </div>
                        </div>

                        {request.reason && (
                          <div className="request-reason-section">
                            <span className="reason-label">Reason:</span>
                            <span className="reason-text">{request.reason}</span>
                          </div>
                        )}
                      </div>

                      <div className="request-card-footer">
                        <div className="request-meta-info">
                          <span className="meta-label">Applied:</span>
                          <span className="meta-value">{formatDate(request.created_at)}</span>
                        </div>
                        {request.status === 'pending' && (
                          <button 
                            onClick={() => cancelRequest(request.id)}
                            className="btn-cancel-request"
                          >
                            🗑️ Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="empty-state-modern">
                <div className="empty-icon-large">📝</div>
                <h4>No Leave Requests</h4>
                <p>You haven't submitted any leave requests yet</p>
              </div>
            )}
          </div>
        )}

        {/* Calendar Tab */}
        {activeTab === 'calendar' && (
          <div className="content-card-modern">
            <div className="card-title-section">
              <h3>📅 Leave Calendar {new Date().getFullYear()}</h3>
              <p className="card-subtitle">Overview of your leaves this year</p>
            </div>
            
            {leaveCalendar.length > 0 ? (
              <div className="calendar-timeline-modern">
                {leaveCalendar.map(leave => {
                  const statusInfo = getStatusBadge(leave.status)
                  const typeConfig = getLeaveTypeConfig(leave.leave_type)
                  
                  return (
                    <div key={leave.id} className="timeline-item-modern">
                      <div className="timeline-marker-modern" style={{ backgroundColor: typeConfig.color }}></div>
                      <div className="timeline-content-modern">
                        <div className="timeline-header-row">
                          <div className="timeline-type-badge" style={{ backgroundColor: typeConfig.color }}>
                            {typeConfig.icon} {leave.leave_type}
                          </div>
                          <div className={`timeline-status ${statusInfo.class}`}>
                            {statusInfo.icon} {statusInfo.label}
                          </div>
                        </div>
                        <div className="timeline-date-range">
                          {formatDate(leave.start_date)} → {formatDate(leave.end_date)}
                          <span className="timeline-days">
                            ({calculateLeaveDays(leave.start_date, leave.end_date)} day{calculateLeaveDays(leave.start_date, leave.end_date) > 1 ? 's' : ''})
                          </span>
                        </div>
                        {leave.reason && (
                          <div className="timeline-reason-text">{leave.reason}</div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="empty-state-modern">
                <div className="empty-icon-large">📅</div>
                <h4>No Leaves Scheduled</h4>
                <p>You don't have any leaves scheduled for this year</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default LeaveRequest
