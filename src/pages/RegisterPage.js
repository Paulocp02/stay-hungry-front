
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import RegisterForm from '../components/RegisterForm';

const RegisterPage = ({ onLogin }) => {
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  const handleSuccess = (user, token) => {
    setMessage('¡Registro exitoso! Redirigiendo...');
    setMessageType('success');
    setTimeout(() => {
      onLogin(user, token);
    }, 1500);
  };

  const handleError = (errorMessage) => {
    setMessage(errorMessage);
    setMessageType('error');
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="auth-title">🏋️‍♂️ Stay Hungry Gym</h1>
        <h2 className="auth-subtitle">Únete a nuestra comunidad</h2>
        
        {message && (
          <div className={`${messageType === 'success' ? 'success-message' : 'error-message'} text-center mb-2`}>
            {message}
          </div>
        )}
        
        <RegisterForm 
          onSuccess={handleSuccess}
          onError={handleError}
        />
        
        <div className="auth-switch">
          ¿Ya tienes cuenta? <Link to="/login">Inicia sesión aquí</Link>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
