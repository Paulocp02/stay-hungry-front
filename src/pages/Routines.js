import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function Routines({ user }) {
  const [state, setState] = useState({ sesionId: null, date: '', items: [], loading: true });
  const [expanded, setExpanded] = useState(null);                 // ejercicio abierto
  const [setsByExercise, setSetsByExercise] = useState({});       // { peId: [sets...] }
  const [formByExercise, setFormByExercise] = useState({});       // { peId: { setNum, reps, pesoKg, rpe, esMax } }

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        if (alive) setState(s => ({ ...s, loading: true }));
        const { data } = await axios.get('/api/sessions/today', { params: { clienteId: user.id } });
        if (alive) setState({ sesionId: data.sesionId, date: data.date, items: data.items || [], loading: false });
      } catch (e) {
        console.error(e);
        if (alive) {
          setState(s => ({ ...s, loading: false }));
          alert('No pude obtener tu rutina de hoy');
        }
      }
    };
    load();
    return () => { alive = false; };
  }, [user.id]);

  const toggle = async (plantillaEjercicioId, checked) => {
    try {
      await axios.post(`/api/sessions/${state.sesionId}/exercises/${plantillaEjercicioId}/toggle`, { completado: checked });
      setState(s => ({
        ...s,
        items: s.items.map(it =>
          it.plantilla_ejercicio_id === plantillaEjercicioId ? { ...it, completado: checked } : it
        )
      }));
    } catch (e) {
      console.error(e);
      alert('No pude actualizar el estado del ejercicio');
    }
  };

  const loadSets = async (peId) => {
    const rows = await axios
      .get(`/api/sessions/${state.sesionId}/exercises/${peId}/sets`)
      .then(r => r.data);
    setSetsByExercise(prev => ({ ...prev, [peId]: rows }));
    // setNum por defecto = siguiente
    const nextNum = (rows?.length || 0) + 1;
    setFormByExercise(prev => ({
      ...prev,
      [peId]: prev[peId] ?? { setNum: nextNum, reps: 8, pesoKg: '', rpe: '', esMax: false }
    }));
  };

  const openExercise = async (peId) => {
    setExpanded(expanded === peId ? null : peId);
    if (expanded !== peId) await loadSets(peId);
  };

  const updateForm = (peId, patch) =>
    setFormByExercise(prev => ({ ...prev, [peId]: { ...prev[peId], ...patch } }));

  const addSet = async (peId) => {
    const f = formByExercise[peId];
    if (!f || !f.reps || !f.pesoKg) return alert('Completa peso y reps');
    await axios.post(`/api/sessions/${state.sesionId}/sets`, {
      plantillaEjercicioId: peId,
      setNum: Number(f.setNum),
      reps: Number(f.reps),
      pesoKg: Number(f.pesoKg),
      rpe: f.rpe ? Number(f.rpe) : null,
      esMax: !!f.esMax
    });
    await loadSets(peId);
    // avanzar el setNum automáticamente
    updateForm(peId, { setNum: (setsByExercise[peId]?.length || 0) + 2, pesoKg: '', reps: f.reps });
  };

  if (state.loading) return <div className="loading-container"><div className="spinner" /></div>;

  if (!state.items.length) {
    return (
      <div className="main-content">
        <div className="page-container">
          <div className="card" style={{ padding:'1rem' }}>
            {state.sesionId === null
              ? 'No tienes una rutina activa asignada aún.'
              : 'No hay ejercicios definidos en tu plantilla.'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="main-content">
      <div className="page-container">
        <h2 style={{ color:'#fff', marginBottom:'1rem' }}>
          Rutina de hoy — {state.date}
        </h2>

        <div className="stats-grid">
          {state.items.map(it => {
            const peId = it.plantilla_ejercicio_id;
            const sets = setsByExercise[peId] || [];
            const f = formByExercise[peId] || { setNum: 1, reps: 8, pesoKg: '', rpe: '', esMax: false };
            const isOpen = expanded === peId;

            return (
              <div key={peId} className="stat-card" style={{ textAlign:'left' }}>
                <div className="stat-icon">🏋️</div>
                <div className="stat-value" style={{ fontSize:'1.3rem' }}>{it.ejercicio_nombre}</div>
                <div className="stat-label">Series: {it.series} — Reps: {it.repeticiones}</div>

                <label style={{ display:'flex', alignItems:'center', gap:8, marginTop:10 }}>
                  <input
                    type="checkbox"
                    checked={!!it.completado}
                    onChange={e => toggle(peId, e.target.checked)}
                  />
                  Marcar completado
                </label>

                <div style={{ marginTop: 12 }}>
                  <button className="logout-btn" onClick={() => openExercise(peId)}>
                    {isOpen ? 'Ocultar sets' : 'Ver / agregar sets'}
                  </button>
                </div>

                {isOpen && (
                  <div style={{ marginTop: 12 }}>
                    {/* Tabla de sets ya registrados */}
                    {sets.length > 0 ? (
                        <div className="table-scroll">
                          <table className="sets-table">
                            <thead>
                              <tr>
                                <th>#</th><th>Peso (kg)</th><th>Reps</th><th>RPE</th><th>Máx</th>
                              </tr>
                            </thead>
                            <tbody>
                              {sets.map(s => (
                                <tr key={s.set_num}>
                                  <td>{s.set_num}</td>
                                  <td>{Number(s.peso_kg).toFixed(2)}</td>
                                  <td>{s.reps}</td>
                                  <td>{s.rpe ?? '-'}</td>
                                  <td>{s.es_max ? '✔️' : ''}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="stat-label" style={{ marginBottom: 8 }}>Sin sets aún.</div>
                      )}

                    {/* Form mini para nuevo set */}
                    <div className="set-grid">
                      <div className="field">
                        <label className="field-label" htmlFor={`setnum-${peId}`}># Set</label>
                        <input
                          id={`setnum-${peId}`}
                          type="number"
                          inputMode="numeric"
                          placeholder="1"
                          value={f.setNum}
                          onChange={e => updateForm(peId, { setNum: e.target.value })}
                        />
                      </div>

                      <div className="field">
                        <label className="field-label" htmlFor={`peso-${peId}`}>Peso (kg)</label>
                        <input
                          id={`peso-${peId}`}
                          type="number"
                          step="0.5"
                          inputMode="decimal"
                          placeholder="ej. 60.5"
                          value={f.pesoKg}
                          onChange={e => updateForm(peId, { pesoKg: e.target.value })}
                        />
                      </div>

                      <div className="field">
                        <label className="field-label" htmlFor={`reps-${peId}`}>Reps</label>
                        <input
                          id={`reps-${peId}`}
                          type="number"
                          inputMode="numeric"
                          placeholder="ej. 8"
                          value={f.reps}
                          onChange={e => updateForm(peId, { reps: e.target.value })}
                        />
                      </div>

                      <div className="field">
                        <label className="field-label" htmlFor={`rpe-${peId}`}>RPE (opcional)</label>
                        <input
                          id={`rpe-${peId}`}
                          type="number"
                          step="0.5"
                          inputMode="decimal"
                          placeholder="ej. 7.5"
                          value={f.rpe}
                          onChange={e => updateForm(peId, { rpe: e.target.value })}
                        />
                      </div>

                      <label className="set-check" htmlFor={`max-${peId}`}>
                        <input
                          id={`max-${peId}`}
                          type="checkbox"
                          checked={!!f.esMax}
                          onChange={e => updateForm(peId, { esMax: e.target.checked })}
                        />
                        <span>Máximo</span>
                      </label>
                    </div>

                    <div style={{ marginTop: 8 }}>
                      <button className="logout-btn" onClick={() => addSet(peId)}>Guardar set</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
