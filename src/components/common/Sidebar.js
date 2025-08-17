import React from 'react'
import { Link, useLocation } from 'react-router-dom'


const Sidebar = ({ isOpen, onClose }) => {
  const location = useLocation()

  const menuItems = [
    { path: '/', label: 'Dashboard', icon: '📊' },
    { path: '/profile', label: 'My Profile', icon: '👤' },
    { path: '/attendance', label: 'Attendance', icon: '🕒' },
    { path: '/leave', label: 'Leave Request', icon: '📅' },
    { path: '/expense', label: 'Expenses', icon: '💰' }
  ]

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && <div className="sidebar-overlay" onClick={onClose}></div>}
      
      <nav className={`sidebar ${isOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-header">
          <h2>Navigation</h2>
          <button className="sidebar-close" onClick={onClose}>×</button>
        </div>
        
        <ul className="sidebar-menu">
          {menuItems.map((item) => (
            <li key={item.path} className="sidebar-item">
              <Link
                to={item.path}
                className={`sidebar-link ${location.pathname === item.path ? 'active' : ''}`}
                onClick={onClose}
              >
                <span className="sidebar-icon">{item.icon}</span>
                <span className="sidebar-label">{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  )
}

export default Sidebar
