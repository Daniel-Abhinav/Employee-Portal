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

  // Forms
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
        created_by: employeeId
      }

      if (editingGoal) {
        const { error } = await supabase
          .from('goals')
          .update(goalData)
          .eq('id', editingGoal.id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('goals')
          .insert([goalData])

        if (error) throw error
      }

      resetGoalForm()
      fetchGoals()
    } catch (error) {
      console.error('Error saving goal:', error)
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
      } else {
        const { error } = await supabase
          .from('kpis')
          .insert([kpiData])

        if (error) throw error
      }

      resetKPIForm()
      fetchKPIs()
    } catch (error) {
      console.error('Error saving KPI:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateGoalProgress = async (goalId, newValue, notes = '') => {
    try {
      // Add progress entry
      const { error: progressError } = await supabase
        .from('goal_progress')
        .insert([{
          goal_id: goalId,
          value: parseFloat(newValue),
          notes: notes
        }])

      if (progressError) throw progressError

      // Update current value in goals table
      const { error: updateError } = await supabase
        .from('goals')
        .update({ 
          current_value: parseFloat(newValue),
          updated_at: new Date().toISOString()
        })
        .eq('id', goalId)

      if (updateError) throw updateError

      fetchGoals()
    } catch (error) {
      console.error('Error updating goal progress:', error)
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

      // Update current value in KPIs table
      await supabase
        .from('kpis')
        .update({ 
          current_value: parseFloat(value),
          updated_at: new Date().toISOString()
        })
        .eq('id', kpiId)

      fetchKPIs()
    } catch (error) {
      console.error('Error updating KPI value:', error)
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
    return <div className="loading-screen">Loading goals and KPIs...</div>
  }

  return (
    <div className="goal-kpi-dashboard">
      <div className="dashboard-header">
        <h2>Goals & KPI Tracking</h2>
        <p>Set goals, track KPIs, and monitor your performance metrics</p>
      </div>

      {/* Navigation Tabs */}
      <div className="goal-kpi-tabs">
        <button
          className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          className={`tab-btn ${activeTab === 'goals' ? 'active' : ''}`}
          onClick={() => setActiveTab('goals')}
        >
          Goals
        </button>
        <button
          className={`tab-btn ${activeTab === 'kpis' ? 'active' : ''}`}
          onClick={() => setActiveTab('kpis')}
        >
          KPIs
        </button>
        <button
          className={`tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          Analytics
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="overview-section">
          {/* Summary Cards */}
          <div className="summary-grid">
            <div className="summary-card primary">
              <div className="summary-icon">🎯</div>
              <div className="summary-content">
                <h3>{goals.filter(g => g.status === 'active').length}</h3>
                <p>Active Goals</p>
              </div>
            </div>
            <div className="summary-card">
              <div className="summary-icon">✅</div>
              <div className="summary-content">
                <h3>{goals.filter(g => g.status === 'completed').length}</h3>
                <p>Completed Goals</p>
              </div>
            </div>
            <div className="summary-card">
              <div className="summary-icon">📈</div>
              <div className="summary-content">
                <h3>{kpis.length}</h3>
                <p>KPIs Tracked</p>
              </div>
            </div>
            <div className="summary-card">
              <div className="summary-icon">⭐</div>
              <div className="summary-content">
                <h3>
                  {goals.length > 0 
                    ? Math.round(goals.reduce((sum, g) => sum + getProgressPercentage(g.current_value || 0, g.target_value || 1), 0) / goals.length)
                    : 0}%
                </h3>
                <p>Avg Progress</p>
              </div>
            </div>
          </div>

          {/* Recent Goals */}
          <div className="modern-card">
            <div className="card-header-modern">
              <h3>Recent Goals</h3>
              <p>Your latest goal activities</p>
            </div>
            <div className="recent-goals-list">
              {goals.slice(0, 3).map((goal) => (
                <div key={goal.id} className="recent-goal-item">
                  <div className="goal-info">
                    <h4>{goal.title}</h4>
                    <span className="goal-category">{goal.category}</span>
                  </div>
                  <div className="goal-progress-mini">
                    <span>{getProgressPercentage(goal.current_value || 0, goal.target_value || 1).toFixed(1)}%</span>
                    <div className="progress-bar-mini">
                      <div 
                        className="progress-fill-mini"
                        style={{ width: `${getProgressPercentage(goal.current_value || 0, goal.target_value || 1)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* KPI Summary */}
          <div className="modern-card">
            <div className="card-header-modern">
              <h3>KPI Summary</h3>
              <p>Your key performance indicators at a glance</p>
            </div>
            <div className="kpi-summary-grid">
              {kpis.slice(0, 4).map((kpi) => (
                <div key={kpi.id} className="kpi-summary-item">
                  <h4>{kpi.name}</h4>
                  <div className="kpi-value">
                    {kpi.current_value || 0} {kpi.unit}
                  </div>
                  <div className="kpi-target">
                    Target: {kpi.target_value} {kpi.unit}
                  </div>
                  <div className="kpi-frequency">{kpi.frequency}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Goals Tab */}
      {activeTab === 'goals' && (
        <div className="goals-section">
          <div className="section-header">
            <h3>My Goals</h3>
            <button
              className="btn-modern primary"
              onClick={() => setShowGoalForm(!showGoalForm)}
            >
              {showGoalForm ? 'Cancel' : '+ Add Goal'}
            </button>
          </div>

          {/* Goal Form */}
          {showGoalForm && (
            <div className="modern-card">
              <div className="card-header-modern">
                <h3>{editingGoal ? 'Edit Goal' : 'Create New Goal'}</h3>
              </div>
              <form onSubmit={handleGoalSubmit} className="goal-form">
                <div className="form-grid">
                  <div className="form-group-modern">
                    <label>Goal Title *</label>
                    <input
                      type="text"
                      value={goalForm.title}
                      onChange={(e) => setGoalForm(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="e.g., Increase sales by 20%"
                      required
                    />
                  </div>

                  <div className="form-group-modern">
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

                  <div className="form-group-modern">
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

                  <div className="form-group-modern">
                    <label>Target Value</label>
                    <input
                      type="number"
                      value={goalForm.target_value}
                      onChange={(e) => setGoalForm(prev => ({ ...prev, target_value: e.target.value }))}
                      placeholder="100"
                      step="0.01"
                    />
                  </div>

                  <div className="form-group-modern">
                    <label>Unit</label>
                    <input
                      type="text"
                      value={goalForm.unit}
                      onChange={(e) => setGoalForm(prev => ({ ...prev, unit: e.target.value }))}
                      placeholder="Sales, Hours, Projects, %"
                    />
                  </div>

                  <div className="form-group-modern">
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

                  <div className="form-group-modern">
                    <label>Start Date *</label>
                    <input
                      type="date"
                      value={goalForm.start_date}
                      onChange={(e) => setGoalForm(prev => ({ ...prev, start_date: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="form-group-modern">
                    <label>End Date *</label>
                    <input
                      type="date"
                      value={goalForm.end_date}
                      onChange={(e) => setGoalForm(prev => ({ ...prev, end_date: e.target.value }))}
                      min={goalForm.start_date}
                      required
                    />
                  </div>

                  <div className="form-group-modern full-width">
                    <label>Description</label>
                    <textarea
                      value={goalForm.description}
                      onChange={(e) => setGoalForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Describe your goal and success criteria..."
                      rows="3"
                    />
                  </div>
                </div>

                <div className="form-actions">
                  <button type="submit" className="btn-modern primary" disabled={loading}>
                    {loading ? 'Saving...' : editingGoal ? 'Update Goal' : 'Create Goal'}
                  </button>
                  <button type="button" onClick={resetGoalForm} className="btn-modern secondary">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Goals List */}
          <div className="goals-grid">
            {goals.length > 0 ? (
              goals.map((goal) => (
                <div key={goal.id} className="goal-card">
                  <div className="goal-header">
                    <div className="goal-title-section">
                      <h4>{goal.title}</h4>
                      <div className="goal-meta">
                        <span className="goal-category">{goal.category}</span>
                        <span 
                          className="goal-priority"
                          style={{ backgroundColor: getPriorityColor(goal.priority) }}
                        >
                          {goal.priority}
                        </span>
                        <span 
                          className="goal-status"
                          style={{ backgroundColor: getStatusColor(goal.status) }}
                        >
                          {goal.status}
                        </span>
                      </div>
                    </div>
                    <div className="goal-actions">
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
                        className="btn-icon"
                      >
                        ✏️
                      </button>
                    </div>
                  </div>

                  {goal.description && (
                    <p className="goal-description">{goal.description}</p>
                  )}

                  <div className="goal-dates">
                    <span>📅 {formatDate(goal.start_date)} - {formatDate(goal.end_date)}</span>
                  </div>

                  {goal.target_value && (
                    <div className="goal-progress">
                      <div className="progress-header">
                        <span>Progress: {goal.current_value || 0} / {goal.target_value} {goal.unit}</span>
                        <span>{getProgressPercentage(goal.current_value || 0, goal.target_value).toFixed(1)}%</span>
                      </div>
                      <div className="progress-bar">
                        <div 
                          className="progress-fill"
                          style={{ width: `${getProgressPercentage(goal.current_value || 0, goal.target_value)}%` }}
                        ></div>
                      </div>
                      <div className="progress-update">
                        <input
                          type="number"
                          placeholder="Update progress"
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
              ))
            ) : (
              <div className="empty-state">
                <div className="empty-icon">🎯</div>
                <h3>No Goals Set</h3>
                <p>Create your first goal to start tracking your progress</p>
                <button 
                  className="btn-modern primary"
                  onClick={() => setShowGoalForm(true)}
                >
                  Create First Goal
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* KPIs Tab */}
      {activeTab === 'kpis' && (
        <div className="kpis-section">
          <div className="section-header">
            <h3>Key Performance Indicators</h3>
            <button
              className="btn-modern primary"
              onClick={() => setShowKPIForm(!showKPIForm)}
            >
              {showKPIForm ? 'Cancel' : '+ Add KPI'}
            </button>
          </div>

          {/* KPI Form */}
          {showKPIForm && (
            <div className="modern-card">
              <div className="card-header-modern">
                <h3>{editingKPI ? 'Edit KPI' : 'Create New KPI'}</h3>
              </div>
              <form onSubmit={handleKPISubmit} className="kpi-form">
                <div className="form-grid">
                  <div className="form-group-modern">
                    <label>KPI Name *</label>
                    <input
                      type="text"
                      value={kpiForm.name}
                      onChange={(e) => setKPIForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., Monthly Sales Revenue"
                      required
                    />
                  </div>

                  <div className="form-group-modern">
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

                  <div className="form-group-modern">
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

                  <div className="form-group-modern">
                    <label>Target Value</label>
                    <input
                      type="number"
                      value={kpiForm.target_value}
                      onChange={(e) => setKPIForm(prev => ({ ...prev, target_value: e.target.value }))}
                      placeholder="Target value"
                      step="0.01"
                    />
                  </div>

                  <div className="form-group-modern">
                    <label>Unit</label>
                    <input
                      type="text"
                      value={kpiForm.unit}
                      onChange={(e) => setKPIForm(prev => ({ ...prev, unit: e.target.value }))}
                      placeholder="$, %, hrs, calls, etc."
                    />
                  </div>

                  <div className="form-group-modern">
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

                  <div className="form-group-modern full-width">
                    <label>Description</label>
                    <textarea
                      value={kpiForm.description}
                      onChange={(e) => setKPIForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Describe what this KPI measures..."
                      rows="3"
                    />
                  </div>
                </div>

                <div className="form-actions">
                  <button type="submit" className="btn-modern primary" disabled={loading}>
                    {loading ? 'Saving...' : editingKPI ? 'Update KPI' : 'Create KPI'}
                  </button>
                  <button type="button" onClick={resetKPIForm} className="btn-modern secondary">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* KPIs List */}
          <div className="kpis-grid">
            {kpis.length > 0 ? (
              kpis.map((kpi) => (
                <div key={kpi.id} className="kpi-card">
                  <div className="kpi-header">
                    <div className="kpi-title-section">
                      <h4>{kpi.name}</h4>
                      <div className="kpi-meta">
                        <span className="kpi-category">{kpi.category}</span>
                        <span className="kpi-frequency">{kpi.frequency}</span>
                      </div>
                    </div>
                    <div className="kpi-actions">
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
                        className="btn-icon"
                      >
                        ✏️
                      </button>
                    </div>
                  </div>

                  {kpi.description && (
                    <p className="kpi-description">{kpi.description}</p>
                  )}

                  <div className="kpi-values">
                    <div className="kpi-current">
                      <span className="kpi-label">Current:</span>
                      <span className="kpi-value">{kpi.current_value || 0} {kpi.unit}</span>
                    </div>
                    <div className="kpi-target">
                      <span className="kpi-label">Target:</span>
                      <span className="kpi-value">{kpi.target_value} {kpi.unit}</span>
                    </div>
                  </div>

                  {kpi.target_value && (
                    <div className="kpi-progress">
                      <div className="progress-bar">
                        <div 
                          className="progress-fill"
                          style={{ 
                            width: `${getProgressPercentage(kpi.current_value || 0, kpi.target_value)}%`,
                            backgroundColor: getProgressPercentage(kpi.current_value || 0, kpi.target_value) >= 100 ? '#10b981' : '#3b82f6'
                          }}
                        ></div>
                      </div>
                      <span className="progress-percentage">
                        {getProgressPercentage(kpi.current_value || 0, kpi.target_value).toFixed(1)}%
                      </span>
                    </div>
                  )}

                  <div className="kpi-update">
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
              ))
            ) : (
              <div className="empty-state">
                <div className="empty-icon">📈</div>
                <h3>No KPIs Created</h3>
                <p>Create your first KPI to start tracking performance metrics</p>
                <button 
                  className="btn-modern primary"
                  onClick={() => setShowKPIForm(true)}
                >
                  Create First KPI
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="analytics-section">
          <div className="section-header">
            <h3>Performance Analytics</h3>
            <p>Insights and trends from your goals and KPIs</p>
          </div>

          <div className="analytics-grid">
            {/* Goal Analytics */}
            <div className="modern-card">
              <div className="card-header-modern">
                <h3>📊 Goal Analytics</h3>
              </div>
              <div className="analytics-stats">
                <div className="stat-item">
                  <span className="stat-value">{goals.length}</span>
                  <span className="stat-label">Total Goals</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value">{goals.filter(g => g.status === 'completed').length}</span>
                  <span className="stat-label">Completed</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value">{goals.filter(g => g.status === 'active').length}</span>
                  <span className="stat-label">In Progress</span>
                </div>
              </div>
            </div>

            {/* KPI Analytics */}
            <div className="modern-card">
              <div className="card-header-modern">
                <h3>📈 KPI Analytics</h3>
              </div>
              <div className="analytics-stats">
                <div className="stat-item">
                  <span className="stat-value">{kpis.length}</span>
                  <span className="stat-label">Total KPIs</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value">
                    {kpis.filter(k => k.target_value && (k.current_value || 0) >= k.target_value).length}
                  </span>
                  <span className="stat-label">Targets Met</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value">
                    {kpis.length > 0 
                      ? Math.round(kpis.reduce((sum, k) => sum + getProgressPercentage(k.current_value || 0, k.target_value || 1), 0) / kpis.length)
                      : 0}%
                  </span>
                  <span className="stat-label">Avg Progress</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default GoalTrackingKPI
