import React, { useState, useEffect } from 'react'
import { supabase } from '../../services/supabaseClient'

const ExpenseRequest = ({ employeeId }) => {
  const [form, setForm] = useState({
    description: '',
    amount: '',
    category: '',
    file_url: ''
  })
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('')
  const [expenses, setExpenses] = useState([])
  const [uploadedFile, setUploadedFile] = useState(null)
  const [activeTab, setActiveTab] = useState('submit')
  const [trackers, setTrackers] = useState({
    daily: { total: 0, approved: 0, pending: 0, rejected: 0, count: 0 },
    weekly: { total: 0, approved: 0, pending: 0, rejected: 0, count: 0 },
    monthly: { total: 0, approved: 0, pending: 0, rejected: 0, count: 0 }
  })
  const [categoryBreakdown, setCategoryBreakdown] = useState({})
  const [trendData, setTrendData] = useState([])

  const expenseCategories = [
    { value: 'Travel', icon: '✈️', color: '#3b82f6' },
    { value: 'Meals', icon: '🍽️', color: '#10b981' },
    { value: 'Accommodation', icon: '🏨', color: '#8b5cf6' },
    { value: 'Office Supplies', icon: '📎', color: '#f59e0b' },
    { value: 'Training', icon: '📚', color: '#ec4899' },
    { value: 'Medical', icon: '⚕️', color: '#ef4444' },
    { value: 'Internet', icon: '🌐', color: '#06b6d4' },
    { value: 'Fuel', icon: '⛽', color: '#f97316' },
    { value: 'Other', icon: '📋', color: '#6b7280' }
  ]

  useEffect(() => {
    fetchExpenses()
    fetchTrackers()
    fetchCategoryBreakdown()
    fetchTrendData()
  }, [employeeId])

  const fetchExpenses = async () => {
    const { data } = await supabase
      .from('expenses')
      .select('*')
      .eq('employee_id', employeeId)
      .order('created_at', { ascending: false })
      .limit(15)
    setExpenses(data || [])
  }

  const fetchTrackers = async () => {
    const today = new Date()
    
    const getStartOfWeek = (date) => {
      const d = new Date(date)
      const day = d.getDay()
      const diff = d.getDate() - day + (day === 0 ? -6 : 1)
      d.setDate(diff)
      d.setHours(0, 0, 0, 0)
      return d
    }

    const startOfWeek = getStartOfWeek(new Date())
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)

    const todayStart = new Date(today)
    todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date(today)
    todayEnd.setHours(23, 59, 59, 999)

    const { data: dailyData } = await supabase
      .from('expenses')
      .select('amount, status')
      .eq('employee_id', employeeId)
      .gte('created_at', todayStart.toISOString())
      .lte('created_at', todayEnd.toISOString())

    const { data: weeklyData } = await supabase
      .from('expenses')
      .select('amount, status')
      .eq('employee_id', employeeId)
      .gte('created_at', startOfWeek.toISOString())

    const { data: monthlyData } = await supabase
      .from('expenses')
      .select('amount, status')
      .eq('employee_id', employeeId)
      .gte('created_at', startOfMonth.toISOString())

    setTrackers({
      daily: calculateTrackerData(dailyData || []),
      weekly: calculateTrackerData(weeklyData || []),
      monthly: calculateTrackerData(monthlyData || [])
    })
  }

  const fetchCategoryBreakdown = async () => {
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    const { data } = await supabase
      .from('expenses')
      .select('amount, category')
      .eq('employee_id', employeeId)
      .gte('created_at', startOfMonth.toISOString())

    const breakdown = {}
    data?.forEach(expense => {
      const category = expense.category || 'Other'
      breakdown[category] = (breakdown[category] || 0) + parseFloat(expense.amount)
    })

    setCategoryBreakdown(breakdown)
  }

  const fetchTrendData = async () => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() - i)
      return date.toISOString().split('T')[0]
    }).reverse()

    const trendPromises = last7Days.map(async (date) => {
      const nextDate = new Date(date)
      nextDate.setDate(nextDate.getDate() + 1)
      
      const { data } = await supabase
        .from('expenses')
        .select('amount')
        .eq('employee_id', employeeId)
        .gte('created_at', date)
        .lt('created_at', nextDate.toISOString().split('T')[0])

      const total = data?.reduce((sum, expense) => sum + parseFloat(expense.amount), 0) || 0
      return {
        date,
        amount: total,
        label: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      }
    })

    const trends = await Promise.all(trendPromises)
    setTrendData(trends)
  }

  const calculateTrackerData = (data) => {
    const result = {
      total: 0,
      approved: 0,
      pending: 0,
      rejected: 0,
      count: data.length
    }

    data.forEach(expense => {
      const amount = parseFloat(expense.amount)
      result.total += amount
      
      if (expense.status === 'approved') result.approved += amount
      else if (expense.status === 'rejected') result.rejected += amount
      else result.pending += amount
    })

    return result
  }

  const handleChange = e => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  const handleFileUpload = async (event) => {
    const file = event.target.files[0]
    if (!file) return

    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']
    const maxSize = 5 * 1024 * 1024

    if (!allowedTypes.includes(file.type)) {
      setMessage('❌ Only JPG, PNG, and PDF files are allowed')
      setMessageType('error')
      return
    }

    if (file.size > maxSize) {
      setMessage('❌ File size must be less than 5MB')
      setMessageType('error')
      return
    }

    setUploading(true)
    setMessage('')

    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${employeeId}/${Date.now()}.${fileExt}`

      const { data, error } = await supabase.storage
        .from('expense-bills')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (error) throw error

      const { data: { publicUrl } } = supabase.storage
        .from('expense-bills')
        .getPublicUrl(fileName)

      setForm(prev => ({ ...prev, file_url: publicUrl }))
      setUploadedFile({ name: file.name, url: publicUrl, type: file.type })
      setMessage('✅ File uploaded successfully!')
      setMessageType('success')

    } catch (error) {
      setMessage('❌ Error uploading file: ' + error.message)
      setMessageType('error')
    } finally {
      setUploading(false)
    }
  }

  const removeUploadedFile = () => {
    setForm(prev => ({ ...prev, file_url: '' }))
    setUploadedFile(null)
  }

  const handleSubmit = async e => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      if (!form.description || !form.amount || !form.category) {
        throw new Error('Description, amount, and category are required')
      }

      await supabase.from('expenses').insert([{
        employee_id: employeeId,
        description: form.description,
        amount: parseFloat(form.amount),
        category: form.category,
        file_url: form.file_url || null,
        status: 'pending'
      }])

      setMessage('✅ Expense submitted successfully!')
      setMessageType('success')
      setForm({ description: '', amount: '', category: '', file_url: '' })
      setUploadedFile(null)
      fetchExpenses()
      fetchTrackers()
      fetchCategoryBreakdown()
      fetchTrendData()

    } catch (error) {
      setMessage('❌ ' + error.message)
      setMessageType('error')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount)
  }

  const getFileIcon = (url) => {
    if (!url) return null
    const isPdf = url.toLowerCase().includes('.pdf')
    return isPdf ? '📄' : '🖼️'
  }

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { icon: '⏳', class: 'status-warning', label: 'Pending' },
      approved: { icon: '✅', class: 'status-success', label: 'Approved' },
      rejected: { icon: '❌', class: 'status-danger', label: 'Rejected' }
    }
    return statusConfig[status] || statusConfig.pending
  }

  const getCategoryConfig = (category) => {
    return expenseCategories.find(c => c.value === category) || expenseCategories[expenseCategories.length - 1]
  }

  const maxTrendAmount = Math.max(...trendData.map(d => d.amount), 1)

  return (
    <div className="expense-request-enhanced">
      {/* Header */}
      <div className="page-header-gradient">
        <div className="header-content-flex">
          <div className="header-text-section">
            <h1>💰 Expense Management</h1>
            <p>Submit and track your business expenses</p>
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

      {/* Expense Trackers */}
      <div className="trackers-grid-enhanced">
        <div className="tracker-card-enhanced daily-tracker">
          <div className="tracker-icon">📊</div>
          <div className="tracker-content">
            <div className="tracker-label">Today</div>
            <div className="tracker-value">{formatCurrency(trackers.daily.total)}</div>
            <div className="tracker-count">{trackers.daily.count} expense{trackers.daily.count !== 1 ? 's' : ''}</div>
          </div>
          <div className="tracker-breakdown-mini">
            <span className="mini-stat approved">✅ {formatCurrency(trackers.daily.approved)}</span>
            <span className="mini-stat pending">⏳ {formatCurrency(trackers.daily.pending)}</span>
            <span className="mini-stat rejected">❌ {formatCurrency(trackers.daily.rejected)}</span>
          </div>
        </div>

        <div className="tracker-card-enhanced weekly-tracker">
          <div className="tracker-icon">📈</div>
          <div className="tracker-content">
            <div className="tracker-label">This Week</div>
            <div className="tracker-value">{formatCurrency(trackers.weekly.total)}</div>
            <div className="tracker-count">{trackers.weekly.count} expense{trackers.weekly.count !== 1 ? 's' : ''}</div>
          </div>
          <div className="tracker-breakdown-mini">
            <span className="mini-stat approved">✅ {formatCurrency(trackers.weekly.approved)}</span>
            <span className="mini-stat pending">⏳ {formatCurrency(trackers.weekly.pending)}</span>
            <span className="mini-stat rejected">❌ {formatCurrency(trackers.weekly.rejected)}</span>
          </div>
        </div>

        <div className="tracker-card-enhanced monthly-tracker">
          <div className="tracker-icon">📅</div>
          <div className="tracker-content">
            <div className="tracker-label">This Month</div>
            <div className="tracker-value">{formatCurrency(trackers.monthly.total)}</div>
            <div className="tracker-count">{trackers.monthly.count} expense{trackers.monthly.count !== 1 ? 's' : ''}</div>
          </div>
          <div className="tracker-breakdown-mini">
            <span className="mini-stat approved">✅ {formatCurrency(trackers.monthly.approved)}</span>
            <span className="mini-stat pending">⏳ {formatCurrency(trackers.monthly.pending)}</span>
            <span className="mini-stat rejected">❌ {formatCurrency(trackers.monthly.rejected)}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs-modern">
        <button 
          className={`tab-button ${activeTab === 'submit' ? 'active' : ''}`}
          onClick={() => setActiveTab('submit')}
        >
          <span className="tab-icon">➕</span>
          <span>Submit</span>
        </button>
        <button 
          className={`tab-button ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          <span className="tab-icon">📋</span>
          <span>History</span>
        </button>
        <button 
          className={`tab-button ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          <span className="tab-icon">📊</span>
          <span>Analytics</span>
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content-modern">
        {/* Submit Tab */}
        {activeTab === 'submit' && (
          <div className="content-card-modern">
            <div className="card-title-section">
              <h3>➕ Submit New Expense</h3>
              <p className="card-subtitle">Add your business expense with receipt</p>
            </div>

            <form onSubmit={handleSubmit} className="expense-form-enhanced">
              <div className="form-row-enhanced">
                <div className="form-field-enhanced full">
                  <label>Description *</label>
                  <input
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    placeholder="e.g., Business lunch with client"
                    required
                  />
                </div>
              </div>

              <div className="form-row-enhanced">
                <div className="form-field-enhanced">
                  <label>Amount (₹) *</label>
                  <input
                    name="amount"
                    type="number"
                    value={form.amount}
                    onChange={handleChange}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>

                <div className="form-field-enhanced">
                  <label>Category *</label>
                  <select
                    name="category"
                    value={form.category}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Select category</option>
                    {expenseCategories.map(category => (
                      <option key={category.value} value={category.value}>
                        {category.icon} {category.value}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row-enhanced">
                <div className="form-field-enhanced full">
                  <label>Upload Receipt (Optional)</label>
                  {!uploadedFile ? (
                    <div className="file-upload-zone">
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/jpg,application/pdf"
                        onChange={handleFileUpload}
                        disabled={uploading}
                        className="file-input-hidden"
                        id="expense-file"
                      />
                      <label htmlFor="expense-file" className="file-upload-label">
                        {uploading ? '📤 Uploading...' : '📎 Choose file (JPG, PNG, PDF - Max 5MB)'}
                      </label>
                    </div>
                  ) : (
                    <div className="uploaded-file-display">
                      <span className="file-icon-large">{getFileIcon(uploadedFile.url)}</span>
                      <span className="file-name-display">{uploadedFile.name}</span>
                      <a
                        href={uploadedFile.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-file-action view"
                      >
                        👁️ View
                      </a>
                      <button
                        type="button"
                        onClick={removeUploadedFile}
                        className="btn-file-action remove"
                      >
                        🗑️ Remove
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="form-actions-enhanced">
                <button
                  type="submit"
                  className="btn-submit-expense"
                  disabled={loading || uploading}
                >
                  {loading ? '⏳ Submitting...' : '📤 Submit Expense'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="content-card-modern">
            <div className="card-title-section">
              <h3>📋 My Expenses</h3>
              <span className="badge-count">{expenses.length} expense{expenses.length !== 1 ? 's' : ''}</span>
            </div>
            
            {expenses.length > 0 ? (
              <div className="expenses-list-enhanced">
                {expenses.map(expense => {
                  const statusInfo = getStatusBadge(expense.status || 'pending')
                  const categoryConfig = getCategoryConfig(expense.category)
                  
                  return (
                    <div key={expense.id} className="expense-card-modern">
                      <div className="expense-card-header">
                        <div className="expense-category-badge" style={{ backgroundColor: categoryConfig.color }}>
                          {categoryConfig.icon} {expense.category}
                        </div>
                        <div className={`expense-status-badge ${statusInfo.class}`}>
                          {statusInfo.icon} {statusInfo.label}
                        </div>
                      </div>
                      
                      <div className="expense-card-body">
                        <div className="expense-description-text">{expense.description}</div>
                        <div className="expense-amount-large">{formatCurrency(expense.amount)}</div>
                      </div>

                      <div className="expense-card-footer">
                        <div className="expense-date-info">
                          {new Date(expense.created_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </div>
                        {expense.file_url && (
                          <a
                            href={expense.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="receipt-link-btn"
                          >
                            {getFileIcon(expense.file_url)} Receipt
                          </a>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="empty-state-modern">
                <div className="empty-icon-large">💰</div>
                <h4>No Expenses Yet</h4>
                <p>You haven't submitted any expenses yet</p>
              </div>
            )}
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="analytics-grid-enhanced">
            {/* Spending Trend */}
            <div className="content-card-modern">
              <div className="card-title-section">
                <h3>📈 7-Day Spending Trend</h3>
                <p className="card-subtitle">Your daily expense pattern</p>
              </div>
              <div className="trend-chart-modern">
                {trendData.map(item => (
                  <div key={item.date} className="trend-column">
                    <div className="trend-tooltip-modern">{formatCurrency(item.amount)}</div>
                    <div 
                      className="trend-bar-modern"
                      style={{ 
                        height: `${Math.max((item.amount / maxTrendAmount) * 150, item.amount > 0 ? 8 : 4)}px`
                      }}
                    ></div>
                    <div className="trend-label-modern">{item.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Category Breakdown */}
            <div className="content-card-modern">
              <div className="card-title-section">
                <h3>🏷️ Category Breakdown</h3>
                <p className="card-subtitle">This month's spending</p>
              </div>
              <div className="category-breakdown-list">
                {Object.entries(categoryBreakdown).length > 0 ? (
                  Object.entries(categoryBreakdown)
                    .sort(([,a], [,b]) => b - a)
                    .map(([category, amount]) => {
                      const percentage = (amount / trackers.monthly.total) * 100
                      const categoryConfig = getCategoryConfig(category)
                      
                      return (
                        <div key={category} className="category-breakdown-item">
                          <div className="category-header-row">
                            <span className="category-name-text">
                              {categoryConfig.icon} {category}
                            </span>
                            <span className="category-amount-text">{formatCurrency(amount)}</span>
                          </div>
                          <div className="category-progress-bar">
                            <div 
                              className="category-progress-fill"
                              style={{ 
                                width: `${percentage}%`,
                                backgroundColor: categoryConfig.color
                              }}
                            ></div>
                          </div>
                          <div className="category-percentage-text">{percentage.toFixed(1)}%</div>
                        </div>
                      )
                    })
                ) : (
                  <div className="empty-state-modern">
                    <div className="empty-icon-large">📊</div>
                    <h4>No Data</h4>
                    <p>No expenses this month</p>
                  </div>
                )}
              </div>
            </div>

            {/* Monthly Summary */}
            <div className="content-card-modern">
              <div className="card-title-section">
                <h3>📋 Monthly Summary</h3>
                <p className="card-subtitle">Overall statistics</p>
              </div>
              <div className="summary-grid-modern">
                <div className="summary-item-modern">
                  <div className="summary-icon-large">💸</div>
                  <div className="summary-value-large">{formatCurrency(trackers.monthly.total)}</div>
                  <div className="summary-label-text">Total Expenses</div>
                </div>
                <div className="summary-item-modern">
                  <div className="summary-icon-large">✅</div>
                  <div className="summary-value-large">{formatCurrency(trackers.monthly.approved)}</div>
                  <div className="summary-label-text">Approved</div>
                </div>
                <div className="summary-item-modern">
                  <div className="summary-icon-large">⏳</div>
                  <div className="summary-value-large">{formatCurrency(trackers.monthly.pending)}</div>
                  <div className="summary-label-text">Pending</div>
                </div>
              </div>
              
              <div className="approval-rate-section">
                <div className="approval-label-row">
                  <span>Approval Rate</span>
                  <span className="approval-percentage">
                    {trackers.monthly.total > 0 
                      ? ((trackers.monthly.approved / trackers.monthly.total) * 100).toFixed(1)
                      : 0}%
                  </span>
                </div>
                <div className="approval-progress-track">
                  <div 
                    className="approval-progress-fill"
                    style={{ 
                      width: `${
                        trackers.monthly.total > 0 
                          ? (trackers.monthly.approved / trackers.monthly.total) * 100
                          : 0
                      }%` 
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ExpenseRequest
