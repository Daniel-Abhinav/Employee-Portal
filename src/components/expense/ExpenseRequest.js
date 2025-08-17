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
    'Travel',
    'Meals',
    'Accommodation',
    'Office Supplies',
    'Training',
    'Medical',
    'Internet',
    'Fuel',
    'Other'
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

  // FIXED: Correct week calculation
  const fetchTrackers = async () => {
    const today = new Date()
    
    // Get start of current week (Monday)
    const getStartOfWeek = (date) => {
      const d = new Date(date)
      const day = d.getDay()
      const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Monday as start
      d.setDate(diff)
      d.setHours(0, 0, 0, 0)
      return d
    }

    const startOfWeek = getStartOfWeek(new Date())
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)

    // Daily tracker (today)
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

    // Weekly tracker (FIXED)
    const { data: weeklyData } = await supabase
      .from('expenses')
      .select('amount, status')
      .eq('employee_id', employeeId)
      .gte('created_at', startOfWeek.toISOString())

    // Monthly tracker
    const { data: monthlyData } = await supabase
      .from('expenses')
      .select('amount, status')
      .eq('employee_id', employeeId)
      .gte('created_at', startOfMonth.toISOString())

    // Debug logs (remove in production)
    console.log('Date ranges:')
    console.log('Today:', todayStart.toISOString(), 'to', todayEnd.toISOString())
    console.log('Week start:', startOfWeek.toISOString())
    console.log('Month start:', startOfMonth.toISOString())
    console.log('Daily data:', dailyData)
    console.log('Weekly data:', weeklyData)
    console.log('Monthly data:', monthlyData)

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
    const maxSize = 5 * 1024 * 1024 // 5MB

    if (!allowedTypes.includes(file.type)) {
      setMessage('Only JPG, PNG, and PDF files are allowed')
      return
    }

    if (file.size > maxSize) {
      setMessage('File size must be less than 5MB')
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
      setMessage('File uploaded successfully!')

    } catch (error) {
      setMessage('Error uploading file: ' + error.message)
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
        file_url: form.file_url || null
      }])

      setMessage('Expense submitted successfully!')
      setForm({ description: '', amount: '', category: '', file_url: '' })
      setUploadedFile(null)
      fetchExpenses()
      fetchTrackers()
      fetchCategoryBreakdown()
      fetchTrendData()

    } catch (error) {
      setMessage(error.message)
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
    const statusClasses = {
      pending: 'status-warning',
      approved: 'status-success',
      rejected: 'status-danger'
    }
    return `status-badge ${statusClasses[status] || 'status-warning'}`
  }

  const maxTrendAmount = Math.max(...trendData.map(d => d.amount), 1)

  return (
    <div className="expense-request-modern">
      <div className="expense-header">
        <h2>Expense Management</h2>
        <p>Submit and track your business expenses</p>
      </div>

      {message && (
        <div className={`message-modern ${message.includes('Error') || message.includes('required') ? 'error' : 'success'}`}>
          {message}
        </div>
      )}

      {/* Expense Trackers */}
      <div className="expense-trackers-grid">
        <div className="tracker-card daily">
          <div className="tracker-header">
            <h3>📊 Today</h3>
            <div className="tracker-count">{trackers.daily.count} expenses</div>
          </div>
          <div className="tracker-amount">{formatCurrency(trackers.daily.total)}</div>
          <div className="tracker-breakdown">
            <span className="approved">✅ {formatCurrency(trackers.daily.approved)}</span>
            <span className="pending">⏳ {formatCurrency(trackers.daily.pending)}</span>
            <span className="rejected">❌ {formatCurrency(trackers.daily.rejected)}</span>
          </div>
        </div>

        <div className="tracker-card weekly">
          <div className="tracker-header">
            <h3>📈 This Week</h3>
            <div className="tracker-count">{trackers.weekly.count} expenses</div>
          </div>
          <div className="tracker-amount">{formatCurrency(trackers.weekly.total)}</div>
          <div className="tracker-breakdown">
            <span className="approved">✅ {formatCurrency(trackers.weekly.approved)}</span>
            <span className="pending">⏳ {formatCurrency(trackers.weekly.pending)}</span>
            <span className="rejected">❌ {formatCurrency(trackers.weekly.rejected)}</span>
          </div>
        </div>

        <div className="tracker-card monthly">
          <div className="tracker-header">
            <h3>📅 This Month</h3>
            <div className="tracker-count">{trackers.monthly.count} expenses</div>
          </div>
          <div className="tracker-amount">{formatCurrency(trackers.monthly.total)}</div>
          <div className="tracker-breakdown">
            <span className="approved">✅ {formatCurrency(trackers.monthly.approved)}</span>
            <span className="pending">⏳ {formatCurrency(trackers.monthly.pending)}</span>
            <span className="rejected">❌ {formatCurrency(trackers.monthly.rejected)}</span>
          </div>
        </div>
      </div>

      {/* Expense Tabs */}
      <div className="expense-tabs">
        <button 
          className={`tab-btn ${activeTab === 'submit' ? 'active' : ''}`}
          onClick={() => setActiveTab('submit')}
        >
          Submit Expense
        </button>
        <button 
          className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          My Expenses
        </button>
        <button 
          className={`tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          Analytics
        </button>
      </div>

      {/* Submit Expense Tab */}
      {activeTab === 'submit' && (
        <div className="modern-card">
          <div className="card-header-modern">
            <h3>Submit New Expense</h3>
            <p>Add your business expense with receipt</p>
          </div>

          <form onSubmit={handleSubmit} className="expense-form">
            <div className="form-grid">
              <div className="form-group-modern">
                <label>Description *</label>
                <input
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  placeholder="e.g., Business lunch with client"
                  required
                />
              </div>

              <div className="form-group-modern">
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

              <div className="form-group-modern">
                <label>Category *</label>
                <select
                  name="category"
                  value={form.category}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select category</option>
                  {expenseCategories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              <div className="form-group-modern full-width">
                <label>Upload Receipt (Optional)</label>
                <div className="file-upload-section">
                  {!uploadedFile ? (
                    <div className="file-upload-area">
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/jpg,application/pdf"
                        onChange={handleFileUpload}
                        disabled={uploading}
                        className="file-input"
                      />
                      <div className="file-upload-text">
                        {uploading ? (
                          <span>📤 Uploading...</span>
                        ) : (
                          <span>📎 Choose file (JPG, PNG, PDF - Max 5MB)</span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="uploaded-file">
                      <div className="file-info">
                        <span className="file-icon">{getFileIcon(uploadedFile.url)}</span>
                        <span className="file-name">{uploadedFile.name}</span>
                        <a
                          href={uploadedFile.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-modern secondary small"
                        >
                          View
                        </a>
                        <button
                          type="button"
                          onClick={removeUploadedFile}
                          className="btn-modern danger small"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="form-actions">
              <button
                type="submit"
                className="btn-modern primary"
                disabled={loading || uploading}
              >
                {loading ? 'Submitting...' : 'Submit Expense'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="modern-card">
          <div className="card-header-modern">
            <h3>My Expenses</h3>
            <p>Track your submitted expense claims</p>
          </div>
          
          {expenses.length > 0 ? (
            <div className="expenses-list">
              {expenses.map(expense => (
                <div key={expense.id} className="expense-item">
                  <div className="expense-main">
                    <div className="expense-info">
                      <div className="expense-description">{expense.description}</div>
                      <div className="expense-meta">
                        <span className="expense-category">{expense.category}</span>
                        <span className="expense-date">
                          {new Date(expense.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="expense-actions">
                      <div className="expense-amount">{formatCurrency(expense.amount)}</div>
                      <span className={getStatusBadge(expense.status || 'pending')}>
                        {expense.status || 'pending'}
                      </span>
                      {expense.file_url && (
                        <a
                          href={expense.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="receipt-link"
                        >
                          {getFileIcon(expense.file_url)} Receipt
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state-small">
              <div className="empty-icon">💰</div>
              <p>No expenses submitted yet</p>
            </div>
          )}
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="analytics-grid">
          {/* Spending Trend Chart */}
          <div className="modern-card">
            <div className="card-header-modern">
              <h3>📈 7-Day Spending Trend</h3>
              <p>Your daily expense pattern</p>
            </div>
            <div className="trend-chart">
              {trendData.map(item => (
                <div key={item.date} className="trend-bar-container">
                  <div 
                    className="trend-bar"
                    style={{ 
                      height: `${(item.amount / maxTrendAmount) * 100}px`,
                      minHeight: item.amount > 0 ? '4px' : '2px'
                    }}
                  >
                    <div className="trend-tooltip">
                      {formatCurrency(item.amount)}
                    </div>
                  </div>
                  <div className="trend-label">{item.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Category Breakdown */}
          <div className="modern-card">
            <div className="card-header-modern">
              <h3>🏷️ Category Breakdown</h3>
              <p>This month's spending by category</p>
            </div>
            <div className="category-chart">
              {Object.entries(categoryBreakdown).length > 0 ? (
                Object.entries(categoryBreakdown)
                  .sort(([,a], [,b]) => b - a)
                  .map(([category, amount]) => {
                    const percentage = (amount / trackers.monthly.total) * 100
                    return (
                      <div key={category} className="category-item">
                        <div className="category-info">
                          <span className="category-name">{category}</span>
                          <span className="category-amount">{formatCurrency(amount)}</span>
                        </div>
                        <div className="category-progress">
                          <div 
                            className="category-progress-fill"
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                        <div className="category-percentage">{percentage.toFixed(1)}%</div>
                      </div>
                    )
                  })
              ) : (
                <div className="empty-state-small">
                  <div className="empty-icon">📊</div>
                  <p>No expenses this month</p>
                </div>
              )}
            </div>
          </div>

          {/* Monthly Summary */}
          <div className="modern-card">
            <div className="card-header-modern">
              <h3>📋 Monthly Summary</h3>
              <p>Overall expense statistics</p>
            </div>
            <div className="summary-stats">
              <div className="summary-stat">
                <div className="summary-icon">💸</div>
                <div className="summary-content">
                  <div className="summary-value">{formatCurrency(trackers.monthly.total)}</div>
                  <div className="summary-label">Total Expenses</div>
                </div>
              </div>
              <div className="summary-stat">
                <div className="summary-icon">✅</div>
                <div className="summary-content">
                  <div className="summary-value">{formatCurrency(trackers.monthly.approved)}</div>
                  <div className="summary-label">Approved</div>
                </div>
              </div>
              <div className="summary-stat">
                <div className="summary-icon">⏳</div>
                <div className="summary-content">
                  <div className="summary-value">{formatCurrency(trackers.monthly.pending)}</div>
                  <div className="summary-label">Pending</div>
                </div>
              </div>
            </div>
            
            <div className="approval-rate">
              <div className="approval-label">
                Approval Rate: {
                  trackers.monthly.total > 0 
                    ? ((trackers.monthly.approved / trackers.monthly.total) * 100).toFixed(1)
                    : 0
                }%
              </div>
              <div className="approval-progress">
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
  )
}

export default ExpenseRequest
