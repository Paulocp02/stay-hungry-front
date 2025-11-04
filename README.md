
# 🎨 Stay Hungry Gym - Frontend

Aplicación web React moderna para el sistema de gestión de Stay Hungry Gym.

## 🚀 Inicio Rápido

```bash
# Las dependencias ya están instaladas
npm install

# Iniciar servidor de desarrollo
npm start

# Abrir en el navegador
# http://localhost:3000
```

## 📁 Estructura

```
src/
├── components/          # Componentes reutilizables
│   ├── Header.js       # Navegación principal
│   ├── Loading.js      # Indicador de carga
│   ├── LoginForm.js    # Formulario de login
│   └── RegisterForm.js # Formulario de registro
├── pages/              # Páginas principales
│   ├── Dashboard.js    # Panel principal
│   ├── LoginPage.js    # Página de inicio de sesión
│   ├── Profile.js      # Perfil de usuario
│   ├── RegisterPage.js # Página de registro
│   └── UsersList.js    # Lista de usuarios (admin)
├── services/           # Servicios de API
│   └── api.js          # Configuración Axios
├── utils/              # Utilidades
├── App.js              # Componente raíz
├── App.css             # Estilos principales
├── index.js            # Punto de entrada
└── index.css           # Estilos base
```

## 🎨 Diseño y UI

### Paleta de Colores
- **Primario**: `#667eea` (Azul)
- **Secundario**: `#764ba2` (Púrpura)
- **Acento**: `#f093fb` (Rosa)
- **Éxito**: `#27ae60` (Verde)
- **Error**: `#e74c3c` (Rojo)

### Gradientes
```css


### Efectos Especiales
- **Glassmorphism**: Cards con backdrop-filter
- **Animaciones**: Transiciones suaves
- **Hover Effects**: Elevación y sombras
- **Responsive**: Mobile-first approach

## 🧩 Componentes

### Header
Navegación principal con:
- Logo del gimnasio
- Menú de navegación
- Avatar de usuario
- Botón de logout

### Loading
Spinner animado para estados de carga.

### Forms
Formularios con validación en tiempo real:
- Validación de campos
- Mensajes de error
- Estados de loading
- Botones de prueba rápida (login)

## 📱 Páginas

### LoginPage
- Formulario de inicio de sesión
- Botones de prueba rápida por rol
- Enlaces a registro
- Validación en tiempo real

### RegisterPage
- Formulario completo de registro
- Campos de datos personales y físicos
- Validación avanzada
- Selección de rol

### Dashboard
**Vista personalizada por rol:**

#### Clientes 🏃‍♂️
- Estadísticas personales (IMC, peso, estatura)
- Acciones rápidas (perfil, rutinas*)
- Mensaje motivacional

#### Entrenadores 💪
- Sus datos personales
- Gestión de clientes*
- Creación de rutinas*

#### Administradores 👑
- Estadísticas del gimnasio
- Gestión de usuarios
- Reportes y configuración*

### Profile
- Información personal
- Actualización de datos
- Cálculo automático de IMC
- Estadísticas visuales

### UsersList (Solo Admin)
- Lista completa de usuarios
- Filtros por rol
- Búsqueda por nombre/email
- Datos físicos y estadísticas
- Cards con información detallada

## 🔄 Gestión de Estado

### Autenticación
```javascript
const [user, setUser] = useState(null);

// Login
const login = (userData, token) => {
  setUser(userData);
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(userData));
};

// Logout
const logout = () => {
  setUser(null);
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};
```

### Persistencia
- **LocalStorage** para token y datos de usuario
- **Interceptores Axios** para manejo automático de tokens
- **Redirección automática** en caso de token expirado

## 🌐 Servicios API

### Configuración Axios

```javascript
// Base URL
const API_BASE_URL = 'http://localhost:5000/api';

// Interceptor para tokens
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

### Servicios Disponibles

```javascript
// Autenticación
authAPI.register(userData)
authAPI.login(credentials)
authAPI.getProfile()
authAPI.updateProfile(userData)
authAPI.getAllUsers()

// Salud de la API
healthAPI.check()
```

## 📱 Responsive Design

### Breakpoints
```css
/* Mobile First */
@media (max-width: 480px)   /* Móviles pequeños */
@media (max-width: 768px)   /* Móviles y tablets */
@media (max-width: 1024px)  /* Tablets */
@media (min-width: 1200px)  /* Desktop */
```

