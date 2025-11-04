
import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Header = ({ user, onLogout }) => {
  const location = useLocation();

  const isActive = (path) => {
    return location.pathname === path;
  };

  const getInitials = (name) => {
    return name?.split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase() || 'U';
  };

  return (
    <header className="header">
      <div className="header-content">
        <div className="logo">
          🏋️‍♂️ Stay Hungry Gym
        </div>
        
        <nav>
          <ul className="nav-menu">
            <li>
              <Link 
                to="/dashboard"
                style={{ 
                  color: isActive('/dashboard') ? '#667eea' : '#333',
                  fontWeight: isActive('/dashboard') ? '700' : '500'
                }}
              >
                🏠 Dashboard
              </Link>
            </li>
            <li>
              <Link 
                to="/profile"
                style={{ 
                  color: isActive('/profile') ? '#667eea' : '#333',
                  fontWeight: isActive('/profile') ? '700' : '500'
                }}
              >
                👤 Perfil
              </Link>
            </li>
            {user?.rol === 'Administrador' && (
              <li>
                <Link 
                  to="/users"
                  style={{ 
                    color: isActive('/users') ? '#667eea' : '#333',
                    fontWeight: isActive('/users') ? '700' : '500'
                  }}
                >
                  👥 Usuarios
                </Link>
              </li>
            )}
          </ul>
        </nav>

        <div className="user-info">
          <div className="user-avatar">
            {getInitials(user?.nombre)}
          </div>
          <div className="user-details">
            <div className="user-name">{user?.nombre}</div>
            <div className="user-role">{user?.rol}</div>
          </div>
          <button className="logout-btn" onClick={onLogout}>
            🚪 Salir
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
