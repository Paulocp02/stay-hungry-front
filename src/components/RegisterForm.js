
import React, { useState } from 'react';
import { authAPI } from '../services/api';

const RegisterForm = ({ onSuccess, onError }) => {
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    password: '',
    confirmPassword: '',
    edad: '',
    peso: '',
    estatura: '',
    
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

    // Validar nombre
    if (!formData.nombre.trim()) {
      newErrors.nombre = 'El nombre es requerido';
    } else if (formData.nombre.trim().length < 2) {
      newErrors.nombre = 'El nombre debe tener al menos 2 caracteres';
    }

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
    } else if (formData.password.length < 6) {
      newErrors.password = 'La contraseña debe tener al menos 6 caracteres';
    }

    // Validar confirmación de contraseña
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Confirma tu contraseña';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Las contraseñas no coinciden';
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
    
    try {
      const { confirmPassword, ...dataToSend } = formData;
      const response = await authAPI.register(dataToSend);
      
      if (response.success) {
        onSuccess(response.data.user, response.data.token);
      }
    } catch (error) {
      console.error('Error en registro:', error);
      onError(error.message || 'Error al registrar usuario');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="fade-in">
      <div className="form-group">
        <label className="form-label">Nombre completo</label>
        <input
          type="text"
          name="nombre"
          value={formData.nombre}
          onChange={handleChange}
          className="form-input"
          placeholder="Ingresa tu nombre completo"
        />
        {errors.nombre && <div className="error-message">{errors.nombre}</div>}
      </div>

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

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Contraseña</label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            className="form-input"
            placeholder="Mínimo 6 caracteres"
          />
          {errors.password && <div className="error-message">{errors.password}</div>}
        </div>

        <div className="form-group">
          <label className="form-label">Confirmar contraseña</label>
          <input
            type="password"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            className="form-input"
            placeholder="Repite tu contraseña"
          />
          {errors.confirmPassword && <div className="error-message">{errors.confirmPassword}</div>}
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Edad</label>
          <input
            type="number"
            name="edad"
            value={formData.edad}
            onChange={handleChange}
            className="form-input"
            placeholder="Años"
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
            placeholder="70.5"
            min="30"
            max="300"
            step="0.1"
          />
          {errors.peso && <div className="error-message">{errors.peso}</div>}
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Estatura (m)</label>
          <input
            type="number"
            name="estatura"
            value={formData.estatura}
            onChange={handleChange}
            className="form-input"
            placeholder="1.75"
            min="1.0"
            max="2.5"
            step="0.01"
          />
          {errors.estatura && <div className="error-message">{errors.estatura}</div>}
        </div>

        
      </div>

      <button 
        type="submit" 
        className="btn" 
        disabled={loading}
        style={{ width: '100%', marginTop: '1rem' }}
      >
        {loading ? '🔄 Registrando...' : '🚀 Registrarse'}
      </button>
    </form>
  );
};

export default RegisterForm;
