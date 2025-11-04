import { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

function bmiCategory(b) {
  if (b == null) return '—';
  if (b < 18.5) return 'Bajo peso';
  if (b < 25)   return 'Peso normal';
  if (b < 30)   return 'Sobrepeso';
  return 'Obesidad';
}

export default function Progress({ user }) {
  const [days, setDays] = useState(180);

  // Peso
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  // IMC
  const [bmi, setBmi] = useState([]);                // [{date, bmi, peso_kg}]
  const [loadingBmi, setLoadingBmi] = useState(true);

  // Fuerza / 1RM
  const [prs, setPrs] = useState([]);                // [{ejercicio, est_1rm, max_peso, max_reps, date}]
  const [loadingPrs, setLoadingPrs] = useState(true);

  // Calorías por sesión
  const [cal, setCal] = useState([]);                // [{date, minutos, met_prom, peso_kg, kcal, sesion_id}]
  const [loadingCal, setLoadingCal] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true); setLoadingBmi(true); setLoadingPrs(true); setLoadingCal(true);
        const params = { usuarioId: user?.id, days };

        const [w, b, p] = await Promise.all([
          axios.get('/api/progress/weight-history', { params }),
          axios.get('/api/progress/bmi-history',    { params }),
          axios.get('/api/progress/strength-prs',   { params }),
        ]);

        if (!mounted) return;

        const wRows = (w.data || []).map(d => ({ date: d.date, weight: Number(d.weight) }));
        setData(wRows);

        const bRows = (b.data || []).map(d => ({
          date: d.date,
          bmi: d.bmi != null ? Number(d.bmi) : null,
          peso_kg: d.peso_kg != null ? Number(d.peso_kg) : null,
        }));
        setBmi(bRows);

        setPrs(Array.isArray(p.data) ? p.data : []);
      } catch (e) {
        console.error(e);
        if (mounted) { setData([]); setBmi([]); setPrs([]); }
      } finally {
        if (mounted) { setLoading(false); setLoadingBmi(false); setLoadingPrs(false); }
      }

      // Calorías por sesión (rango from/to basado en days)
      try {
        const to = new Date().toISOString().slice(0,10);
        const from = new Date(Date.now() - days*86400000).toISOString().slice(0,10);
        const resp = await axios.get('/api/calories/by-session', {
          params: { usuarioId: user?.id, from, to }
        });
        if (mounted) setCal(Array.isArray(resp.data) ? resp.data : []);
      } catch (e) {
        console.error(e);
        if (mounted) setCal([]);
      } finally {
        if (mounted) setLoadingCal(false);
      }
    })();
    return () => { mounted = false; };
  }, [user?.id, days]);

  const { last, prev, deltaAbs, deltaPct, lastDate } = useMemo(() => {
    if (!data.length) return { last:null, prev:null, deltaAbs:null, deltaPct:null, lastDate:null };
    const lastPt = data[data.length - 1];
    const prevPt = data.length > 1 ? data[data.length - 2] : null;
    const lastVal = lastPt?.weight ?? null;
    const prevVal = prevPt?.weight ?? null;
    const dAbs = (lastVal!=null && prevVal!=null) ? +(lastVal - prevVal).toFixed(2) : null;
    const dPct = (lastVal!=null && prevVal!=null && prevVal!==0)
      ? +(((lastVal - prevVal)/prevVal)*100).toFixed(2) : null;
    return { last:lastVal, prev:prevVal, deltaAbs:dAbs, deltaPct:dPct, lastDate:lastPt?.date ?? null };
  }, [data]);

  const lastBmi = useMemo(() => {
    if (!bmi.length) return null;
    return bmi[bmi.length - 1];
  }, [bmi]);

  const totalKcal = useMemo(() => cal.reduce((acc, r) => acc + (Number(r.kcal) || 0), 0), [cal]);
  const avgKcal = useMemo(() => cal.length ? Math.round(totalKcal / cal.length) : 0, [cal, totalKcal]);

  const downloadCSV = () => {
    const header = 'date,weight_kg\n';
    const body = data.map(d => `${d.date},${d.weight}`).join('\n');
    const blob = new Blob([header + body], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `weight_history_${user?.id}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const exportXLSX = () => {
    const wb = XLSX.utils.book_new();

    // Hoja 1: Peso
    const pesoRows = (data?.length ? data : [{ date: '', weight: '' }])
      .map(d => ({ Fecha: d.date, Peso_kg: d.weight }));
    const shPeso = XLSX.utils.json_to_sheet(pesoRows);
    XLSX.utils.book_append_sheet(wb, shPeso, 'Peso');

    // Hoja 2: KPIs (resumen)
    const kpiRow = [{
      Rango_dias: days,
      Ultimo_peso_kg: last ?? '',
      Fecha_ultimo: lastDate ?? '',
      Peso_prev_kg: prev ?? '',
      Cambio_kg_vs_prev: deltaAbs ?? '',
      Cambio_pct_vs_prev: deltaPct ?? '',
      IMC_actual: lastBmi?.bmi ?? '',
      Categoria_IMC: lastBmi?.bmi != null ? bmiCategory(lastBmi.bmi) : '',
      Fecha_IMC: lastBmi?.date ?? ''
    }];
    const shKpi = XLSX.utils.json_to_sheet(kpiRow);
    XLSX.utils.book_append_sheet(wb, shKpi, 'KPIs');

    // Hoja 3: IMC
    const bmiRows = (bmi?.length ? bmi : [{ date: '', bmi: '', peso_kg: '' }])
      .map(d => ({ Fecha: d.date, IMC: d.bmi, Peso_kg: d.peso_kg }));
    const shBmi = XLSX.utils.json_to_sheet(bmiRows);
    XLSX.utils.book_append_sheet(wb, shBmi, 'IMC');

    // Hoja 4: 1RM / Fuerza
    const prsRows = (prs?.length ? prs : [{ ejercicio:'', est_1rm:'', max_peso:'', max_reps:'', date:'' }])
      .map(r => ({
        Ejercicio: r.ejercicio,
        '1RM_estimado_kg': r.est_1rm,
        Mejor_peso_kg: r.max_peso,
        Mejor_reps: r.max_reps,
        Fecha: r.date
      }));
    const shPrs = XLSX.utils.json_to_sheet(prsRows);
    XLSX.utils.book_append_sheet(wb, shPrs, '1RM');

    // Hoja 5: Calorías por sesión (NUEVA)
    const calRows = (cal?.length ? cal : [{ date:'', minutos:'', met_prom:'', peso_kg:'', kcal:'' }])
      .map(r => ({
        Fecha: r.date,
        Minutos: r.minutos,
        MET_prom: r.met_prom,
        Peso_kg: r.peso_kg,
        Kcal: r.kcal
      }));
    const shCal = XLSX.utils.json_to_sheet(calRows);
    XLSX.utils.book_append_sheet(wb, shCal, 'Calorias_Sesion');

    const today = new Date().toISOString().slice(0,10);
    const filename = `progreso_${user?.id || 'usuario'}_${today}.xlsx`;
    XLSX.writeFile(wb, filename);
  };

  return (
    <div className="main-content">
      <div className="progress-page">
        <div className="progress-header">
          <div>
            <h2 style={{ color: '#fff' }}>Progreso</h2>
            <p className="progress-subtitle">Histórico y KPIs del cliente</p>
          </div>
          <div className="toolbar" role="toolbar" aria-label="Rango">
            {[30,90,180].map(r => (
              <button style={{ color: '#fff' }} key={r}
                className={`btn ${days===r ? 'btn-primary' : ''}`}
                onClick={() => setDays(r)}>
                {r}d
              </button>
            ))}
            <button className="btn" onClick={downloadCSV} style={{ color: '#fff' }}>Exportar CSV</button>
            <button className="btn" onClick={exportXLSX} style={{ color: '#fff' }}>Exportar XLSX</button>
          </div>
        </div>

        <div className="panel-grid">
          {/* Panel 1: gráfico de peso */}
          <section className="panel-card">
            <div className="card-header">
              <h3>Peso corporal</h3>
              <span style={{ color:'#666' }}>{lastDate ? `Última: ${lastDate}` : ''}</span>
            </div>
            <div className="card-body">
              {loading ? (
                <div className="skeleton" aria-busy="true" />
              ) : data.length ? (
                <div className="chart-wrapper">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis unit=" kg" />
                      <Tooltip />
                      <Line type="monotone" dataKey="weight" dot activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="empty">No hay datos de peso aún.</div>
              )}
            </div>
          </section>

          {/* Panel 2: KPIs */}
          <section className="panel-card">
            <div className="card-header"><h3>KPIs</h3></div>
            <div className="card-body">
              <div className="kpi-grid">
                <div className="kpi">
                  <div className="kpi-label">Último peso</div>
                  <div className="kpi-value">{last!=null ? `${last} kg` : '—'}</div>
                  <div className="kpi-sub">{lastDate || '—'}</div>
                </div>
                <div className="kpi">
                  <div className="kpi-label">Cambio vs último</div>
                  <div className={`kpi-value ${deltaAbs>0?'up':deltaAbs<0?'down':''}`}>
                    {deltaAbs!=null ? `${deltaAbs>0?'+':''}${deltaAbs} kg` : '—'}
                  </div>
                  <div className="kpi-sub">{deltaPct!=null ? `${deltaPct>0?'+':''}${deltaPct}%` : '—'}</div>
                </div>
                <div className="kpi">
                  <div className="kpi-label">Registro prev.</div>
                  <div className="kpi-value">{prev!=null ? `${prev} kg` : '—'}</div>
                  <div className="kpi-sub">Punto anterior</div>
                </div>
              </div>
            </div>
          </section>

          {/* Panel 3: IMC */}
          <section className="panel-card">
            <div className="card-header"><h3>IMC</h3></div>
            <div className="card-body">
              {loadingBmi ? (
                <div className="skeleton" aria-busy="true" />
              ) : bmi.length ? (
                <>
                  <div className="kpi-grid" style={{ marginBottom: 12 }}>
                    <div className="kpi">
                      <div className="kpi-label">IMC actual</div>
                      <div className="kpi-value">
                        {lastBmi?.bmi != null ? lastBmi.bmi.toFixed(1) : '—'}
                      </div>
                      <div className="kpi-sub">{bmiCategory(lastBmi?.bmi)} • {lastBmi?.date || '—'}</div>
                    </div>
                  </div>
                  <div className="chart-wrapper">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={bmi}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis domain={['auto', 'auto']} />
                        <Tooltip />
                        <Line type="monotone" dataKey="bmi" dot activeDot={{ r: 5 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </>
              ) : (
                <div className="empty">No hay datos de IMC (falta estatura o mediciones de peso).</div>
              )}
            </div>
          </section>

          {/* Panel 4: 1RM / Fuerza */}
          <section className="panel-card">
            <div className="card-header"><h3>1RM / Fuerza</h3></div>
            <div className="card-body">
              {loadingPrs ? (
                <div className="skeleton" aria-busy="true" />
              ) : prs.length ? (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%' }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign:'left' }}>Ejercicio</th>
                        <th style={{ textAlign:'right' }}>1RM estimado</th>
                        <th style={{ textAlign:'center' }}>Mejor set</th>
                        <th style={{ textAlign:'center' }}>Fecha</th>
                      </tr>
                    </thead>
                    <tbody>
                      {prs.slice(0, 8).map(row => (
                        <tr key={`${row.ejercicio}-${row.date}-${row.est_1rm}`}>
                          <td>{row.ejercicio}</td>
                          <td style={{ textAlign:'right' }}>{row.est_1rm.toFixed(2)} kg</td>
                          <td style={{ textAlign:'center' }}>{row.max_peso} × {row.max_reps}</td>
                          <td style={{ textAlign:'center' }}>{row.date}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty">No se detectaron sets en el rango seleccionado.</div>
              )}
            </div>
          </section>

          {/* Panel 5: Calorías por sesión (NUEVO) */}
          <section className="panel-card">
            <div className="card-header">
              <h3>Calorías por sesión</h3>
              <span style={{ color:'#666' }}>
                {cal.length ? `Total: ${totalKcal.toLocaleString()} kcal • Promedio: ${avgKcal} kcal/sesión` : ''}
              </span>
            </div>
            <div className="card-body">
              {loadingCal ? (
                <div className="skeleton" aria-busy="true" />
              ) : cal.length ? (
                <div className="chart-wrapper">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={cal}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="kcal" dot activeDot={{ r: 5 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="empty">No hay sesiones en el rango seleccionado.</div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