### Grid System
```css
/* Grids responsivas */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 2rem;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

/* Mobile */
@media (max-width: 768px) {
  .form-row {
    grid-template-columns: 1fr;
  }
}
```

## 🔒 Seguridad Frontend

### Protección de Rutas
```javascript
// Rutas públicas (no autenticados)
{!user ? (
  <>
    <Route path="/register" element={<RegisterPage />} />
    <Route path="/login" element={<LoginPage />} />
    <Route path="*" element={<Navigate to="/login" />} />
  </>
) : (
  // Rutas privadas (autenticados)
  <>
    <Route path="/dashboard" element={<Dashboard />} />
    <Route path="/profile" element={<Profile />} />
    {user.rol === 'Administrador' && (
      <Route path="/users" element={<UsersList />} />
    )}
    <Route path="*" element={<Navigate to="/dashboard" />} />
  </>
)}
```

### Validación de Roles
```javascript
// Mostrar contenido según rol
{user?.rol === 'Administrador' && (
  <Link to="/users">Gestionar Usuarios</Link>
)}
```

## 🎯 Funcionalidades

### ✅ Implementadas
- ✅ Autenticación completa
- ✅ Dashboard personalizado por rol
- ✅ Gestión de perfil
- ✅ Lista de usuarios (admin)
- ✅ Diseño responsive
- ✅ Validación de formularios
- ✅ Manejo de errores
- ✅ Estados de carga
- ✅ Persistencia de sesión

### 🚧 En Desarrollo
- 📅 Gestión de rutinas
- 📈 Gráficos de progreso
- 📊 Dashboard avanzado
- 🔔 Notificaciones
- 📱 PWA (Progressive Web App)

## 🔧 Scripts Disponibles

```bash
# Desarrollo
npm start           # Servidor de desarrollo (puerto 3000)

# Producción
npm run build       # Build optimizado
npm run build:analyze # Analizar bundle

# Testing
npm test            # Ejecutar tests
npm run test:coverage # Coverage de tests

# Utilidades
npm run eject       # Eject de Create React App (¡Irreversible!)
```

## 🎨 Customización

### Cambiar Colores
Edita las variables CSS en `index.css`:

```css
:root {
  --primary-color: #667eea;
  --secondary-color: #764ba2;
  --accent-color: #f093fb;
  --success-color: #27ae60;
  --error-color: #e74c3c;
}
```

### Agregar Nuevos Componentes

```javascript
// components/NewComponent.js
import React from 'react';

const NewComponent = ({ prop1, prop2 }) => {
  return (
    <div className="new-component">
      <h3>{prop1}</h3>
      <p>{prop2}</p>
    </div>
  );
};

export default NewComponent;
```

### Agregar Nuevas Páginas

```javascript
// pages/NewPage.js
import React from 'react';

const NewPage = () => {
  return (
    <div className="main-content">
      <div className="page-container">
        <h1>Nueva Página</h1>
        {/* Contenido aquí */}
      </div>
    </div>
  );
};

export default NewPage;
```

## 🧪 Testing

```bash
# Ejecutar todos los tests
npm test

# Ejecutar tests específicos
npm test -- --testNamePattern="Login"

# Coverage report
npm run test:coverage
```

## 🚨 Troubleshooting

### Error de CORS
Verificar que el backend esté ejecutándose en puerto 5000.

### Problemas de Autenticación
1. Verificar que el token esté en localStorage
2. Verificar que el backend esté respondiendo
3. Limpiar localStorage y hacer login nuevamente

### Estilos no se Aplican
1. Verificar importación de archivos CSS
2. Verificar especificidad de selectores
3. Limpiar caché del navegador

### Build Fallido
```bash
# Limpiar node_modules y reinstalar
rm -rf node_modules package-lock.json
npm install
```

## 📈 Optimización

### Performance
- **Lazy Loading**: Componentes bajo demanda
- **Memoización**: React.memo para componentes pesados
- **Bundle Splitting**: Separación automática por rutas

### SEO
- **Meta tags**: Configurados en index.html
- **Títulos dinámicos**: Por página
- **Accesibilidad**: ARIA labels y roles

---

**Desarrolla con ❤️ para Stay Hungry Gym**

*¡Mantente fuerte y sigue programando!* 💪
