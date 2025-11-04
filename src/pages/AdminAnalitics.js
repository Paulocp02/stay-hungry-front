// src/pages/AdminAnalitics.js
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import * as XLSX from 'xlsx';
import axios from 'axios';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

const fmtDate = (d) => new Date(d).toISOString().slice(0, 10);
const todayIso = fmtDate(new Date());
const minusDays = (n) => fmtDate(new Date(Date.now() - n * 86400000));

export default function AdminAnalitics() {
  // filtros
  const [from, setFrom] = useState(minusDays(180));
  const [to, setTo] = useState(todayIso);

  // loading flags
  const [loading, setLoading] = useState(true);

  // datasets existentes
  const [churn, setChurn] = useState([]);
  const [adherence, setAdherence] = useState(null);
  const [volume, setVolume] = useState([]);
  const [prs, setPrs] = useState([]);
  const [trainerClients, setTrainerClients] = useState({ rows: [], sin_asignar: 0 });
  const [usage, setUsage] = useState(null);

  // Refresh de datos
  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const params = { from, to };

      const [rChurn, rAdh, rVol, rPrs, rTc, rUsage] = await Promise.allSettled([
        axios.get('/api/reports/users/churn', { params }),
        axios.get('/api/reports/adherence', { params: { days: 30 } }),
        axios.get('/api/reports/volume', { params: { ...params, groupBy: 'week' } }),
        axios.get('/api/reports/prs', { params }),
        axios.get('/api/reports/trainers/clients', { params }),
        axios.get('/api/analytics/usage-summary', { params }),
      ]);

      setChurn(rChurn.status === 'fulfilled' ? (rChurn.value.data || []) : []);
      setAdherence(rAdh.status === 'fulfilled' ? (rAdh.value.data || null) : null);
      setVolume(rVol.status === 'fulfilled' ? (rVol.value.data || []) : []);
      setPrs(rPrs.status === 'fulfilled' ? (rPrs.value.data || []) : []);
      setTrainerClients(
        rTc.status === 'fulfilled'
          ? (rTc.value.data || { rows: [], sin_asignar: 0 })
          : { rows: [], sin_asignar: 0 }
      );
      setUsage(rUsage.status === 'fulfilled' ? (rUsage.value.data || null) : null);
    } catch (e) {
      console.error('AdminAnalitics refresh error:', e);
      setChurn([]); setAdherence(null); setVolume([]); setPrs([]);
      setTrainerClients({ rows: [], sin_asignar: 0 });
      setUsage(null);
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  // useEffect correcto
  useEffect(() => { refresh(); }, [refresh]);

  // KPIs rápidos
  const kpis = useMemo(() => {
    const altas = churn.reduce((a, r) => a + (Number(r.altas) || 0), 0);
    const bajas = churn.reduce((a, r) => a + (Number(r.bajas) || 0), 0);
    const cargaTotal = volume.reduce((a, r) => a + (Number(r.carga_total) || 0), 0);
    const adh = adherence?.overall?.adherencia_pct ?? null;
    const prsCount = prs.length;

    const totalViews = Array.isArray(usage?.pages)
      ? usage.pages.reduce((a, p) => a + (Number(p.hits) || 0), 0)
      : 0;
    const totalActive = usage?.minutes_active ?? 0;

    return { altas, bajas, cargaTotal, adh, prsCount, totalViews, totalActive };
  }, [churn, volume, adherence, prs, usage]);

  // Exportar XLSX
  const exportXlsx = () => {
    const wb = XLSX.utils.book_new();
    const addSheet = (name, rows) => {
      const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{}]);
      if (ws['!ref']) ws['!autofilter'] = { ref: ws['!ref'] };
      XLSX.utils.book_append_sheet(wb, ws, name);
    };

    addSheet('Altas_Bajas', churn.map(r => ({
      Periodo: r.mes || r.periodo || r.month || '',
      Altas: Number(r.altas || 0),
      Bajas: Number(r.bajas || 0),
      Neto: Number(r.neto || (r.altas || 0) - (r.bajas || 0)),
    })));

    const ov = adherence?.overall || {};
    addSheet('Adherencia', [
      {
        clientes_con_sets: ov.clientes_con_sets ?? '',
        total_clientes: ov.total_clientes ?? '',
        adherencia_pct: ov.adherencia_pct ?? '',
      },
      {},
      ...(adherence?.by_trainer || []).map(t => ({
        Entrenador: t.entrenador || t.nombre || '',
        Clientes_con_sets: t.clientes_con_sets ?? '',
        Total_clientes: t.total_clientes ?? '',
        "Adherencia_%": t.adherencia_pct ?? '',
      }))
    ]);

    addSheet('Carga_Semanal', volume.map(r => ({
      Semana: r.iso_week || r.week || '',
      Carga_total: Number(r.carga_total || 0),
    })));

    addSheet('PRs', prs.map(p => ({
      Fecha: p.date || p.fecha || '',
      Ejercicio: p.ejercicio || '',
      '1RM_est_kg': p.est_1rm != null ? Number(p.est_1rm).toFixed(2) : '',
      Mejor_set: p.max_peso != null && p.max_reps != null ? `${p.max_peso} x ${p.max_reps}` : '',
      Usuario: p.usuario || p.cliente || '',
    })));

    addSheet('Clientes_x_Entrenador', [
      ...((trainerClients.rows || []).map(r => ({
        Entrenador: r.entrenador || r.nombre || '',
        Clientes: r.clientes ?? r.count ?? 0,
      }))),
      {},
      { Sin_asignar: trainerClients.sin_asignar ?? 0 },
    ]);

    const usageRows = [
      { Metric: 'Sesiones únicas', Valor: usage?.sessions ?? 0 },
      { Metric: 'Minutos activos', Valor: usage?.minutes_active ?? 0 },
      {},
      { Ruta: 'Ruta', Pageviews: 'Pageviews', Usuarios: 'Usuarios' },
      ...((usage?.pages || []).map(p => ({
        Ruta: p.path || '(sin ruta)',
        Pageviews: Number(p.hits || 0),
        Usuarios: Number(p.users || 0),
      })))]
    addSheet('Uso_App', usageRows);

    XLSX.writeFile(wb, `reportes_admin_${from}_a_${to}.xlsx`);
  };

  return (
    <div className="main-content">
      <div className="progress-page">
        <div className="progress-header">
          <div>
            <h2 style={{ color: '#fff' }}>Reportes (Admin)</h2>
            <p className="progress-subtitle">Resumen operativo y de progreso del gimnasio</p>
          </div>
          <div className="toolbar" role="toolbar" aria-label="Filtros">
            <input type="date" value={from} onChange={e => setFrom(e.target.value)} />
            <input type="date" value={to} onChange={e => setTo(e.target.value)} />
            <button className="btn" onClick={refresh}>Aplicar</button>
            <button className="btn btn-primary" onClick={exportXlsx}>Exportar XLSX</button>
          </div>
        </div>

        {/* KPIs */}
        <section className="panel-card">
          <div className="card-header"><h3>KPIs rápidos</h3></div>
          <div className="card-body">
            <div className="kpi-grid">
              <div className="kpi"><div className="kpi-label">Altas (rango)</div><div className="kpi-value">{kpis.altas}</div></div>
              <div className="kpi"><div className="kpi-label">Bajas (rango)</div><div className="kpi-value">{kpis.bajas}</div></div>
              <div className="kpi"><div className="kpi-label">Adherencia (30d)</div><div className="kpi-value">{kpis.adh != null ? `${kpis.adh}%` : '—'}</div></div>
              <div className="kpi"><div className="kpi-label">Carga total</div><div className="kpi-value">{kpis.cargaTotal.toLocaleString()}</div></div>
              <div className="kpi"><div className="kpi-label">PRs detectados</div><div className="kpi-value">{kpis.prsCount}</div></div>
              <div className="kpi"><div className="kpi-label">Page views</div><div className="kpi-value">{kpis.totalViews}</div></div>
              <div className="kpi"><div className="kpi-label">Min activos</div><div className="kpi-value">{kpis.totalActive}</div></div>
            </div>
          </div>
        </section>

        {/* Gráficos */}
        <div className="panel-grid">

          {/* 1) Altas/Bajas */}
          <section className="panel-card">
            <div className="card-header"><h3>Altas y bajas por mes</h3></div>
            <div className="card-body">
              {loading ? <div className="skeleton" /> : churn.length ? (
                <div className="chart-wrapper" style={{ height: 260 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChurn data={churn} />
                  </ResponsiveContainer>
                </div>
              ) : <div className="empty">Sin datos en el rango.</div>}
            </div>
          </section>
          {/* 2) Adherencia por entrenador */}
            <section className="panel-card">
              <div className="card-header">
                <h3>Adherencia (30 días) por entrenador</h3>
              </div>
              <div className="card-body">
                {loading ? (
                  <div className="skeleton" />
                ) : adherence?.by_trainer?.length ? (
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%" }}>
                      <thead>
                        <tr>
                          <th style={{ textAlign: "left" }}>Entrenador</th>
                          <th style={{ textAlign: "right" }}>Clientes con sets</th>
                          <th style={{ textAlign: "right" }}>Total</th>
                          <th style={{ textAlign: "right" }}>%</th>
                        </tr>
                      </thead>
                      <tbody>
                        {adherence.by_trainer.map((t) => (
                          <tr key={t.entrenador || t.nombre}>
                            <td>{t.entrenador || t.nombre}</td>
                            <td style={{ textAlign: "right" }}>{t.clientes_con_sets}</td>
                            <td style={{ textAlign: "right" }}>{t.total_clientes}</td>
                            <td style={{ textAlign: "right" }}>{t.adherencia_pct}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="empty">Sin datos.</div>
                )}
              </div>
            </section>

            {/* 3) Carga por semana */}
            <section className="panel-card">
              <div className="card-header">
                <h3>Carga por semana (kg·reps)</h3>
              </div>
              <div className="card-body">
                {loading ? (
                  <div className="skeleton" />
                ) : volume.length ? (
                  <div className="chart-wrapper">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={volume}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey={(d) => d.iso_week || d.week} />
                        <YAxis />
                        <Tooltip />
                        <Area dataKey="carga_total" type="monotone" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="empty">Sin datos.</div>
                )}
              </div>
            </section>

            {/* 4) PRs recientes */}
            <section className="panel-card">
              <div className="card-header">
                <h3>PRs / 1RM estimado (Top 10)</h3>
              </div>
              <div className="card-body">
                {loading ? (
                  <div className="skeleton" />
                ) : prs.length ? (
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%" }}>
                      <thead>
                        <tr>
                          <th style={{ textAlign: "left" }}>Fecha</th>
                          <th style={{ textAlign: "left" }}>Ejercicio</th>
                          <th style={{ textAlign: "right" }}>1RM (kg)</th>
                          <th style={{ textAlign: "center" }}>Mejor set</th>
                          <th style={{ textAlign: "left" }}>Usuario</th>
                        </tr>
                      </thead>
                      <tbody>
                        {prs.slice(0, 10).map((p, i) => (
                          <tr key={`${p.ejercicio}-${p.date}-${i}`}>
                            <td>{p.date || p.fecha}</td>
                            <td>{p.ejercicio}</td>
                            <td style={{ textAlign: "right" }}>
                              {p.est_1rm != null ? Number(p.est_1rm).toFixed(2) : "—"}
                            </td>
                            <td style={{ textAlign: "center" }}>
                              {p.max_peso != null && p.max_reps != null
                                ? `${p.max_peso} × ${p.max_reps}`
                                : "—"}
                            </td>
                            <td>{p.usuario || p.cliente || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="empty">Sin PRs detectados.</div>
                )}
              </div>
            </section>

          {/* 5) Clientes por entrenador */}
          <section className="panel-card">
            <div className="card-header"><h3>Clientes por entrenador</h3></div>
            <div className="card-body">
              {loading ? <div className="skeleton" /> :
                (trainerClients.rows || []).length ? (() => {
                  const rows = (trainerClients.rows || []).map(r => ({
                    label: r.entrenador || r.nombre || '(sin nombre)',
                    clientes: Number(r.clientes ?? r.count ?? 0),
                  }));
                  return (
                    <div className="chart-wrapper" style={{ height: 260 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={rows}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="label" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="clientes" name="Clientes" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  );
                })() : <div className="empty">Sin datos.</div>}
              <div className="stat-label" style={{ marginTop: 8 }}>
                Sin asignar: <strong>{trainerClients.sin_asignar ?? 0}</strong>
              </div>
            </div>
          </section>
                {/* 6) Uso de la app */}
                  <section className="panel-card">
                    <div className="card-header">
                      <h3>Uso de la app (páginas y minutos activos)</h3>
                    </div>

                    <div className="card-body">
                      {loading ? (
                        <div className="skeleton" />
                      ) : usage &&
                        (usage.sessions > 0 ||
                          usage.minutes_active > 0 ||
                          (usage.pages || []).length) ? (
                        <>
                          <div className="kpi-grid" style={{ marginBottom: 12 }}>
                            <div className="kpi">
                              <div className="kpi-label">Sesiones únicas</div>
                              <div className="kpi-value">{usage.sessions}</div>
                            </div>
                            <div className="kpi">
                              <div className="kpi-label">Minutos activos</div>
                              <div className="kpi-value">{usage.minutes_active}</div>
                            </div>
                          </div>

                          <div style={{ overflowX: "auto" }}>
                            <table style={{ width: "100%" }}>
                              <thead>
                                <tr>
                                  <th style={{ textAlign: "left" }}>Ruta</th>
                                  <th style={{ textAlign: "right" }}>Pageviews</th>
                                  <th style={{ textAlign: "right" }}>Usuarios</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(usage.pages || []).map((p, i) => (
                                  <tr key={`${p.path}-${i}`}>
                                    <td>{p.path || "(sin ruta)"}</td>
                                    <td style={{ textAlign: "right" }}>{p.hits ?? 0}</td>
                                    <td style={{ textAlign: "right" }}>{p.users ?? 0}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </>
                      ) : (
                        <div className="empty">Sin datos de uso en el rango.</div>
                      )}
                    </div>
                  </section>

        </div>
      </div>
    </div>
  );
}

/** Componente gráfico Altas/Bajas */
function ComposedChurn({ data }) {
  const rows = (data || []).map(r => ({
    period: r.mes || r.periodo || r.month || '',
    altas: Number(r.altas || 0),
    bajas: Number(r.bajas || 0),
    neto: Number(r.neto ?? (r.altas || 0) - (r.bajas || 0)),
  }));
  return (
    <LineChart data={rows}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="period" />
      <YAxis />
      <Tooltip />
      <Legend />
      <Line type="monotone" dataKey="altas" name="Altas" dot />
      <Line type="monotone" dataKey="bajas" name="Bajas" dot />
      <Line type="monotone" dataKey="neto" name="Neto" dot />
    </LineChart>
  );
}
