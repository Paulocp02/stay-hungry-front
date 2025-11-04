
import React, { useState } from 'react';
import { authAPI } from '../services/api';

const LoginForm = ({ onSuccess, onError }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Limpiar error del campo al escribir
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email) {
      newErrors.email = 'El email es requerido';
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = 'Ingresa un email válido';
    }

    // Validar contraseña
    if (!formData.password) {
      newErrors.password = 'La contraseña es requerida';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    
    try {
      const response = await authAPI.login(formData);
      
      if (response.success) {
        onSuccess(response.data.user, response.data.token);
      }
    } catch (error) {
      console.error('Error en login:', error);
      onError(error.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  /*
  const fillTestCredentials = (role) => {
    const testCredentials = {
      admin: { email: 'admin@stayhungrygym.com', password: 'admin123' },
      trainer: { email: 'roberto.trainer@stayhungrygym.com', password: 'trainer123' },
      client: { email: 'juan.cliente@gmail.com', password: 'cliente123' }
    };

    setFormData(testCredentials[role]);
  };
  */

  return (
    <div className="fade-in">
      {/* Botones de prueba rápida 
      <div className="mb-3">
        <p className="form-label text-center">Prueba rápida:</p>
        <div className="flex gap-1" style={{ flexWrap: 'wrap', justifyContent: 'center' }}>
          <button
            type="button"
            onClick={() => fillTestCredentials('admin')}
            className="btn-outline"
            style={{ fontSize: '12px', padding: '6px 12px' }}
          >
            👑 Admin
          </button>
          <button
            type="button"
            onClick={() => fillTestCredentials('trainer')}
            className="btn-outline"
            style={{ fontSize: '12px', padding: '6px 12px' }}
          >
            💪 Entrenador
          </button>
          <button
            type="button"
            onClick={() => fillTestCredentials('client')}
            className="btn-outline"
            style={{ fontSize: '12px', padding: '6px 12px' }}
          >
            👤 Cliente
          </button>
        </div>
      </div>
      */}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Email</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className="form-input"
            placeholder="tu@email.com"
          />
          {errors.email && <div className="error-message">{errors.email}</div>}
        </div>

        <div className="form-group">
          <label className="form-label">Contraseña</label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            className="form-input"
            placeholder="Tu contraseña"
          />
          {errors.password && <div className="error-message">{errors.password}</div>}
        </div>

        <button 
          type="submit" 
          className="btn" 
          disabled={loading}
          style={{ width: '100%', marginTop: '1rem' }}
        >
          {loading ? '🔄 Iniciando sesión...' : '🚀 Iniciar Sesión'}
        </button>
      </form>
    </div>
  );
};

export default LoginForm;
