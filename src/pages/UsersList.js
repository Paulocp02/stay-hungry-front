import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { authAPI } from '../services/api';
import Loading from '../components/Loading';

const ROLE_OPTIONS = ['Administrador', 'Entrenador', 'Cliente'];
const STATE_OPTIONS = ['Todos', 'Activos', 'Inactivos'];

const UsersList = () => {
  const [users, setUsers] = useState([]);
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [filter, setFilter] = useState('Todos');          // por rol
  const [stateFilter, setStateFilter] = useState('Todos'); // por estado
  const [searchTerm, setSearchTerm] = useState('');

  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState({ nombre: '', rol: '' });

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [u, p] = await Promise.all([
          authAPI.getAllUsers('all'),  // activos e inactivos
          authAPI.getProfile?.()
        ]);
        if (u?.success) setUsers(u.data.users || []);
        if (p?.success) setMe(p.data.user || null);
      } catch (e) {
        console.error(e);
        setError('Error al cargar usuarios');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const isAdmin = (me?.rol || me?.role) === 'Administrador';

  const filteredUsers = users.filter(u => {
    const byRole = filter === 'Todos' || u.rol === filter;
    const byState =
      stateFilter === 'Todos' ||
      (stateFilter === 'Activos' && u.activo === 1) ||
      (stateFilter === 'Inactivos' && u.activo === 0);
    const term = searchTerm.toLowerCase();
    const bySearch =
      (u.nombre || '').toLowerCase().includes(term) ||
      (u.email || '').toLowerCase().includes(term);
    return byRole && byState && bySearch;
  });

  const getUsersByRole = (role) => users.filter(u => u.rol === role && u.activo === 1).length;

  const calculateBMI = (peso, est) => (!peso || !est) ? '--' : (peso / (est * est)).toFixed(1);
  const getBMICategory = (b) => {
    if (b === '--') return { text: '--', color: '#666' };
    const v = parseFloat(b);
    if (v < 18.5) return { text: 'Bajo peso', color: '#3498db' };
    if (v < 25) return { text: 'Normal', color: '#27ae60' };
    if (v < 30) return { text: 'Sobrepeso', color: '#f39c12' };
    return { text: 'Obesidad', color: '#e74c3c' };
  };
  const formatDate = (d) =>
    d ? new Date(d).toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' }) : 'No disponible';
  
  const getRoleColor = (r) => r === 'Cliente' ? '#3498db' : r === 'Entrenador' ? '#27ae60' : r === 'Administrador' ? '#e74c3c' : '#666';

  // ===== XLSX =====
  const exportXlsx = () => {
    const rows = (arr) => arr.map(u => {
      const bmi = calculateBMI(u.peso, u.estatura);
      return {
        ID: u.id,
        Nombre: u.nombre || '',
        Email: u.email || '',
        Rol: u.rol || '',
        Edad: u.edad ?? '',
        Peso_kg: u.peso ?? '',
        Estatura_m: u.estatura ?? '',
        IMC: bmi === '--' ? '' : Number(bmi),
        Categoria_IMC: getBMICategory(bmi).text,
        Activo: u.activo ? 'Sí' : 'No',
        Miembro_desde: formatDate(u.fecha_registro)
      };
    });

    const wb = XLSX.utils.book_new();
    const add = (r, name) => {
      const ws = XLSX.utils.json_to_sheet(r.length ? r : [{}]);
      if (ws['!ref']) ws['!autofilter'] = { ref: ws['!ref'] };
      ws['!cols'] = [
        { wch: 6 }, { wch: 26 }, { wch: 30 }, { wch: 14 },
        { wch: 6 }, { wch: 8 }, { wch: 10 }, { wch: 8 }, { wch: 6 }, { wch: 16 }
      ];
      XLSX.utils.book_append_sheet(wb, ws, name);
    };
    add(rows(users), 'Todos');
    add(rows(users.filter(u => u.rol === 'Administrador')), 'Administradores');
    add(rows(users.filter(u => u.rol === 'Entrenador')), 'Entrenadores');
    add(rows(users.filter(u => u.rol === 'Cliente')), 'Clientes');
    XLSX.writeFile(wb, `usuarios_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // ===== CRUD (usa nuevos métodos del api) =====
  const startEdit = (u) => {
    setEditingId(u.id);
    setDraft({ nombre: u.nombre || '', rol: u.rol || 'Cliente' });
  };
  const cancelEdit = () => { setEditingId(null); setDraft({ nombre: '', rol: '' }); };

  const saveEdit = async (id) => {
    try {
      const payload = {};
      if (draft.nombre?.trim()) payload.nombre = draft.nombre.trim();
      if (draft.rol) payload.rol = draft.rol;

      if (!payload.nombre) return alert('El nombre no puede ir vacío.');
      await authAPI.adminUpdateUser(id, payload);          // <-- actualizado
      setUsers(prev => prev.map(u => (u.id === id ? { ...u, ...payload } : u)));
      cancelEdit();
    } catch (e) {
      console.error(e);
      alert(e.response?.data?.message || e.response?.data?.error || 'No se pudo actualizar');
    }
  };

  const toggleActive = async (id, current) => {
    try {
      const nuevo = current ? 0 : 1;
      await authAPI.adminSetUserStatus(id, nuevo);         // <-- actualizado
      setUsers(prev => prev.map(u => (u.id === id ? { ...u, activo: nuevo } : u)));
    } catch (e) {
      console.error(e);
      alert(e.response?.data?.message || e.response?.data?.error || 'No se pudo cambiar el estado');
    }
  };

  if (loading) return <Loading message="Cargando usuarios..." />;

  return (
    <div className="main-content">
      <div className="page-container">
        <div className="dashboard-header">
          <h1 className="dashboard-title">👥 Gestión de Usuarios</h1>
          <p className="dashboard-subtitle">Administra todos los miembros de Stay Hungry Gym</p>
          <div style={{ marginTop: '1rem' }}>
            <button className="logout-btn" onClick={exportXlsx}>Exportar XLSX</button>
          </div>
        </div>

        {error && <div className="error-message text-center mb-3">{error}</div>}

        {/* Stats (sólo activos) */}
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
          <div className="stat-card"><div className="stat-icon">👥</div><div className="stat-value">{users.filter(u => u.activo === 1).length}</div><div className="stat-label">Usuarios activos</div></div>
          <div className="stat-card"><div className="stat-icon">🏃‍♂️</div><div className="stat-value">{getUsersByRole('Cliente')}</div><div className="stat-label">Clientes</div></div>
          <div className="stat-card"><div className="stat-icon">💪</div><div className="stat-value">{getUsersByRole('Entrenador')}</div><div className="stat-label">Entrenadores</div></div>
          <div className="stat-card"><div className="stat-icon">👑</div><div className="stat-value">{getUsersByRole('Administrador')}</div><div className="stat-label">Administradores</div></div>
        </div>

        {/* Filtros */}
        <div className="card">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: '1rem', marginBottom: '2rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Filtrar por rol</label>
              <select value={filter} onChange={e => setFilter(e.target.value)} className="form-select">
                <option value="Todos">Todos los roles</option>
                <option value="Cliente">Clientes</option>
                <option value="Entrenador">Entrenadores</option>
                <option value="Administrador">Administradores</option>
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Estado</label>
              <select value={stateFilter} onChange={e => setStateFilter(e.target.value)} className="form-select">
                {STATE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Buscar usuario</label>
              <input className="form-input" placeholder="Nombre o email..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
          </div>
          <p style={{ color: '#666', textAlign: 'center' }}>
            Mostrando {filteredUsers.length} de {users.length} registros
          </p>
        </div>

        {/* Lista */}
        <div style={{ display: 'grid', gap: '1rem' }}>
          {filteredUsers.length === 0 ? (
            <div className="card text-center">
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔍</div>
              <h3 style={{ color: '#667eea', marginBottom: '1rem' }}>Sin resultados</h3>
              <p style={{ color: '#666' }}>
                {searchTerm ? 'Prueba otros términos' : 'No hay usuarios con ese filtro'}
              </p>
            </div>
          ) : (
            filteredUsers.map(u => {
              const isEditing = editingId === u.id;
              const bmi = calculateBMI(u.peso, u.estatura);
              const bmiCat = getBMICategory(bmi);
              return (
                <div key={u.id} className="card" style={{ padding: '1.5rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr .9fr .8fr .8fr .8fr .9fr 1.3fr', gap: '1rem', alignItems: 'center' }}>
                    {/* Avatar + nombre */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div className="user-avatar" style={{ width: 50, height: 50, fontSize: '1.2rem' }}>
                        {(u.nombre || 'U').split(' ').map(n => n[0]).join('').toUpperCase()}
                      </div>
                      <div>
                        {isEditing ? (
                          <input className="form-input" value={draft.nombre} onChange={e => setDraft(d => ({ ...d, nombre: e.target.value }))} style={{ minWidth: 220 }} />
                        ) : (
                          <>
                            <div style={{ fontWeight: 600, color: '#333' }}>{u.nombre}</div>
                            <div style={{ fontSize: '.9rem', color: '#666' }}>{u.email}</div>
                          </>
                        )}
                        {u.activo === 0 && (
                          <div style={{ marginTop: 4, fontSize: 12, fontWeight: 700, color: '#e74c3c' }}>Inactivo</div>
                        )}
                      </div>
                    </div>

                    {/* Rol */}
                    <div style={{ textAlign: 'center' }}>
                      {isEditing ? (
                        <select className="form-select" value={draft.rol} onChange={e => setDraft(d => ({ ...d, rol: e.target.value }))}>
                          {ROLE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      ) : (
                        <div style={{
                          display: 'inline-flex', alignItems: 'center', gap: '.5rem',
                          padding: '.5rem 1rem', backgroundColor: (getRoleColor(u.rol) + '20'),
                          color: getRoleColor(u.rol), borderRadius: 25, fontSize: '.9rem', fontWeight: 600
                        }}>
                          {u.rol === 'Cliente' ? '🏃‍♂️' : u.rol === 'Entrenador' ? '💪' : '👑'} {u.rol}
                        </div>
                      )}
                    </div>

                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>{u.edad}</div>
                      <div style={{ fontSize: '.8rem', color: '#666' }}>años</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>{u.peso}</div>
                      <div style={{ fontSize: '.8rem', color: '#666' }}>kg</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>{u.estatura}</div>
                      <div style={{ fontSize: '.8rem', color: '#666' }}>m</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>{bmi}</div>
                      <div style={{ fontSize: '.8rem', color: bmiCat.color, fontWeight: 600 }}>{bmiCat.text}</div>
                    </div>

                    {/* Estado */}
                    <div style={{ textAlign: 'center', fontWeight: 700, color: u.activo ? '#27ae60' : '#e74c3c' }}>
                      {u.activo ? 'Activo' : 'Inactivo'}
                    </div>

                    {/* Acciones */}
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      {isAdmin ? (
                        isEditing ? (
                          <>
                            <button className="logout-btn" onClick={() => saveEdit(u.id)}>Guardar</button>
                            <button className="btn" onClick={cancelEdit}>Cancelar</button>
                          </>
                        ) : (
                          <>
                            <button className="logout-btn" onClick={() => startEdit(u)} disabled={!u.activo}>Editar</button>
                            <button className="btn" onClick={() => toggleActive(u.id, u.activo)}>
                              {u.activo ? 'Desactivar' : 'Reactivar'}
                            </button>
                          </>
                        )
                      ) : (
                        <span className="stat-label">Sin permisos</span>
                      )}
                    </div>
                  </div>

                  <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #eee', fontSize: '.9rem', color: '#666', textAlign: 'center' }}>
                    Miembro desde: {formatDate(u.fecha_registro)}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default UsersList;
