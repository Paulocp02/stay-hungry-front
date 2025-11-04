// src/App.js
import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import RegisterPage from './pages/RegisterPage';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import UsersList from './pages/UsersList';
import Progress from './pages/Progress';
import TrainerClients from './pages/TrainerClients';
import TrainerRoutines from './pages/TrainerRoutines';
import Routines from './pages/Routines';
import Header from './components/Header';
import Loading from './components/Loading';
import AdminAnalitics from './pages/AdminAnalitics';
import Tracker from './utils/tracker';

import './App.css';

// -------- Axios --------
axios.defaults.baseURL = 'http://localhost:5000';

axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Componente que envía pageviews y mantiene heartbeat
function RouteTracker({ user }) {
   const location = useLocation();
   const trackerRef = useRef(null);

   // Crear / destruir instancia al entrar/salir usuario
   useEffect(() => {
     if (user && !trackerRef.current) {
       // pasa una función que devuelva el usuario actual
       trackerRef.current = new Tracker(() => user);
       trackerRef.current.start();
     }
     if (!user && trackerRef.current) {
       trackerRef.current.stop();
       trackerRef.current = null;
     }
   }, [user]);

   // Page view en cada navegación
   useEffect(() => {
     if (trackerRef.current) {
       trackerRef.current.pageView(location.pathname);
     }
   }, [location.pathname]);

   return null;
 }

function AppRoutes({ user, logout, updateUser, onLogin }) {
  return (
    <>
      {user && <Header user={user} onLogout={logout} />}

      <Routes>
        {!user ? (
          <>
            <Route path="/register" element={<RegisterPage onLogin={onLogin} />} />
            <Route path="/login" element={<LoginPage onLogin={onLogin} />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </>
        ) : (
          <>
            <Route path="/dashboard" element={<Dashboard user={user} />} />
            <Route path="/profile" element={<Profile user={user} onUpdateUser={updateUser} />} />
            <Route path="/progress" element={<Progress user={user} />} />

            {/* Entrenador */}
            {user.rol === 'Entrenador' && (
              <>
                <Route path="/trainer/clients" element={<TrainerClients user={user} />} />
                <Route path="/trainer/routines" element={<TrainerRoutines user={user} />} />
              </>
            )}

            {/* Cliente */}
            {user.rol === 'Cliente' && (
              <Route path="/routines" element={<Routines user={user} />} />
            )}

            {/* Administrador */}
            {user.rol === 'Administrador' && (
              <>
                <Route path="/users" element={<UsersList />} />
                <Route path="/admin-analytics" element={<AdminAnalitics />} />
              </>
            )}

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </>
        )}
      </Routes>
    </>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');

    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        console.error('Error parsing saved user:', e);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  const login = (userData, token) => {
    setUser(userData);
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  const updateUser = (updatedUserData) => {
    setUser(updatedUserData);
    localStorage.setItem('user', JSON.stringify(updatedUserData));
  };

  if (loading) return <Loading />;

  return (
    <Router>
      <RouteTracker user={user} />
      <div className="App">
        <AppRoutes
          user={user}
          logout={logout}
          updateUser={updateUser}
          onLogin={login}
        />
      </div>
    </Router>
  );
}
