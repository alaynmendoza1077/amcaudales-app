import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { fm, K } from '../ui';

import PTOBASE_DATA from '../ptoBaseData';

export default function ResumenCantidadesTab(props) {
  const { pbItems, P = {} } = props;

  const getSubChapter = function(c) {
    if (!c) return "";
    var parts = c.split('.');
    if (parts.length > 2) {
      var subCode = parts.slice(0, parts.length - 1).join('.');
      var parent = PTOBASE_DATA.find(function(x){return x.c === subCode;});
      if (parent) return parent.d;
      subCode = parts.slice(0, 2).join('.');
      parent = PTOBASE_DATA.find(function(x){return x.c === subCode;});
      if (parent) return parent.d;
    }
    return "";
  };

  const summary = useMemo(() => {
    const groups = {
      'Campamentos y Preliminares': { total: 0, color: '#f59e0b', items: [] },
      'Excavaciones': { total: 0, color: '#ef4444', items: [] },
      'Tuberías': { total: 0, color: '#3b82f6', items: [] },
      'Acometidas': { total: 0, color: '#10b981', items: [] },
      'Pozos': { total: 0, color: '#8b5cf6', items: [] },
      'Sumideros': { total: 0, color: '#ec4899', items: [] },
      'Pavimentos / Reposición': { total: 0, color: '#64748b', items: [] },
      'Varios y Otros': { total: 0, color: '#94a3b8', items: [] }
    };

    let grandTotal = 0;
    const allItems = [];

    pbItems.forEach(it => {
      if (it.lv === 3 && it.q > 0) {
        const cost = (it.q || 0) * (it.p || 0);
        grandTotal += cost;
        const d = (it.d || "").toLowerCase();
        const c = it.c || "";

        let group = 'Varios y Otros';
        if (c.startsWith('1.')) group = 'Campamentos y Preliminares';
        else if (c.startsWith('2.')) group = 'Excavaciones';
        else if (c.startsWith('3.')) group = 'Tuberías';
        else if (c.startsWith('4.')) {
          if (d.includes('pozo')) group = 'Pozos';
          else if (d.includes('acometida') || d.includes('silla yee') || d.includes('silla tee')) group = 'Acometidas';
          else if (d.includes('sumidero')) group = 'Sumideros';
          else if (d.includes('pavimento') || d.includes('asfalto') || d.includes('concreto') || d.includes('base') || d.includes('subbase')) group = 'Pavimentos / Reposición';
        }

        const subCap = getSubChapter(c);

        groups[group].total += cost;
        groups[group].items.push({ ...it, cost, subCap });
        
        allItems.push({ ...it, group, cost, subCap });
      }
    });

    // Sort all items by cost descending, or keep original order. Let's sort by cost.
    allItems.sort((a, b) => b.cost - a.cost);
    const topItems = allItems; // Show all items instead of top 10

    const pieData = Object.keys(groups)
      .map(name => ({ name, value: groups[name].total, color: groups[name].color }))
      .filter(g => g.value > 0)
      .sort((a, b) => b.value - a.value);

    return { groups, grandTotal, topItems, pieData };
  }, [pbItems]);

  const { groups, grandTotal, topItems, pieData } = summary;

  // Custom Label for PieChart
  const RADIAN = Math.PI / 180;
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    if (percent < 0.05) return null;
    return (
      <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={12} fontWeight="bold">
        {`${(percent * 100).toFixed(1)}%`}
      </text>
    );
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ backgroundColor: '#fff', border: '1px solid #ccc', padding: '10px', borderRadius: '4px', fontSize: 12, boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
          <p style={{ margin: 0, fontWeight: 'bold' }}>{payload[0].name}</p>
          <p style={{ margin: 0, color: payload[0].payload.color }}>{fm(payload[0].value)}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="c" style={{ padding: '20px', backgroundColor: '#f8fafc', minHeight: '100vh', boxSizing: 'border-box' }}>
      <div className="ct" style={{ fontSize: '24px', marginBottom: '20px', color: '#0f172a', borderBottom: '2px solid #e2e8f0', paddingBottom: '10px' }}>
        Resumen de Obra y Costos
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '15px', marginBottom: '30px' }}>
        <K l="Costo Total Directo" v={fm(grandTotal)} color="#0f172a" />
        {pieData.slice(0, 4).map((d, i) => (
          <K key={i} l={d.name} v={fm(d.value)} u={`${((d.value/grandTotal)*100).toFixed(1)}%`} color={d.color} />
        ))}
      </div>

      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '30px' }}>
        {/* Pie Chart */}
        <div style={{ flex: '1 1 400px', backgroundColor: 'white', padding: '15px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', height: '400px', boxSizing: 'border-box' }}>
          <h3 style={{ margin: '0 0 15px 0', fontSize: '16px', color: '#475569' }}>Distribución del Presupuesto</h3>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderCustomizedLabel}
                outerRadius={130}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: '12px' }}/>
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Bar Chart */}
        <div style={{ flex: '1 1 500px', backgroundColor: 'white', padding: '15px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', height: '400px', boxSizing: 'border-box' }}>
          <h3 style={{ margin: '0 0 15px 0', fontSize: '16px', color: '#475569' }}>Costos por Categoría</h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={pieData}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
              <XAxis type="number" tickFormatter={(val) => `$${(val/1000000).toFixed(0)}M`} />
              <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11 }} />
              <Tooltip cursor={{fill: 'rgba(0,0,0,0.05)'}} content={<CustomTooltip />} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Items Table */}
      <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', boxSizing: 'border-box' }}>
        <h3 style={{ margin: '0 0 15px 0', fontSize: '16px', color: '#475569' }}>Cantidades de Obra</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f1f5f9', color: '#334155', textAlign: 'left' }}>
                <th style={{ padding: '10px', borderBottom: '2px solid #cbd5e1' }}>Categoría</th>
                <th style={{ padding: '10px', borderBottom: '2px solid #cbd5e1' }}>Subcapítulo</th>
                <th style={{ padding: '10px', borderBottom: '2px solid #cbd5e1' }}>Concepto</th>
                <th style={{ padding: '10px', borderBottom: '2px solid #cbd5e1', textAlign: 'right' }}>Cant.</th>
              </tr>
            </thead>
            <tbody>
              {topItems.map((it, idx) => {
                return (
                <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '8px 10px' }}><span style={{ backgroundColor: groups[it.group].color + '20', color: groups[it.group].color, padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold' }}>{it.group}</span></td>
                  <td style={{ padding: '8px 10px', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#64748b' }} title={it.subCap}>{it.subCap || "-"}</td>
                  <td style={{ padding: '8px 10px', maxWidth: '400px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={it.d}>{it.d}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 'bold' }}>{it.q.toLocaleString("es-CO", {maximumFractionDigits: 2})} {it.u}</td>
                </tr>
              )})}
              {topItems.length === 0 && (
                <tr>
                  <td colSpan="4" style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>No hay ítems con cantidades calculadas. Vaya a Cantidades de Obra y Presupuesto primero.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
