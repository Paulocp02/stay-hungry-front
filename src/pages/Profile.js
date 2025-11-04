
import React, { useState } from 'react';
import { authAPI } from '../services/api';

const Profile = ({ user, onUpdateUser }) => {
  const [formData, setFormData] = useState({
    nombre: user?.nombre || '',
    edad: user?.edad || '',
    peso: user?.peso || '',
    estatura: user?.estatura || ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
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

    // Validar nombre
    if (!formData.nombre.trim()) {
      newErrors.nombre = 'El nombre es requerido';
    } else if (formData.nombre.trim().length < 2) {
      newErrors.nombre = 'El nombre debe tener al menos 2 caracteres';
    }

    // Validar edad
    const edad = parseInt(formData.edad);
    if (!formData.edad) {
      newErrors.edad = 'La edad es requerida';
    } else if (isNaN(edad) || edad < 16 || edad > 100) {
      newErrors.edad = 'La edad debe estar entre 16 y 100 años';
    }

    // Validar peso
    const peso = parseFloat(formData.peso);
    if (!formData.peso) {
      newErrors.peso = 'El peso es requerido';
    } else if (isNaN(peso) || peso < 30 || peso > 300) {
      newErrors.peso = 'El peso debe estar entre 30 y 300 kg';
    }

    // Validar estatura
    const estatura = parseFloat(formData.estatura);
    if (!formData.estatura) {
      newErrors.estatura = 'La estatura es requerida';
    } else if (isNaN(estatura) || estatura < 1.0 || estatura > 2.5) {
      newErrors.estatura = 'La estatura debe estar entre 1.0 y 2.5 metros';
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
    setMessage('');
    
    try {
      const response = await authAPI.updateProfile(formData);
      
      if (response.success) {
        onUpdateUser(response.data.user);
        setMessage('¡Perfil actualizado exitosamente!');
        setMessageType('success');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage(error.message || 'Error al actualizar perfil');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const calculateBMI = () => {
    if (formData.peso && formData.estatura) {
      const bmi = parseFloat(formData.peso) / (parseFloat(formData.estatura) * parseFloat(formData.estatura));
      return bmi.toFixed(1);
    }
    return '--';
  };

  const getBMICategory = (bmi) => {
    if (bmi === '--') return { text: '--', color: '#666' };
    const bmiValue = parseFloat(bmi);
    if (bmiValue < 18.5) return { text: 'Bajo peso', color: '#3498db' };
    if (bmiValue < 25) return { text: 'Peso normal', color: '#27ae60' };
    if (bmiValue < 30) return { text: 'Sobrepeso', color: '#f39c12' };
    return { text: 'Obesidad', color: '#e74c3c' };
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'No disponible';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="main-content">
      <div className="page-container">
        <div className="dashboard-header">
          <h1 className="dashboard-title">👤 Mi Perfil</h1>
          <p className="dashboard-subtitle">
            Mantén tu información actualizada
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
          {/* Información del perfil */}
          <div className="card">
            <h3 style={{ marginBottom: '2rem', color: '#667eea' }}>
              📋 Información Personal
            </h3>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <strong>Email:</strong>
              <p style={{ color: '#666', marginTop: '0.5rem' }}>{user?.email}</p>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <strong>Rol:</strong>
              <p style={{ color: '#667eea', marginTop: '0.5rem', fontWeight: '600' }}>
                {user?.rol === 'Cliente' && '🏃‍♂️ Cliente'}
                {user?.rol === 'Entrenador' && '💪 Entrenador'}
                {user?.rol === 'Administrador' && '👑 Administrador'}
              </p>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <strong>Miembro desde:</strong>
              <p style={{ color: '#666', marginTop: '0.5rem' }}>
                {formatDate(user?.fecha_registro)}
              </p>
            </div>

            <div>
              <strong>IMC Actual:</strong>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem' }}>
                <span style={{ fontSize: '1.5rem', fontWeight: '700', color: '#667eea' }}>
                  {calculateBMI()}
                </span>
                <span style={{ color: getBMICategory(calculateBMI()).color, fontWeight: '600' }}>
                  {getBMICategory(calculateBMI()).text}
                </span>
              </div>
            </div>
          </div>

          {/* Estadísticas rápidas */}
          <div className="card">
            <h3 style={{ marginBottom: '2rem', color: '#667eea' }}>
              📊 Datos Físicos
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div style={{ textAlign: 'center', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '10px' }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>⚖️</div>
                <div style={{ fontSize: '1.2rem', fontWeight: '600' }}>{user?.peso || '--'}</div>
                <div style={{ fontSize: '0.9rem', color: '#666' }}>Kg</div>
              </div>
              
              <div style={{ textAlign: 'center', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '10px' }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>📏</div>
                <div style={{ fontSize: '1.2rem', fontWeight: '600' }}>{user?.estatura || '--'}</div>
                <div style={{ fontSize: '0.9rem', color: '#666' }}>Metros</div>
              </div>
              
              <div style={{ textAlign: 'center', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '10px' }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🎂</div>
                <div style={{ fontSize: '1.2rem', fontWeight: '600' }}>{user?.edad || '--'}</div>
                <div style={{ fontSize: '0.9rem', color: '#666' }}>Años</div>
              </div>
              
              <div style={{ textAlign: 'center', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '10px' }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>📊</div>
                <div style={{ fontSize: '1.2rem', fontWeight: '600' }}>{calculateBMI()}</div>
                <div style={{ fontSize: '0.9rem', color: '#666' }}>IMC</div>
              </div>
            </div>
          </div>
        </div>

        {/* Formulario de actualización */}
        <div className="card">
          <h3 style={{ marginBottom: '2rem', color: '#667eea' }}>
            ✏️ Actualizar Información
          </h3>

          {message && (
            <div className={`${messageType === 'success' ? 'success-message' : 'error-message'} text-center mb-2`}>
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="fade-in">
            <div className="form-group">
              <label className="form-label">Nombre completo</label>
              <input
                type="text"
                name="nombre"
                value={formData.nombre}
                onChange={handleChange}
                className="form-input"
                placeholder="Tu nombre completo"
              />
              {errors.nombre && <div className="error-message">{errors.nombre}</div>}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Edad (años)</label>
                <input
                  type="number"
                  name="edad"
                  value={formData.edad}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="Tu edad"
                  min="16"
                  max="100"
                />
                {errors.edad && <div className="error-message">{errors.edad}</div>}
              </div>

              <div className="form-group">
                <label className="form-label">Peso (kg)</label>
                <input
                  type="number"
                  name="peso"
                  value={formData.peso}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="Tu peso en kg"
                  min="30"
                  max="300"
                  step="0.1"
                />
                {errors.peso && <div className="error-message">{errors.peso}</div>}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Estatura (metros)</label>
              <input
                type="number"
                name="estatura"
                value={formData.estatura}
                onChange={handleChange}
                className="form-input"
                placeholder="Tu estatura en metros (ej: 1.75)"
                min="1.0"
                max="2.5"
                step="0.01"
              />
              {errors.estatura && <div className="error-message">{errors.estatura}</div>}
            </div>

            <button 
              type="submit" 
              className="btn" 
              disabled={loading}
              style={{ width: '100%', marginTop: '1rem' }}
            >
              {loading ? '🔄 Actualizando...' : '💾 Actualizar Perfil'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Profile;
