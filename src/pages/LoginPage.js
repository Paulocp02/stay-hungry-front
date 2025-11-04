
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import LoginForm from '../components/LoginForm';

const LoginPage = ({ onLogin }) => {
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  const handleSuccess = (user, token) => {
    setMessage('¡Login exitoso! Redirigiendo...');
    setMessageType('success');
    setTimeout(() => {
      onLogin(user, token);
    }, 1000);
  };

  const handleError = (errorMessage) => {
    setMessage(errorMessage);
    setMessageType('error');
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="auth-title">🏋️‍♂️ Stay Hungry Gym</h1>
        <h2 className="auth-subtitle">Bienvenido de vuelta</h2>
        
        {message && (
          <div className={`${messageType === 'success' ? 'success-message' : 'error-message'} text-center mb-2`}>
            {message}
          </div>
        )}
        
        <LoginForm 
          onSuccess={handleSuccess}
          onError={handleError}
        />
        
        <div className="auth-switch">
          ¿No tienes cuenta? <Link to="/register">Regístrate aquí</Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
