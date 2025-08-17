import React from 'react'


const Header = ({ employee, onMenuToggle, onLogout }) => {
  return (
    <header className="header">
      <div className="header-left">
        <button className="menu-toggle" onClick={onMenuToggle}>
          <span className="hamburger"></span>
          <span className="hamburger"></span>
          <span className="hamburger"></span>
        </button>
        <h1 className="header-title">Employee Portal</h1>
      </div>
      
      <div className="header-right">
        <div className="user-info">
          <span className="user-name">{employee?.name}</span>
          <span className="user-role">{employee?.role}</span>
        </div>
        <button className="logout-btn" onClick={onLogout}>
          Sign Out
        </button>
      </div>
    </header>
  )
}

export default Header
