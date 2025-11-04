
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { authAPI } from '../services/api';

const Dashboard = ({ user }) => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    clientes: 0,
    entrenadores: 0,
    administradores: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        if (user?.rol === 'Administrador') {
          const response = await authAPI.getAllUsers();
          if (response.success) {
            const users = response.data.users;
            setStats({
              totalUsers: users.length,
              clientes: users.filter(u => u.rol === 'Cliente').length,
              entrenadores: users.filter(u => u.rol === 'Entrenador').length,
              administradores: users.filter(u => u.rol === 'Administrador').length
            });
          }
        }
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [user]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return '🌅 Buenos días';
    if (hour < 18) return '☀️ Buenas tardes';
    return '🌙 Buenas noches';
  };

  const getWelcomeMessage = () => {
    switch (user?.rol) {
      case 'Administrador':
        return 'Gestiona tu gimnasio desde aquí';
      case 'Entrenador':
        return 'Ayuda a tus clientes a alcanzar sus objetivos';
      case 'Cliente':
        return '¡Es hora de entrenar y mantenerse fuerte!';
      default:
        return 'Bienvenido a Stay Hungry Gym';
    }
  };

  const calculateBMI = () => {
    if (user?.peso && user?.estatura) {
      const bmi = user.peso / (user.estatura * user.estatura);
      return bmi.toFixed(1);
    }
    return '--';
  };

  const getBMICategory = (bmi) => {
    if (bmi === '--') return '--';
    const bmiValue = parseFloat(bmi);
    if (bmiValue < 18.5) return 'Bajo peso';
    if (bmiValue < 25) return 'Peso normal';
    if (bmiValue < 30) return 'Sobrepeso';
    return 'Obesidad';
  };

  return (
    <div className="main-content">
      <div className="page-container">
        <div className="dashboard-header">
          <h1 className="dashboard-title">
            {getGreeting()}, {user?.nombre?.split(' ')[0] || 'Usuario'}
          </h1>
          <p className="dashboard-subtitle">
            {getWelcomeMessage()}
          </p>
        </div>

        {/* Estadísticas personales */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">👤</div>
            <div className="stat-value">{user?.edad || '--'}</div>
            <div className="stat-label">Años</div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">⚖️</div>
            <div className="stat-value">{user?.peso || '--'}</div>
            <div className="stat-label">Kg</div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">📏</div>
            <div className="stat-value">{user?.estatura || '--'}</div>
            <div className="stat-label">Metros</div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">📊</div>
            <div className="stat-value">{calculateBMI()}</div>
            <div className="stat-label">IMC - {getBMICategory(calculateBMI())}</div>
          </div>

          {/* Estadísticas adicionales para administradores */}
          {user?.rol === 'Administrador' && !loading && (
            <>
              <div className="stat-card">
                <div className="stat-icon">👥</div>
                <div className="stat-value">{stats.totalUsers}</div>
                <div className="stat-label">Total Usuarios</div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">🏃‍♂️</div>
                <div className="stat-value">{stats.clientes}</div>
                <div className="stat-label">Clientes</div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">💪</div>
                <div className="stat-value">{stats.entrenadores}</div>
                <div className="stat-label">Entrenadores</div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">👑</div>
                <div className="stat-value">{stats.administradores}</div>
                <div className="stat-label">Administradores</div>
              </div>
            </>
          )}
        </div>

        {/* Acciones rápidas */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h2 style={{ color: 'white', marginBottom: '2rem' }}>🚀 Acciones Rápidas</h2>
        </div>

        <div className="quick-actions">
          <Link to="/profile" className="action-card">
            <div className="action-icon">👤</div>
            <div className="action-title">Mi Perfil</div>
            <div className="action-description">
              Actualiza tus datos personales y físicos
            </div>
          </Link>

          {user?.rol === 'Cliente' && (
            <>
              
              <Link to="/routines" className="action-card">
                <div className="action-icon">📅</div>
                <div className="action-title">Mis Rutinas</div>
                 Registra tus rutinas diarias
                <div className="action-description">
                </div>
              </Link>
              

              <Link to="/progress" className="action-card">
                <div className="action-icon">📈</div>
                <div className="action-title">Progreso</div>
                <div className="action-description">
                  Da un checkeo rapido a tu progreso
                </div>
              </Link>
            </>
          )}

          {user?.rol === 'Entrenador' && (
            <>
              <Link to="/trainer/clients" className="action-card">
                <div className="action-icon">👥</div>
                <div className="action-title">Mis Clientes</div>
                <div className="action-description">
                  Gestiona tus clientes asignados
                </div>
              </Link>

              <Link to="/trainer/routines" className="action-card">
                <div className="action-icon">📝</div>
                <div className="action-title">Rutinas</div>
                <div className="action-description">
                  Ingresa y asigna rutinas
                </div>
              </Link>
            </>
          )}

          {user?.rol === 'Administrador' && (
            <>
              <Link to="/users" className="action-card">
                <div className="action-icon">👥</div>
                <div className="action-title">Gestionar Usuarios</div>
                <div className="action-description">
                  Ver y administrar todos los usuarios
                </div>
              </Link>

              <Link to="/admin-analytics" className="action-card">
                <div className="action-icon">📊</div>
                <div className="action-title">Reportes</div>
                <div className="action-description">
                  Próximamente: Análisis y estadísticas
                </div>
              </Link>

              
            </>
          )}
        </div>

        {/* Mensaje motivacional */}
        <div className="card" style={{ textAlign: 'center', marginTop: '3rem' }}>
          <h3 style={{ marginBottom: '1rem', color: '#667eea' }}>
            💪 ¡Stay Hungry, Stay Strong!
          </h3>
          <p style={{ color: '#666', fontSize: '1.1rem' }}>
            "El éxito no se da de la noche a la mañana. Se trata de trabajo duro, perseverancia y nunca rendirse."
          </p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
