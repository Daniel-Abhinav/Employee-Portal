import React, { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'

const Sidebar = ({ isOpen, onClose, userRole }) => {
  const location = useLocation()
  const [expandedMenus, setExpandedMenus] = useState({})

  const toggleMenu = (menuKey) => {
    setExpandedMenus(prev => ({
      ...prev,
      [menuKey]: !prev[menuKey]
    }))
  }

  const handleLinkClick = () => {
    // Close sidebar on mobile when link is clicked
    if (window.innerWidth <= 768) {
      onClose()
    }
  }

  const sidebarItems = [
    {
      key: 'dashboard',
      path: '/',
      icon: '🏠',
      label: 'Dashboard',
      roles: ['admin', 'employee']
    },
    {
      key: 'profile',
      path: '/profile',
      icon: '👤',
      label: 'My Profile',
      roles: ['admin', 'employee']
    },
    {
      key: 'attendance',
      path: '/attendance',
      icon: '⏰',
      label: 'Attendance',
      roles: ['admin', 'employee']
    },
    {
      key: 'leave',
      path: '/leave',
      icon: '🏖️',
      label: 'Leave Management',
      roles: ['admin', 'employee']
    },
    {
      key: 'expense',
      path: '/expense',
      icon: '💰',
      label: 'Expenses',
      roles: ['admin', 'employee']
    },
    {
      key: 'performance',
      path: '/performance',
      icon: '📝',
      label: 'Performance Reviews',
      roles: ['admin', 'employee']
    },
    {
      key: 'goals-kpi',
      path: '/goals-kpi',
      icon: '🎯',
      label: 'Goals & KPIs',
      roles: ['admin', 'employee']
    },
    // Admin-only sections
    {
      key: 'reports',
      path: '/reports',
      icon: '📊',
      label: 'Reports & Analytics',
      roles: ['admin', 'hr_manager']
    },
    {
      key: 'employees',
      path: '/employees',
      icon: '👥',
      label: 'Employee Management',
      roles: ['admin', 'hr_manager']
    },
    {
      key: 'admin-performance',
      path: '/admin/performance',
      icon: '📈',
      label: 'Performance Management',
      roles: ['admin', 'hr_manager']
    },
    {
      key: 'admin-goals',
      path: '/admin/goals',
      icon: '🎯',
      label: 'Goal Management',
      roles: ['admin', 'hr_manager']
    },
    {
      key: 'payroll',
      path: '/payroll',
      icon: '💸',
      label: 'Payroll',
      roles: ['admin', 'hr_manager']
    },
    {
      key: 'settings',
      path: '/settings',
      icon: '⚙️',
      label: 'Settings',
      roles: ['admin']
    }
  ]

  // Filter items based on user role
  const filteredItems = sidebarItems.filter(item => 
    !item.roles || item.roles.includes(userRole) || userRole === 'admin'
  )

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="sidebar-overlay"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <div className={`sidebar ${isOpen ? 'sidebar-open' : ''}`}>
        {/* Sidebar Header */}
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <span className="logo-icon">🏢</span>
            <span className="logo-text">EMS Portal</span>
          </div>
          <button 
            className="sidebar-close"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        {/* Navigation Menu */}
        <nav className="sidebar-nav">
          <ul className="nav-list">
            {filteredItems.map((item) => {
              if (item.children) {
                // Handle submenu items (for future expansion)
                const isExpanded = expandedMenus[item.key]
                const hasActiveChild = item.children.some(child => 
                  location.pathname === child.path
                )

                return (
                  <li key={item.key} className="nav-item">
                    <button
                      className={`nav-link nav-toggle ${hasActiveChild ? 'active' : ''}`}
                      onClick={() => toggleMenu(item.key)}
                    >
                      <span className="nav-icon">{item.icon}</span>
                      <span className="nav-text">{item.label}</span>
                      <span className={`nav-arrow ${isExpanded ? 'expanded' : ''}`}>
                        ▼
                      </span>
                    </button>
                    
                    <ul className={`nav-submenu ${isExpanded ? 'expanded' : ''}`}>
                      {item.children.map((child) => (
                        <li key={child.key} className="nav-subitem">
                          <NavLink
                            to={child.path}
                            className={({ isActive }) => 
                              `nav-sublink ${isActive ? 'active' : ''}`
                            }
                            onClick={handleLinkClick}
                          >
                            <span className="nav-subicon">{child.icon}</span>
                            <span className="nav-subtext">{child.label}</span>
                          </NavLink>
                        </li>
                      ))}
                    </ul>
                  </li>
                )
              } else {
                // Handle regular menu items
                return (
                  <li key={item.key} className="nav-item">
                    <NavLink
                      to={item.path}
                      className={({ isActive }) => 
                        `nav-link ${isActive ? 'active' : ''}`
                      }
                      onClick={handleLinkClick}
                    >
                      <span className="nav-icon">{item.icon}</span>
                      <span className="nav-text">{item.label}</span>
                      {item.badge && (
                        <span className="nav-badge">{item.badge}</span>
                      )}
                    </NavLink>
                  </li>
                )
              }
            })}
          </ul>
        </nav>

        {/* Sidebar Footer */}
        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">
              <span>{userRole?.charAt(0)?.toUpperCase() || 'U'}</span>
            </div>
            <div className="user-details">
              <div className="user-role">{userRole || 'Employee'}</div>
              <div className="user-status">Online</div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default Sidebar
