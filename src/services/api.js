// src/services/api.js
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000',
  withCredentials: false,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const unwrap = (p) => p.then((r) => r.data);

// ⬇️ Named export: authAPI
export const authAPI = {
  // Auth
  login:        (payload) => unwrap(api.post('/api/auth/login', payload)),
  register:     (payload) => unwrap(api.post('/api/auth/register', payload)),
  getProfile:                () => unwrap(api.get('/api/auth/profile')),
  updateProfile:(payload)    => unwrap(api.put('/api/auth/profile', payload)),

  // Admin
  getAllUsers: (include = 'all') =>
  unwrap(api.get('/api/auth/users', { params: { include } })),

// Actualiza cualquier campo permitido (nombre, rol, edad, peso, estatura) — backend: PUT /users/:id
adminUpdateUser: (userId, payload) =>
  unwrap(
    api.put(`/api/auth/users/${userId}`, payload, {
      headers: { 'Content-Type': 'application/json' },
    })
  ),

// Activar / desactivar (soft delete) — backend: PUT /users/:id/status
adminSetUserStatus: (userId, activo) =>
  unwrap(
    api.put(
      `/api/auth/users/${userId}/status`,
      { activo },
      { headers: { 'Content-Type': 'application/json' } }
    )
  ),
};


