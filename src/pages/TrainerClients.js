import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function TrainerClients({ user }) {
  const [trainerId, setTrainerId] = useState(null);
  const [clients, setClients] = useState([]);
  const [clienteId, setClienteId] = useState('');     // asignación directa por ID (lo mantenemos)
  const [loading, setLoading] = useState(true);

  // búsqueda
  const [q, setQ] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState([]);         // resultados de búsqueda

  // resúmenes
  const [summaries, setSummaries] = useState({});
  const [loadingSummary, setLoadingSummary] = useState(null);

  /** 1) Resolver el ID del entrenador (desde props o perfil) */
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        // variantes que pueden venir en la prop user
        let eid = user?.id ?? user?.userId ?? user?.usuario_id ?? null;

        if (!eid) {
          // fallback: pedirlo al backend (manejamos formatos {success,data:{user}} y {user})
          const prof = await axios.get('/api/auth/profile').then(r => r.data);
          const u = prof?.data?.user ?? prof?.user ?? prof;
          eid = u?.id ?? u?.userId ?? u?.usuario_id ?? null;
        }

        if (!eid) throw new Error('No pude determinar tu ID de entrenador.');
        if (alive) setTrainerId(Number(eid));
      } catch (e) {
        console.error('Resolver trainerId falló:', e);
        if (alive) alert('No pude determinar tu ID de entrenador.');
      }
    })();

    return () => { alive = false; };
    // ➜ declaramos TODAS las variantes que consultamos
  }, [user?.id, user?.userId, user?.usuario_id]);

  /** 2) Cargar clientes cuando ya tengamos trainerId */
  useEffect(() => {
    if (!trainerId) return;
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        const rows = await axios
          .get('/api/trainers/my-clients', { params: { entrenadorId: trainerId } })
          .then(r => r.data);
        if (alive) setClients(rows);
      } catch (e) {
        const status = e.response?.status || 'ERR';
        const msg = e.response?.data?.error || e.message || 'Error desconocido';
        console.error('GET /my-clients failed:', e);
        if (alive) alert(`No pude cargar la lista de clientes\n(${status}) ${msg}`);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => { alive = false; };
  }, [trainerId]);

  // Debounced search por nombre/email (mín. 2 caracteres)
  useEffect(() => {
    let t;
    const run = async () => {
      const term = q.trim();
      if (term.length < 2) {
        setResults([]);
        setSearching(false);
        return;
      }
      try {
        setSearching(true);
        const rows = await axios
          .get('/api/trainers/search-clients', { params: { q: term, unassignedOnly: 1 } })
          .then(r => r.data);
        setResults(rows);
      } catch (e) {
        console.error('search-clients error:', e);
      } finally {
        setSearching(false);
      }
    };
    t = setTimeout(run, 350); // debounce 350ms
    return () => clearTimeout(t);
  }, [q]);

  const assignById = async (e) => {
    e.preventDefault();
    if (!clienteId) return;
    await assignClient(Number(clienteId));
    setClienteId('');
  };

  const assignClient = async (cid) => {
    if (!trainerId) {
      alert('No tengo tu ID de entrenador resuelto todavía. Intenta recargar.');
      return;
    }
    try {
      await axios.post('/api/trainers/assign-client', {
        entrenadorId: trainerId,
        clienteId: Number(cid)
      });
      // refrescar tarjetas de clientes
      setLoading(true);
      const rows = await axios
        .get('/api/trainers/my-clients', { params: { entrenadorId: trainerId } })
        .then(r => r.data);
      setClients(rows);
      // opcional: sacar al cliente de los resultados
      setResults(prev => prev.filter(r => r.id !== cid));
    } catch (e) {
      const status = e.response?.status || 'ERR';
      const msg = e.response?.data?.error || e.message || 'Error desconocido';
      console.error('assign-client failed:', e);
      alert(`No pude asignar el cliente\n(${status}) ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const viewTodaySummary = async (cid) => {
    try {
      setLoadingSummary(cid);
      const today = await axios
        .get('/api/sessions/today', { params: { clienteId: cid } })
        .then(r => r.data);

      if (!today.sesionId) {
        setSummaries(prev => ({ ...prev, [cid]: 'Sin sesión hoy o sin rutina activa.' }));
        setLoadingSummary(null);
        return;
      }
      const resumen = await axios
        .get(`/api/sessions/${today.sesionId}/summary`)
        .then(r => r.data.resumen);

      setSummaries(prev => ({ ...prev, [cid]: resumen }));
    } catch (e) {
      const status = e.response?.status || 'ERR';
      const msg = e.response?.data?.error || e.message || 'Error desconocido';
      console.error('GET summary failed:', e);
      setSummaries(prev => ({ ...prev, [cid]: `Error obteniendo resumen. (${status}) ${msg}` }));
    } finally {
      setLoadingSummary(null);
    }
  };

  const fmt = (n, d = 2) => (n === null || n === undefined ? '-' : Number(n).toFixed(d));

  return (
    <div className="main-content">
      <div className="page-container">
        <h2 style={{ color: '#fff', marginBottom: '1rem' }}>Mis Clientes</h2>

        {/* Asignar por NOMBRE/EMAIL */}
        <div className="card" style={{ padding: '1rem', marginBottom: '1rem' }}>
          <h3 style={{ marginBottom: 8 }}>Buscar cliente por nombre o email</h3>
          <input
            placeholder="Ej: Paulo, Ana Gómez, correo@dominio.com"
            value={q}
            onChange={e => setQ(e.target.value)}
          />
          {searching && <div className="stat-label" style={{ marginTop: 8 }}>Buscando...</div>}
          {!searching && results.length > 0 && (
            <div style={{ marginTop: 12 }}>
              {results.map(r => (
                <div key={r.id} className="stat-card" style={{ marginBottom: 8, textAlign: 'left' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{r.nombre}</div>
                      <div className="stat-label">{r.email}</div>
                      <div className="stat-label">Edad: {r.edad} — Peso: {r.peso} kg — Est: {r.estatura} m</div>
                    </div>
                    <button className="logout-btn" onClick={() => assignClient(r.id)}>Asignar</button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {!searching && q.trim().length >= 2 && results.length === 0 && (
            <div className="stat-label" style={{ marginTop: 8 }}>Sin coincidencias.</div>
          )}
          <small>Busca mínimo 2 caracteres. Por defecto mostramos solo clientes no asignados.</small>
        </div>

        {/* Asignar por ID (lo dejamos como alternativa rápida) */}
        <div className="card" style={{ padding: '1rem', marginBottom: '1rem' }}>
          <h3 style={{ marginBottom: 8 }}>Asignar cliente por ID</h3>
          <form onSubmit={assignById} className="form-row">
            <input
              placeholder="ID del cliente"
              value={clienteId}
              onChange={e => setClienteId(e.target.value)}
            />
            <button className="logout-btn" type="submit">Asignar</button>
          </form>
          <small>Pro tip: ya puedes usar la búsqueda superior 😉</small>
        </div>

        {/* Tus clientes asignados */}
        {loading ? (
          <div className="loading-container"><div className="spinner" /></div>
        ) : (
          <div className="stats-grid">
            {clients.length === 0 && (
              <div className="stat-card">Aún no tienes clientes asignados.</div>
            )}
            {clients.map(c => (
              <div key={c.id} className="stat-card" style={{ textAlign: 'left' }}>
                <div className="stat-icon">👤</div>
                <div className="stat-value" style={{ fontSize:'1.4rem' }}>{c.nombre}</div>
                <div className="stat-label">{c.email}</div>
                <div className="stat-label">Edad: {c.edad} — Peso: {c.peso} kg — Est: {c.estatura} m</div>

                <div style={{ marginTop: 12 }}>
                  <button
                    className="logout-btn"
                    onClick={() => viewTodaySummary(c.id)}
                    disabled={loadingSummary === c.id}
                  >
                    {loadingSummary === c.id ? 'Cargando...' : 'Resumen de hoy'}
                  </button>
                </div>

                {summaries[c.id] && (
                  <div style={{ marginTop: 12 }}>
                    {Array.isArray(summaries[c.id]) ? (
                      <table style={{ width: '100%' }}>
                        <thead>
                          <tr>
                            <th style={{ textAlign: 'left' }}>Ejercicio</th>
                            <th>Max Peso</th>
                            <th>Max Reps</th>
                            <th>Est. 1RM</th>
                          </tr>
                        </thead>
                        <tbody>
                          {summaries[c.id].map(row => (
                            <tr key={row.plantilla_ejercicio_id}>
                              <td>{row.ejercicio}</td>
                              <td style={{ textAlign: 'center' }}>{fmt(row.max_peso)}</td>
                              <td style={{ textAlign: 'center' }}>{row.max_reps ?? '-'}</td>
                              <td style={{ textAlign: 'center' }}>{fmt(row.est_1rm)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="stat-label">{summaries[c.id]}</div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
