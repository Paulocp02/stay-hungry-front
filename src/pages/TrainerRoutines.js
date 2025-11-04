import React, { useState, useRef } from 'react';
import axios from 'axios';

function useDebounced(fn, delay = 300) {
  const ref = useRef();
  return (...args) => {
    clearTimeout(ref.current);
    ref.current = setTimeout(() => fn(...args), delay);
  };
}

// Picker reusable: busca por nombre y devuelve {id, nombre}
function ExercisePicker({ valueId, valueName, onSelect, placeholder = 'Buscar ejercicio...' }) {
  const [q, setQ] = useState(valueName || '');
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const doSearch = useDebounced(async (term) => {
    if (!term || term.length < 2) { setResults([]); return; }
    try {
      setLoading(true);
      const rows = await axios.get('/api/exercises/search', { params: { q: term } }).then(r => r.data);
      setResults(rows);
    } catch (e) {
      console.error(e);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, 250);

  const handleChange = (e) => {
    const term = e.target.value;
    setQ(term);
    setOpen(true);
    doSearch(term);
  };

  const choose = (ex) => {
    onSelect(ex);      // {id, nombre}
    setQ(ex.nombre);
    setOpen(false);
    setResults([]);
  };

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <input
        placeholder={placeholder}
        value={q}
        onChange={handleChange}
        onFocus={() => q.length >= 2 && setOpen(true)}
      />
      {open && (
        <div
          style={{
            position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10,
            background: 'white', borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,.12)',
            padding: 6, maxHeight: 220, overflowY: 'auto'
          }}
          onMouseLeave={() => setOpen(false)}
        >
          {loading && <div style={{ padding: 8, color: '#666' }}>Buscando…</div>}
          {!loading && results.length === 0 && q.length >= 2 && (
            <div style={{ padding: 8, color: '#666' }}>Sin resultados</div>
          )}
          {results.map(r => (
            <div
              key={r.id}
              onClick={() => choose(r)}
              style={{ padding: '8px 10px', borderRadius: 8, cursor: 'pointer' }}
              onMouseDown={(e) => e.preventDefault()}
            >
              <div><strong>{r.nombre}</strong></div>
              <small style={{ color: '#666' }}>{r.grupo_muscular || '—'} • {r.dificultad || '—'}</small>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function TrainerRoutines({ user }) {
  const [tpl, setTpl] = useState({ nombre: '', descripcion: '' });
  const [plantillaId, setPlantillaId] = useState(null);
  // Builder de ejercicios
  const [items, setItems] = useState([
    { ejercicioId: '', ejercicioNombre: '', orden: 1, series: 4, repeticiones: 8, pesoObjetivo: '' }
  ]);

  // Asignación a cliente
  const [clienteId, setClienteId] = useState('');
  const [clientQuery, setClientQuery] = useState('');
  const [clientOptions, setClientOptions] = useState([]);
  const [loadingClientSearch, setLoadingClientSearch] = useState(false);

  const doClientSearch = useDebounced(async (term) => {
    if (!term || term.length < 2) { setClientOptions([]); return; }
    try {
      setLoadingClientSearch(true);
      const rows = await axios
        .get('/api/trainers/search-clients', { params: { q: term } })
        .then(r => r.data);
      setClientOptions(rows); // [{id,nombre,email}]
    } catch (e) {
      console.error(e);
      setClientOptions([]);
    } finally {
      setLoadingClientSearch(false);
    }
  }, 250);

  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [assigning, setAssigning] = useState(false);

  const createTemplate = async (e) => {
    e.preventDefault();
    if (!tpl.nombre?.trim()) return alert('El nombre de la plantilla es obligatorio.');
    try {
      setCreating(true);
      const r = await axios.post('/api/routines/templates', { entrenadorId: user.id, ...tpl });
      const pid = r.data.plantillaId ?? r.data.id;
      if (!pid) throw new Error('El backend no devolvió el id de la plantilla');
      setPlantillaId(pid);
    } catch (e) {
      console.error(e);
      alert(e.response?.data?.error || 'No se pudo crear la plantilla');
    } finally {
      setCreating(false);
    }
  };

  const addRow = () =>
    setItems(prev => [
      ...prev,
      { ejercicioId: '', ejercicioNombre: '', orden: prev.length + 1, series: 4, repeticiones: 10, pesoObjetivo: '' }
    ]);

  const removeRow = (idx) =>
    setItems(prev => prev.filter((_, i) => i !== idx).map((r, i) => ({ ...r, orden: i + 1 }))); // reordena

  const autoOrdenar = () =>
    setItems(prev => prev.map((r, i) => ({ ...r, orden: i + 1 })));

  const saveExercises = async (e) => {
    e?.preventDefault?.();
    if (!plantillaId) return alert('Primero crea la plantilla.');
    try {
      setSaving(true);
      const payload = items.map((i, idx) => {
        const ejercicioId = Number(i.ejercicioId);
        const orden       = Number(i.orden);
        const series      = Number(i.series);
        const repeticiones= Number(i.repeticiones);
        const pesoObjetivo= i.pesoObjetivo !== '' ? Number(i.pesoObjetivo) : null;

        if (!ejercicioId || !orden || !series || !repeticiones) {
          throw new Error(`Fila ${idx + 1}: completa ejercicio, orden, series y repeticiones.`);
        }
        if ([orden, series, repeticiones].some(n => Number.isNaN(n) || n <= 0)) {
          throw new Error(`Fila ${idx + 1}: orden/series/reps deben ser > 0.`);
        }
        return { ejercicioId, orden, series, repeticiones, pesoObjetivo };
      });

      const ords = payload.map(x => x.orden);
      if (new Set(ords).size !== ords.length) {
        throw new Error('Hay órdenes repetidas (usa 1,2,3…).');
      }

      await axios.post(`/api/routines/templates/${plantillaId}/exercises`, { items: payload });
      alert('Ejercicios guardados ✔️');
    } catch (e) {
      console.error('Error guardando ejercicios:', e);
      alert(e.response?.data?.error || e.message || 'Error guardando ejercicios');
    } finally {
      setSaving(false);
    }
  };

  const assignToClient = async (e) => {
    e?.preventDefault?.();
    if (!clienteId) return;
    try {
      setAssigning(true);
      const today = new Date().toISOString().slice(0, 10);
      await axios.post('/api/routines/assign', {
        plantillaId,
        entrenadorId: user.id,
        clienteId: Number(clienteId),
        fechaInicio: today
      });
      alert('Rutina asignada al cliente ✔️');
    } catch (e) {
      console.error(e);
      alert(e.response?.data?.error || 'No se pudo asignar la rutina');
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div className="main-content">
      <div className="page-container">
        <h2 style={{ color:'#fff', marginBottom:'1rem' }}>Rutinas (Plantillas)</h2>

        {!plantillaId ? (
          <div className="card" style={{ padding:'1rem', marginBottom:'1rem' }}>
            <h3>Nueva plantilla</h3>
            <form onSubmit={createTemplate} className="form-row">
              <input placeholder="Nombre" value={tpl.nombre} onChange={e=>setTpl({...tpl, nombre:e.target.value})}/>
              <input placeholder="Descripción" value={tpl.descripcion} onChange={e=>setTpl({...tpl, descripcion:e.target.value})}/>
              <button className="logout-btn" type="submit" disabled={creating}>
                {creating ? 'Creando…' : 'Crear'}
              </button>
            </form>
          </div>
        ) : (
          <>
            <div className="card" style={{ padding:'1rem', marginBottom:'1rem' }}>
              <h3>Plantilla #{plantillaId} — ejercicios</h3>

              {/* Cabecera de columnas (UX) */}
              <div className="form-row" style={{ fontWeight: 600, color:'#666', marginBottom: 6 }}>
                <div>Ejercicio</div>
                <div>Orden</div>
              </div>

              {items.map((it, idx) => (
                <div key={idx} className="form-row" style={{ marginBottom: 8, alignItems:'center' }}>
                  <ExercisePicker
                    valueId={it.ejercicioId}
                    valueName={it.ejercicioNombre}
                    onSelect={(ex) =>
                      setItems(r => r.map((x,i)=> i===idx ? { ...x, ejercicioId: ex.id, ejercicioNombre: ex.nombre } : x))
                    }
                  />
                  <input
                    placeholder="Orden"
                    value={it.orden}
                    onChange={e=>setItems(r=>r.map((x,i)=>i===idx?{...x, orden:e.target.value}:x))}
                  />
                  <input
                    placeholder="Series"
                    value={it.series}
                    onChange={e=>setItems(r=>r.map((x,i)=>i===idx?{...x, series:e.target.value}:x))}
                  />
                  <input
                    placeholder="Reps"
                    value={it.repeticiones}
                    onChange={e=>setItems(r=>r.map((x,i)=>i===idx?{...x, repeticiones:e.target.value}:x))}
                  />
                  <input
                    placeholder="Peso objetivo (kg)"
                    value={it.pesoObjetivo}
                    onChange={e=>setItems(r=>r.map((x,i)=>i===idx?{...x, pesoObjetivo:e.target.value}:x))}
                  />
                  <button type="button" className="logout-btn" onClick={() => removeRow(idx)} style={{ padding:'8px 12px' }}>
                    ✕
                  </button>
                </div>
              ))}

              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                <button type="button" className="logout-btn" onClick={addRow}>+ Ejercicio</button>
                <button type="button" className="logout-btn" onClick={autoOrdenar}>Auto-ordenar</button>
                <button type="button" className="logout-btn" onClick={saveExercises} disabled={saving}>
                  {saving ? 'Guardando…' : 'Guardar'}
                </button>
              </div>
            </div>

            <div className="card" style={{ padding:'1rem' }}>
              <h3>Asignar a cliente</h3>

              {/* ID directo (opcional) */}
              <div className="form-row">
                <input placeholder="ID del cliente" value={clienteId} onChange={e=>setClienteId(e.target.value)} />
                <button type="button" className="logout-btn" onClick={assignToClient} disabled={assigning}>
                  {assigning ? 'Asignando…' : 'Asignar'}
                </button>
              </div>

              {/* Buscador por nombre/email */}
              <div className="form-row" style={{ marginTop: 12 }}>
                <input
                  placeholder="Buscar por nombre o email"
                  value={clientQuery}
                  onChange={(e) => { setClientQuery(e.target.value); doClientSearch(e.target.value); }}
                />
              </div>

              {loadingClientSearch && <div style={{ color:'#666', marginTop: 6 }}>Buscando…</div>}

              {clientOptions.length > 0 && (
                <div className="card" style={{ marginTop: 8, padding: '0.5rem' }}>
                  {clientOptions.map(u => (
                    <div key={u.id}
                         style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:'1px solid #eee' }}>
                      <div>
                        <strong>{u.nombre}</strong> <span style={{ color:'#666' }}>— {u.email}</span>
                      </div>
                      <button
                        type="button"
                        className="logout-btn"
                        onClick={() => { setClienteId(String(u.id)); setClientOptions([]); setClientQuery(''); }}
                      >
                        Usar ID #{u.id}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <small>También puedes escribir 2+ letras para buscar y autollenar el ID.</small>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
