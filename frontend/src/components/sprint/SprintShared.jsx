// 阶段冲刺计划共享小部件：空状态 / 日期工具 / 纯 CSS 柱状图 / 纯 SVG 折线图
// 不引入大型图表库，数据全部来自真实后端记录。

export const pad = (n) => String(n).padStart(2, "0");

export const todayStr = () => {
  const n = new Date();
  return `${n.getFullYear()}-${pad(n.getMonth() + 1)}-${pad(n.getDate())}`;
};

// 最近 N 天（含今天）的日期数组，从旧到新
export const recentDays = (n = 7) => {
  const out = [];
  const base = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() - i);
    out.push(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
  }
  return out;
};

// 空状态：没有数据时显示，绝不放假数据
export function EmptyState({ title = "暂无记录", desc = "管理员可以新增真实记录。", children }) {
  return (
    <div className="sprint-empty">
      <div className="sprint-empty-icon">🍃</div>
      <h3>{title}</h3>
      <p>{desc}</p>
      {children}
    </div>
  );
}

// 纯 CSS 柱状图：points = [{ label, value, cls }]
export function CssBarChart({ points, unit = "" }) {
  const max = Math.max(...points.map((p) => p.value), 1);
  return (
    <div className="sprint-bar-chart">
      {points.map((p) => (
        <div key={p.label} className="sprint-bar-col">
          <div className="sprint-bar-track">
            <div
              className={`sprint-bar ${p.cls || ""}`}
              style={{ height: `${Math.max(2, Math.round((p.value / max) * 100))}%` }}
              title={`${p.label}：${p.value}${unit}`}
            />
          </div>
          <span className="sprint-bar-label">{p.label}</span>
          <span className="sprint-bar-value">
            {p.value}
            {unit}
          </span>
        </div>
      ))}
    </div>
  );
}

// 纯 SVG 折线图：points = [{ label, value }]，自动按值域缩放
// 如果所有值都相同（例如全 0），给折线留一点呼吸空间，避免压到底
export function SvgLineChart({ points, unit = "" }) {
  if (!points.length) return null;
  const W = 320;
  const H = 120;
  const PAD = 8;
  const values = points.map((p) => Number(p.value) || 0);
  const maxVal = Math.max(...values);
  const minVal = Math.min(...values);
  // 值域：最大值与最小值相同（全 0 或全相等）时，人为扩展出 1 的区间，让折线可见
  const span = maxVal - minVal;
  const lo = span === 0 ? minVal - 1 : minVal;
  const hi = span === 0 ? maxVal + 1 : maxVal;
  const range = hi - lo || 1;

  const n = points.length;
  const stepX = n > 1 ? (W - PAD * 2) / (n - 1) : 0;
  const coords = points.map((p, i) => {
    const x = PAD + (n > 1 ? i * stepX : W / 2);
    const y = H - PAD - ((Number(p.value) - lo) / range) * (H - PAD * 2);
    return { x, y, ...p };
  });
  const linePath = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L${coords[coords.length - 1].x.toFixed(1)},${H - PAD} L${coords[0].x.toFixed(1)},${H - PAD} Z`;

  return (
    <div className="sprint-line-chart">
      <svg viewBox={`0 0 ${W} ${H}`} className="sprint-line-svg" role="img" aria-label="折线图">
        <path d={areaPath} className="sprint-line-area" />
        <path d={linePath} className="sprint-line" />
        {coords.map((c, i) => (
          <g key={i}>
            <circle cx={c.x} cy={c.y} r="3" className="sprint-line-dot" />
            <text x={c.x} y={c.y - 7} textAnchor="middle" className="sprint-line-val">
              {c.value}
              {unit}
            </text>
          </g>
        ))}
      </svg>
      <div className="sprint-line-labels">
        {points.map((p, i) => (
          <span key={i} className="sprint-line-label">
            {p.label}
          </span>
        ))}
      </div>
    </div>
  );
}
