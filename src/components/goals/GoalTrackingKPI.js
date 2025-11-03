import React, { useState, useEffect } from 'react'
import { supabase } from '../../services/supabaseClient'

const GoalTrackingKPI = ({ employeeId }) => {
  const [goals, setGoals] = useState([])
  const [kpis, setKpis] = useState([])
  const [activeTab, setActiveTab] = useState('overview')
  const [loading, setLoading] = useState(true)
  const [showGoalForm, setShowGoalForm] = useState(false)
  const [showKPIForm, setShowKPIForm] = useState(false)
  const [editingGoal, setEditingGoal] = useState(null)
  const [editingKPI, setEditingKPI] = useState(null)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('')

  const [goalForm, setGoalForm] = useState({
    title: '',
    description: '',
    category: 'Individual',
    goal_type: 'target',
    target_value: '',
    unit: '',
    start_date: '',
    end_date: '',
    priority: 'medium'
  })

  const [kpiForm, setKPIForm] = useState({
    name: '',
    description: '',
    category: 'Productivity',
    measurement_type: 'number',
    target_value: '',
    unit: '',
    frequency: 'monthly'
  })

  useEffect(() => {
    fetchGoals()
    fetchKPIs()
  }, [employeeId])

  const fetchGoals = async () => {
    try {
      const { data, error } = await supabase
        .from('goals')
        .select(`
          *,
          goal_progress (
            value,
            progress_date,
            notes
          )
        `)
        .eq('employee_id', employeeId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setGoals(data || [])
    } catch (error) {
      console.error('Error fetching goals:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchKPIs = async () => {
    try {
      const { data, error } = await supabase
        .from('kpis')
        .select(`
          *,
          kpi_values (
            value,
            recorded_date,
            period,
            notes
          )
        `)
        .eq('employee_id', employeeId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setKpis(data || [])
    } catch (error) {
      console.error('Error fetching KPIs:', error)
    }
  }

  const handleGoalSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const goalData = {
        ...goalForm,
        employee_id: employeeId,
        target_value: goalForm.target_value ? parseFloat(goalForm.target_value) : null,
        created_by: employeeId,
        status: 'active'
      }

      if (editingGoal) {
        const { error } = await supabase
          .from('goals')
          .update(goalData)
          .eq('id', editingGoal.id)
        if (error) throw error
        setMessage('✅ Goal updated successfully!')
      } else {
        const { error } = await supabase
          .from('goals')
          .insert([goalData])
        if (error) throw error
        setMessage('✅ Goal created successfully!')
      }

      setMessageType('success')
      resetGoalForm()
      fetchGoals()
    } catch (error) {
      setMessage('❌ Error saving goal: ' + error.message)
      setMessageType('error')
    } finally {
      setLoading(false)
    }
  }

  const handleKPISubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const kpiData = {
        ...kpiForm,
        employee_id: employeeId,
        target_value: kpiForm.target_value ? parseFloat(kpiForm.target_value) : null
      }

      if (editingKPI) {
        const { error } = await supabase
          .from('kpis')
          .update(kpiData)
          .eq('id', editingKPI.id)
        if (error) throw error
        setMessage('✅ KPI updated successfully!')
      } else {
        const { error } = await supabase
          .from('kpis')
          .insert([kpiData])
        if (error) throw error
        setMessage('✅ KPI created successfully!')
      }

      setMessageType('success')
      resetKPIForm()
      fetchKPIs()
    } catch (error) {
      setMessage('❌ Error saving KPI: ' + error.message)
      setMessageType('error')
    } finally {
      setLoading(false)
    }
  }

  const updateGoalProgress = async (goalId, newValue, notes = '') => {
    try {
      const { error: progressError } = await supabase
        .from('goal_progress')
        .insert([{
          goal_id: goalId,
          value: parseFloat(newValue),
          notes: notes
        }])

      if (progressError) throw progressError

      const { error: updateError } = await supabase
        .from('goals')
        .update({ 
          current_value: parseFloat(newValue),
          updated_at: new Date().toISOString()
        })
        .eq('id', goalId)

      if (updateError) throw updateError

      setMessage('✅ Progress updated!')
      setMessageType('success')
      fetchGoals()
    } catch (error) {
      setMessage('❌ Error updating progress')
      setMessageType('error')
    }
  }

  const updateKPIValue = async (kpiId, value, period) => {
    try {
      const { error } = await supabase
        .from('kpi_values')
        .insert([{
          kpi_id: kpiId,
          value: parseFloat(value),
          period: period
        }])

      if (error) throw error

      await supabase
        .from('kpis')
        .update({ 
          current_value: parseFloat(value),
          updated_at: new Date().toISOString()
        })
        .eq('id', kpiId)

      setMessage('✅ KPI value updated!')
      setMessageType('success')
      fetchKPIs()
    } catch (error) {
      setMessage('❌ Error updating KPI')
      setMessageType('error')
    }
  }

  const resetGoalForm = () => {
    setGoalForm({
      title: '',
      description: '',
      category: 'Individual',
      goal_type: 'target',
      target_value: '',
      unit: '',
      start_date: '',
      end_date: '',
      priority: 'medium'
    })
    setShowGoalForm(false)
    setEditingGoal(null)
  }

  const resetKPIForm = () => {
    setKPIForm({
      name: '',
      description: '',
      category: 'Productivity',
      measurement_type: 'number',
      target_value: '',
      unit: '',
      frequency: 'monthly'
    })
    setShowKPIForm(false)
    setEditingKPI(null)
  }

  const getProgressPercentage = (current, target) => {
    if (!target || target === 0) return 0
    return Math.min((current / target) * 100, 100)
  }

  const getStatusColor = (status) => {
    const colors = {
      active: '#3b82f6',
      completed: '#10b981',
      paused: '#f59e0b',
      cancelled: '#ef4444'
    }
    return colors[status] || colors.active
  }

  const getPriorityColor = (priority) => {
    const colors = {
      high: '#ef4444',
      medium: '#f59e0b',
      low: '#10b981'
    }
    return colors[priority] || colors.medium
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getCurrentPeriod = (frequency) => {
    const now = new Date()
    switch (frequency) {
      case 'daily':
        return now.toISOString().split('T')[0]
      case 'weekly':
        const year = now.getFullYear()
        const week = Math.ceil((now.getTime() - new Date(year, 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000))
        return `${year}-W${week.toString().padStart(2, '0')}`
      case 'monthly':
        return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`
      case 'quarterly':
        const quarter = Math.ceil((now.getMonth() + 1) / 3)
        return `${now.getFullYear()}-Q${quarter}`
      default:
        return now.toISOString().split('T')[0]
    }
  }

  if (loading && goals.length === 0 && kpis.length === 0) {
    return (
      <div className="loading-container-modern">
        <div className="spinner-modern"></div>
        <p>Loading goals and KPIs...</p>
      </div>
    )
  }

  return (
    <div className="goal-kpi-dashboard-enhanced">
      {/* Header */}
      <div className="page-header-gradient">
        <div className="header-content-flex">
          <div className="header-text-section">
            <h1>🎯 Goals & KPI Tracking</h1>
            <p>Set goals, track KPIs, and monitor your performance metrics</p>
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

      {/* Tabs */}
      <div className="tabs-modern">
        <button
          className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <span className="tab-icon">🏠</span>
          <span>Overview</span>
        </button>
        <button
          className={`tab-button ${activeTab === 'goals' ? 'active' : ''}`}
          onClick={() => setActiveTab('goals')}
        >
          <span className="tab-icon">🎯</span>
          <span>Goals</span>
        </button>
        <button
          className={`tab-button ${activeTab === 'kpis' ? 'active' : ''}`}
          onClick={() => setActiveTab('kpis')}
        >
          <span className="tab-icon">📈</span>
          <span>KPIs</span>
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
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="overview-content-goals">
            {/* Summary Cards */}
            <div className="goals-summary-grid">
              <div className="goal-summary-card primary">
                <div className="summary-icon-goal">🎯</div>
                <div className="summary-content-goal">
                  <div className="summary-value-goal">{goals.filter(g => g.status === 'active').length}</div>
                  <div className="summary-label-goal">Active Goals</div>
                </div>
              </div>
              <div className="goal-summary-card">
                <div className="summary-icon-goal">✅</div>
                <div className="summary-content-goal">
                  <div className="summary-value-goal">{goals.filter(g => g.status === 'completed').length}</div>
                  <div className="summary-label-goal">Completed</div>
                </div>
              </div>
              <div className="goal-summary-card">
                <div className="summary-icon-goal">📈</div>
                <div className="summary-content-goal">
                  <div className="summary-value-goal">{kpis.length}</div>
                  <div className="summary-label-goal">KPIs Tracked</div>
                </div>
              </div>
              <div className="goal-summary-card">
                <div className="summary-icon-goal">⭐</div>
                <div className="summary-content-goal">
                  <div className="summary-value-goal">
                    {goals.length > 0 
                      ? Math.round(goals.reduce((sum, g) => sum + getProgressPercentage(g.current_value || 0, g.target_value || 1), 0) / goals.length)
                      : 0}%
                  </div>
                  <div className="summary-label-goal">Avg Progress</div>
                </div>
              </div>
            </div>

            {/* Recent Goals */}
            <div className="content-card-modern">
              <div className="card-title-section">
                <h3>🎯 Recent Goals</h3>
                <span className="badge-count">{goals.length} total</span>
              </div>
              {goals.length > 0 ? (
                <div className="recent-goals-list-modern">
                  {goals.slice(0, 5).map((goal) => (
                    <div key={goal.id} className="recent-goal-item-modern">
                      <div className="goal-info-compact">
                        <h4>{goal.title}</h4>
                        <div className="goal-badges-compact">
                          <span className="badge-category">{goal.category}</span>
                          <span 
                            className="badge-priority"
                            style={{ backgroundColor: getPriorityColor(goal.priority) }}
                          >
                            {goal.priority}
                          </span>
                        </div>
                      </div>
                      <div className="goal-progress-compact">
                        <span className="progress-percentage">
                          {getProgressPercentage(goal.current_value || 0, goal.target_value || 1).toFixed(0)}%
                        </span>
                        <div className="progress-bar-mini-modern">
                          <div 
                            className="progress-fill-mini-modern"
                            style={{ 
                              width: `${getProgressPercentage(goal.current_value || 0, goal.target_value || 1)}%`,
                              backgroundColor: getStatusColor(goal.status)
                            }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state-modern">
                  <div className="empty-icon-large">🎯</div>
                  <h4>No Goals Yet</h4>
                  <p>Create your first goal to get started</p>
                </div>
              )}
            </div>

            {/* KPI Summary */}
            <div className="content-card-modern">
              <div className="card-title-section">
                <h3>📈 KPI Summary</h3>
                <span className="badge-count">{kpis.length} KPIs</span>
              </div>
              {kpis.length > 0 ? (
                <div className="kpi-summary-grid-modern">
                  {kpis.slice(0, 4).map((kpi) => (
                    <div key={kpi.id} className="kpi-summary-card-modern">
                      <h4>{kpi.name}</h4>
                      <div className="kpi-value-display">
                        {kpi.current_value || 0} <span className="kpi-unit">{kpi.unit}</span>
                      </div>
                      <div className="kpi-target-display">
                        Target: {kpi.target_value} {kpi.unit}
                      </div>
                      <div className="kpi-frequency-badge">{kpi.frequency}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state-modern">
                  <div className="empty-icon-large">📈</div>
                  <h4>No KPIs Yet</h4>
                  <p>Create KPIs to track your performance</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Goals Tab */}
        {activeTab === 'goals' && (
          <div className="goals-section-enhanced">
            <div className="section-header-with-action">
              <h3>My Goals</h3>
              <button
                className="btn-add-modern"
                onClick={() => setShowGoalForm(!showGoalForm)}
              >
                {showGoalForm ? '✕ Cancel' : '➕ Add Goal'}
              </button>
            </div>

            {/* Goal Form */}
            {showGoalForm && (
              <div className="content-card-modern">
                <div className="card-title-section">
                  <h3>{editingGoal ? '✏️ Edit Goal' : '➕ Create New Goal'}</h3>
                </div>
                <form onSubmit={handleGoalSubmit} className="form-enhanced-goals">
                  <div className="form-row-enhanced">
                    <div className="form-field-enhanced full">
                      <label>Goal Title *</label>
                      <input
                        type="text"
                        value={goalForm.title}
                        onChange={(e) => setGoalForm(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="e.g., Increase sales by 20%"
                        required
                      />
                    </div>
                  </div>

                  <div className="form-row-enhanced">
                    <div className="form-field-enhanced">
                      <label>Category</label>
                      <select
                        value={goalForm.category}
                        onChange={(e) => setGoalForm(prev => ({ ...prev, category: e.target.value }))}
                      >
                        <option value="Individual">Individual</option>
                        <option value="Team">Team</option>
                        <option value="Company">Company</option>
                        <option value="Skills">Skills Development</option>
                      </select>
                    </div>

                    <div className="form-field-enhanced">
                      <label>Goal Type</label>
                      <select
                        value={goalForm.goal_type}
                        onChange={(e) => setGoalForm(prev => ({ ...prev, goal_type: e.target.value }))}
                      >
                        <option value="target">Target-based</option>
                        <option value="habit">Habit-based</option>
                        <option value="milestone">Milestone</option>
                      </select>
                    </div>

                    <div className="form-field-enhanced">
                      <label>Priority</label>
                      <select
                        value={goalForm.priority}
                        onChange={(e) => setGoalForm(prev => ({ ...prev, priority: e.target.value }))}
                      >
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-row-enhanced">
                    <div className="form-field-enhanced">
                      <label>Target Value</label>
                      <input
                        type="number"
                        value={goalForm.target_value}
                        onChange={(e) => setGoalForm(prev => ({ ...prev, target_value: e.target.value }))}
                        placeholder="100"
                        step="0.01"
                      />
                    </div>

                    <div className="form-field-enhanced">
                      <label>Unit</label>
                      <input
                        type="text"
                        value={goalForm.unit}
                        onChange={(e) => setGoalForm(prev => ({ ...prev, unit: e.target.value }))}
                        placeholder="Sales, Hours, Projects, %"
                      />
                    </div>

                    <div className="form-field-enhanced">
                      <label>Start Date *</label>
                      <input
                        type="date"
                        value={goalForm.start_date}
                        onChange={(e) => setGoalForm(prev => ({ ...prev, start_date: e.target.value }))}
                        required
                      />
                    </div>

                    <div className="form-field-enhanced">
                      <label>End Date *</label>
                      <input
                        type="date"
                        value={goalForm.end_date}
                        onChange={(e) => setGoalForm(prev => ({ ...prev, end_date: e.target.value }))}
                        min={goalForm.start_date}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-row-enhanced">
                    <div className="form-field-enhanced full">
                      <label>Description</label>
                      <textarea
                        value={goalForm.description}
                        onChange={(e) => setGoalForm(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Describe your goal and success criteria..."
                        rows="3"
                      />
                    </div>
                  </div>

                  <div className="form-actions-enhanced">
                    <button type="submit" className="btn-submit-goal" disabled={loading}>
                      {loading ? '⏳ Saving...' : editingGoal ? '💾 Update Goal' : '✨ Create Goal'}
                    </button>
                    <button type="button" onClick={resetGoalForm} className="btn-cancel-modern">
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Goals Grid */}
            {goals.length > 0 ? (
              <div className="goals-grid-modern">
                {goals.map((goal) => (
                  <div key={goal.id} className="goal-card-modern">
                    <div className="goal-card-header">
                      <h4>{goal.title}</h4>
                      <button 
                        onClick={() => {
                          setEditingGoal(goal)
                          setGoalForm({
                            title: goal.title,
                            description: goal.description || '',
                            category: goal.category,
                            goal_type: goal.goal_type,
                            target_value: goal.target_value || '',
                            unit: goal.unit || '',
                            start_date: goal.start_date,
                            end_date: goal.end_date,
                            priority: goal.priority
                          })
                          setShowGoalForm(true)
                        }}
                        className="btn-edit-icon"
                      >
                        ✏️
                      </button>
                    </div>

                    <div className="goal-badges-row">
                      <span className="badge-category-modern">{goal.category}</span>
                      <span 
                        className="badge-priority-modern"
                        style={{ backgroundColor: getPriorityColor(goal.priority) }}
                      >
                        {goal.priority}
                      </span>
                      <span 
                        className="badge-status-modern"
                        style={{ backgroundColor: getStatusColor(goal.status) }}
                      >
                        {goal.status}
                      </span>
                    </div>

                    {goal.description && (
                      <p className="goal-description-text">{goal.description}</p>
                    )}

                    <div className="goal-dates-row">
                      📅 {formatDate(goal.start_date)} → {formatDate(goal.end_date)}
                    </div>

                    {goal.target_value && (
                      <div className="goal-progress-section">
                        <div className="progress-info-row">
                          <span>Progress: {goal.current_value || 0} / {goal.target_value} {goal.unit}</span>
                          <span className="progress-percent-display">
                            {getProgressPercentage(goal.current_value || 0, goal.target_value).toFixed(1)}%
                          </span>
                        </div>
                        <div className="progress-bar-large">
                          <div 
                            className="progress-fill-large"
                            style={{ 
                              width: `${getProgressPercentage(goal.current_value || 0, goal.target_value)}%`,
                              backgroundColor: getStatusColor(goal.status)
                            }}
                          ></div>
                        </div>
                        <div className="progress-update-input">
                          <input
                            type="number"
                            placeholder="Update progress value"
                            step="0.01"
                            onKeyPress={(e) => {
                              if (e.key === 'Enter' && e.target.value) {
                                updateGoalProgress(goal.id, e.target.value)
                                e.target.value = ''
                              }
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              !showGoalForm && (
                <div className="empty-state-modern">
                  <div className="empty-icon-large">🎯</div>
                  <h4>No Goals Set</h4>
                  <p>Create your first goal to start tracking your progress</p>
                  <button 
                    className="btn-add-modern"
                    onClick={() => setShowGoalForm(true)}
                  >
                    ➕ Create First Goal
                  </button>
                </div>
              )
            )}
          </div>
        )}

        {/* KPIs Tab */}
        {activeTab === 'kpis' && (
          <div className="kpis-section-enhanced">
            <div className="section-header-with-action">
              <h3>Key Performance Indicators</h3>
              <button
                className="btn-add-modern"
                onClick={() => setShowKPIForm(!showKPIForm)}
              >
                {showKPIForm ? '✕ Cancel' : '➕ Add KPI'}
              </button>
            </div>

            {/* KPI Form */}
            {showKPIForm && (
              <div className="content-card-modern">
                <div className="card-title-section">
                  <h3>{editingKPI ? '✏️ Edit KPI' : '➕ Create New KPI'}</h3>
                </div>
                <form onSubmit={handleKPISubmit} className="form-enhanced-goals">
                  <div className="form-row-enhanced">
                    <div className="form-field-enhanced full">
                      <label>KPI Name *</label>
                      <input
                        type="text"
                        value={kpiForm.name}
                        onChange={(e) => setKPIForm(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="e.g., Monthly Sales Revenue"
                        required
                      />
                    </div>
                  </div>

                  <div className="form-row-enhanced">
                    <div className="form-field-enhanced">
                      <label>Category</label>
                      <select
                        value={kpiForm.category}
                        onChange={(e) => setKPIForm(prev => ({ ...prev, category: e.target.value }))}
                      >
                        <option value="Sales">Sales</option>
                        <option value="Productivity">Productivity</option>
                        <option value="Quality">Quality</option>
                        <option value="Customer">Customer</option>
                        <option value="Financial">Financial</option>
                      </select>
                    </div>

                    <div className="form-field-enhanced">
                      <label>Measurement Type</label>
                      <select
                        value={kpiForm.measurement_type}
                        onChange={(e) => setKPIForm(prev => ({ ...prev, measurement_type: e.target.value }))}
                      >
                        <option value="number">Number</option>
                        <option value="percentage">Percentage</option>
                        <option value="currency">Currency</option>
                        <option value="time">Time</option>
                      </select>
                    </div>

                    <div className="form-field-enhanced">
                      <label>Frequency</label>
                      <select
                        value={kpiForm.frequency}
                        onChange={(e) => setKPIForm(prev => ({ ...prev, frequency: e.target.value }))}
                      >
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                        <option value="quarterly">Quarterly</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-row-enhanced">
                    <div className="form-field-enhanced">
                      <label>Target Value</label>
                      <input
                        type="number"
                        value={kpiForm.target_value}
                        onChange={(e) => setKPIForm(prev => ({ ...prev, target_value: e.target.value }))}
                        placeholder="Target value"
                        step="0.01"
                      />
                    </div>

                    <div className="form-field-enhanced">
                      <label>Unit</label>
                      <input
                        type="text"
                        value={kpiForm.unit}
                        onChange={(e) => setKPIForm(prev => ({ ...prev, unit: e.target.value }))}
                        placeholder="$, %, hrs, calls, etc."
                      />
                    </div>
                  </div>

                  <div className="form-row-enhanced">
                    <div className="form-field-enhanced full">
                      <label>Description</label>
                      <textarea
                        value={kpiForm.description}
                        onChange={(e) => setKPIForm(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Describe what this KPI measures..."
                        rows="3"
                      />
                    </div>
                  </div>

                  <div className="form-actions-enhanced">
                    <button type="submit" className="btn-submit-goal" disabled={loading}>
                      {loading ? '⏳ Saving...' : editingKPI ? '💾 Update KPI' : '✨ Create KPI'}
                    </button>
                    <button type="button" onClick={resetKPIForm} className="btn-cancel-modern">
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* KPIs Grid */}
            {kpis.length > 0 ? (
              <div className="kpis-grid-modern">
                {kpis.map((kpi) => (
                  <div key={kpi.id} className="kpi-card-modern">
                    <div className="kpi-card-header">
                      <h4>{kpi.name}</h4>
                      <button 
                        onClick={() => {
                          setEditingKPI(kpi)
                          setKPIForm({
                            name: kpi.name,
                            description: kpi.description || '',
                            category: kpi.category,
                            measurement_type: kpi.measurement_type,
                            target_value: kpi.target_value || '',
                            unit: kpi.unit || '',
                            frequency: kpi.frequency
                          })
                          setShowKPIForm(true)
                        }}
                        className="btn-edit-icon"
                      >
                        ✏️
                      </button>
                    </div>

                    <div className="kpi-badges-row">
                      <span className="badge-category-modern">{kpi.category}</span>
                      <span className="badge-frequency-modern">{kpi.frequency}</span>
                    </div>

                    {kpi.description && (
                      <p className="kpi-description-text">{kpi.description}</p>
                    )}

                    <div className="kpi-values-display">
                      <div className="kpi-value-item">
                        <span className="kpi-label-text">Current:</span>
                        <span className="kpi-value-text">{kpi.current_value || 0} {kpi.unit}</span>
                      </div>
                      <div className="kpi-value-item">
                        <span className="kpi-label-text">Target:</span>
                        <span className="kpi-value-text">{kpi.target_value} {kpi.unit}</span>
                      </div>
                    </div>

                    {kpi.target_value && (
                      <div className="kpi-progress-section">
                        <div className="progress-bar-large">
                          <div 
                            className="progress-fill-large"
                            style={{ 
                              width: `${getProgressPercentage(kpi.current_value || 0, kpi.target_value)}%`,
                              backgroundColor: getProgressPercentage(kpi.current_value || 0, kpi.target_value) >= 100 ? '#10b981' : '#3b82f6'
                            }}
                          ></div>
                        </div>
                        <span className="progress-percent-display">
                          {getProgressPercentage(kpi.current_value || 0, kpi.target_value).toFixed(1)}%
                        </span>
                      </div>
                    )}

                    <div className="kpi-update-input">
                      <input
                        type="number"
                        placeholder={`Update ${kpi.frequency} value`}
                        step="0.01"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && e.target.value) {
                            updateKPIValue(kpi.id, e.target.value, getCurrentPeriod(kpi.frequency))
                            e.target.value = ''
                          }
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              !showKPIForm && (
                <div className="empty-state-modern">
                  <div className="empty-icon-large">📈</div>
                  <h4>No KPIs Created</h4>
                  <p>Create your first KPI to start tracking performance metrics</p>
                  <button 
                    className="btn-add-modern"
                    onClick={() => setShowKPIForm(true)}
                  >
                    ➕ Create First KPI
                  </button>
                </div>
              )
            )}
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="analytics-section-goals">
            <div className="analytics-cards-grid">
              <div className="content-card-modern">
                <div className="card-title-section">
                  <h3>📊 Goal Analytics</h3>
                </div>
                <div className="analytics-stats-grid">
                  <div className="analytics-stat-item">
                    <span className="stat-value-analytics">{goals.length}</span>
                    <span className="stat-label-analytics">Total Goals</span>
                  </div>
                  <div className="analytics-stat-item">
                    <span className="stat-value-analytics">{goals.filter(g => g.status === 'completed').length}</span>
                    <span className="stat-label-analytics">Completed</span>
                  </div>
                  <div className="analytics-stat-item">
                    <span className="stat-value-analytics">{goals.filter(g => g.status === 'active').length}</span>
                    <span className="stat-label-analytics">In Progress</span>
                  </div>
                </div>
              </div>

              <div className="content-card-modern">
                <div className="card-title-section">
                  <h3>📈 KPI Analytics</h3>
                </div>
                <div className="analytics-stats-grid">
                  <div className="analytics-stat-item">
                    <span className="stat-value-analytics">{kpis.length}</span>
                    <span className="stat-label-analytics">Total KPIs</span>
                  </div>
                  <div className="analytics-stat-item">
                    <span className="stat-value-analytics">
                      {kpis.filter(k => k.target_value && (k.current_value || 0) >= k.target_value).length}
                    </span>
                    <span className="stat-label-analytics">Targets Met</span>
                  </div>
                  <div className="analytics-stat-item">
                    <span className="stat-value-analytics">
                      {kpis.length > 0 
                        ? Math.round(kpis.reduce((sum, k) => sum + getProgressPercentage(k.current_value || 0, k.target_value || 1), 0) / kpis.length)
                        : 0}%
                    </span>
                    <span className="stat-label-analytics">Avg Progress</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default GoalTrackingKPI
