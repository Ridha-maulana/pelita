/** Grafik garis ekuitas buatan sendiri (SVG). Ringkasan teks tersedia untuk pembaca layar. */
export function LineChart({ values, labels, format, height = 200 }: { values: number[]; labels: string[]; format: (n: number) => string; height?: number }) {
  const W = 340, H = height, pl = 8, pr = 56, pt = 10, pb = 22;
  if (values.length < 1) return <p className="muted" style={{ padding: '32px 0', textAlign: 'center' }}>Belum ada data untuk grafik.</p>;
  const v = values.length === 1 ? [0, values[0]!] : values;
  const lb = values.length === 1 ? ['', labels[0] ?? ''] : labels;
  const min = Math.min(0, ...v), max = Math.max(0, ...v), span = max - min || 1;
  const x = (i: number) => pl + (i / (v.length - 1)) * (W - pl - pr);
  const y = (n: number) => pt + (1 - (n - min) / span) * (H - pt - pb);
  const pts = v.map((n, i) => `${x(i).toFixed(1)},${y(n).toFixed(1)}`);
  const line = `M${pts.join(' L')}`;
  const area = `${line} L${x(v.length - 1).toFixed(1)},${y(0).toFixed(1)} L${x(0).toFixed(1)},${y(0).toFixed(1)}Z`;
  const last = v[v.length - 1]!;
  const ticks = [max, (max + min) / 2, min];
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img"
      aria-label={`Grafik pertumbuhan: ${v.length} titik, akhir ${format(last)}`}>
      {ticks.map((t, i) => (
        <g key={i}>
          <line x1={pl} x2={W - pr} y1={y(t)} y2={y(t)} stroke="var(--line)" strokeDasharray="3 4" />
          <text x={W - pr + 6} y={y(t) + 4} fontSize="10" fill="var(--muted)">{format(t)}</text>
        </g>
      ))}
      <path d={area} fill="var(--accent)" opacity=".12" />
      <path d={line} fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={x(v.length - 1)} cy={y(last)} r="4" fill="var(--accent)" />
      <text x={pl} y={H - 6} fontSize="10" fill="var(--muted)">{lb[0]}</text>
      <text x={W - pr} y={H - 6} fontSize="10" fill="var(--muted)" textAnchor="end">{lb[lb.length - 1]}</text>
    </svg>
  );
}

export function Radar({ dims }: { dims: { short: string; score: number }[] }) {
  const C = 120, R = 82, n = dims.length;
  const pt = (i: number, v: number) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    return [C + Math.cos(a) * R * (v / 100), C + Math.sin(a) * R * (v / 100)] as const;
  };
  const ring = (v: number) => dims.map((_, i) => pt(i, v).map(n => n.toFixed(1)).join(',')).join(' ');
  const shape = dims.map((d, i) => pt(i, d.score).map(n => n.toFixed(1)).join(',')).join(' ');
  return (
    <svg className="chart" viewBox="0 0 240 240" role="img" aria-label={dims.map(d => `${d.short} ${d.score}`).join(', ')}>
      {[25, 50, 75, 100].map(v => <polygon key={v} points={ring(v)} fill="none" stroke="var(--line)" />)}
      <polygon points={shape} fill="var(--accent)" fillOpacity=".25" stroke="var(--accent)" strokeWidth="2" />
      {dims.map((d, i) => {
        const [x, y] = pt(i, 118);
        return <text key={d.short} x={x} y={y} fontSize="10" fill="var(--muted)" textAnchor="middle" dominantBaseline="middle">{d.short}</text>;
      })}
    </svg>
  );
}
