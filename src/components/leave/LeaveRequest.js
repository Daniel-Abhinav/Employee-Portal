import React, { useState, useEffect } from 'react'
import { supabase } from '../../services/supabaseClient'

const leaveTypes = [
  { value: 'Casual Leave', label: 'Casual Leave', balance: 12 },
  { value: 'Sick Leave', label: 'Sick Leave', balance: 7 },
  { value: 'Paid Leave', label: 'Paid Leave', balance: 21 },
  { value: 'Unpaid Leave', label: 'Unpaid Leave', balance: 'Unlimited' },
  { value: 'Other', label: 'Other', balance: 0 }
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
    // Calculate leave balance based on used leaves
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
        reason: form.reason
      }])

      setMessage('Leave request submitted successfully!')
      setForm({ leave_type: '', start_date: '', end_date: '', reason: '' })
      fetchRequests()
      fetchLeaveBalance()
    } catch (err) {
      setMessage(err.message)
    } finally {
      setLoading(false)
    }
  }

  const cancelRequest = async (requestId) => {
    try {
      await supabase
        .from('leave_requests')
        .delete()
        .eq('id', requestId)
        .eq('employee_id', employeeId)
        .eq('status', 'pending')

      setMessage('Leave request cancelled successfully!')
      fetchRequests()
      fetchLeaveBalance()
    } catch (error) {
      setMessage('Error cancelling request: ' + error.message)
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
    const statusClasses = {
      pending: 'status-warning',
      approved: 'status-success',
      rejected: 'status-danger'
    }
    return `status-badge ${statusClasses[status] || 'status-secondary'}`
  }

  return (
    <div className="leave-request-modern">
      <div className="leave-header">
        <h2>Leave Management</h2>
        <p>Request time off and manage your leave balance</p>
      </div>

      {message && (
        <div className={`message-modern ${message.includes('Error') ? 'error' : 'success'}`}>
          {message}
        </div>
      )}

      {/* Leave Balance Cards */}
      <div className="leave-balance-grid">
        {leaveTypes.map(type => (
          <div key={type.value} className="balance-card">
            <div className="balance-type">{type.label}</div>
            <div className="balance-amount">
              {typeof leaveBalance[type.value] === 'number' ? 
                `${leaveBalance[type.value]} days` : 
                leaveBalance[type.value] || `${type.balance} days`}
            </div>
            <div className="balance-total">
              Total: {typeof type.balance === 'number' ? `${type.balance} days` : type.balance}
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="leave-tabs">
        <button 
          className={`tab-btn ${activeTab === 'request' ? 'active' : ''}`}
          onClick={() => setActiveTab('request')}
        >
          New Request
        </button>
        <button 
          className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          My Requests
        </button>
        <button 
          className={`tab-btn ${activeTab === 'calendar' ? 'active' : ''}`}
          onClick={() => setActiveTab('calendar')}
        >
          Leave Calendar
        </button>
      </div>

      {/* New Request Tab */}
      {activeTab === 'request' && (
        <div className="modern-card">
          <div className="card-header-modern">
            <h3>Submit New Leave Request</h3>
            <p>Fill in the details for your leave application</p>
          </div>
          <form onSubmit={handleSubmit} className="leave-form">
            <div className="form-grid">
              <div className="form-group-modern">
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
                      {type.label} ({typeof leaveBalance[type.value] === 'number' ? 
                        `${leaveBalance[type.value]} days left` : 
                        leaveBalance[type.value] || `${type.balance} available`})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group-modern">
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

              <div className="form-group-modern">
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

              {form.start_date && form.end_date && (
                <div className="leave-duration">
                  <div className="duration-info">
                    <strong>Duration: {calculateLeaveDays(form.start_date, form.end_date)} days</strong>
                  </div>
                </div>
              )}

              <div className="form-group-modern full-width">
                <label>Reason</label>
                <textarea 
                  name="reason" 
                  value={form.reason} 
                  onChange={handleChange}
                  placeholder="Briefly explain the reason for your leave"
                  rows="3"
                />
              </div>
            </div>

            <div className="form-actions">
              <button 
                type="submit" 
                className="btn-modern primary" 
                disabled={loading}
              >
                {loading ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="modern-card">
          <div className="card-header-modern">
            <h3>My Leave Requests</h3>
            <p>Track the status of your leave applications</p>
          </div>
          
          {requests.length > 0 ? (
            <div className="requests-list">
              {requests.map(request => (
                <div key={request.id} className="request-item">
                  <div className="request-main">
                    <div className="request-info">
                      <div className="request-type">{request.leave_type}</div>
                      <div className="request-dates">
                        {formatDate(request.start_date)} - {formatDate(request.end_date)}
                        <span className="request-duration">
                          ({calculateLeaveDays(request.start_date, request.end_date)} days)
                        </span>
                      </div>
                      {request.reason && (
                        <div className="request-reason">{request.reason}</div>
                      )}
                    </div>
                    <div className="request-actions">
                      <span className={getStatusBadge(request.status)}>
                        {request.status}
                      </span>
                      {request.status === 'pending' && (
                        <button 
                          onClick={() => cancelRequest(request.id)}
                          className="cancel-btn"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="request-meta">
                    Applied: {formatDate(request.created_at)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state-small">
              <div className="empty-icon">📝</div>
              <p>No leave requests found</p>
            </div>
          )}
        </div>
      )}

      {/* Calendar Tab */}
      {activeTab === 'calendar' && (
        <div className="modern-card">
          <div className="card-header-modern">
            <h3>Leave Calendar</h3>
            <p>Overview of your leaves this year</p>
          </div>
          
          {leaveCalendar.length > 0 ? (
            <div className="calendar-timeline">
              {leaveCalendar.map(leave => (
                <div key={leave.id} className="timeline-item">
                  <div className="timeline-marker"></div>
                  <div className="timeline-content">
                    <div className="timeline-header">
                      <span className="timeline-type">{leave.leave_type}</span>
                      <span className={getStatusBadge(leave.status)}>{leave.status}</span>
                    </div>
                    <div className="timeline-dates">
                      {formatDate(leave.start_date)} - {formatDate(leave.end_date)}
                    </div>
                    {leave.reason && (
                      <div className="timeline-reason">{leave.reason}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state-small">
              <div className="empty-icon">📅</div>
              <p>No leaves scheduled this year</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default LeaveRequest
