import styles from "../../Styles/page.module.css"

// Small dependency-free SVG charts, drawn in the app's existing palette.
const GREEN = "#2da44e"
const RED = "#cf222e"
const GOLD = "#f2c14e"
const INK = "#161b22"

const compact = (n) => (n >= 10000000 ? `${(n / 10000000).toFixed(1)}Cr` : n >= 100000 ? `${(n / 100000).toFixed(1)}L` : n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(Math.round(n)))

// every n-th label so long ranges stay readable
function labelEvery(count) {
    return Math.max(1, Math.ceil(count / 8))
}

export function GroupedBarChart({ data }) {
    // data: [{ label, a, b }]  a = in (green), b = out (red)
    const W = 640, H = 220, padL = 40, padB = 28, padT = 10
    const peak = Math.max(1, ...data.flatMap((d) => [d.a, d.b]))
    const innerW = W - padL - 8
    const innerH = H - padB - padT
    const slot = innerW / Math.max(1, data.length)
    const barW = Math.max(1.5, Math.min(14, slot / 2.6))
    const step = labelEvery(data.length)
    return (
        <div className={styles.chartBox}>
            <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", minWidth: 360, height: "auto" }} role="img" aria-label="Stock in versus stock out">
                {[0, 0.5, 1].map((t) => (
                    <g key={t}>
                        <line x1={padL} x2={W - 8} y1={padT + innerH * (1 - t)} y2={padT + innerH * (1 - t)} stroke="#e5e8ec" />
                        <text x={padL - 6} y={padT + innerH * (1 - t) + 4} fontSize="10" textAnchor="end" fill="#6e7681">{compact(peak * t)}</text>
                    </g>
                ))}
                {data.map((d, i) => {
                    const x = padL + i * slot + slot / 2
                    const ha = (d.a / peak) * innerH
                    const hb = (d.b / peak) * innerH
                    return (
                        <g key={d.label}>
                            <title>{`${d.label}: +${d.a} in, -${d.b} out`}</title>
                            <rect x={x - barW} y={padT + innerH - ha} width={barW} height={ha} fill={GREEN} />
                            <rect x={x} y={padT + innerH - hb} width={barW} height={hb} fill={RED} />
                            {i % step === 0 && <text x={x} y={H - 10} fontSize="10" textAnchor="middle" fill="#6e7681">{d.label.slice(5)}</text>}
                        </g>
                    )
                })}
            </svg>
            <div className={styles.legend}>
                <span><span className={styles.legendDot} style={{ background: GREEN }} />Stock in</span>
                <span><span className={styles.legendDot} style={{ background: RED }} />Stock out</span>
            </div>
        </div>
    )
}

export function LineChart({ data, color = INK }) {
    // data: [{ label, value }]
    const W = 640, H = 220, padL = 46, padB = 28, padT = 10
    const values = data.map((d) => d.value)
    const max = Math.max(...values, 1)
    const min = Math.min(...values, 0)
    const span = Math.max(1, max - min)
    const innerW = W - padL - 12
    const innerH = H - padB - padT
    const x = (i) => padL + (data.length === 1 ? innerW / 2 : (i / (data.length - 1)) * innerW)
    const y = (v) => padT + innerH - ((v - min) / span) * innerH
    const path = data.map((d, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(d.value).toFixed(1)}`).join(" ")
    const step = labelEvery(data.length)
    return (
        <div className={styles.chartBox}>
            <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", minWidth: 360, height: "auto" }} role="img" aria-label="Inventory trend">
                {[0, 0.5, 1].map((t) => (
                    <g key={t}>
                        <line x1={padL} x2={W - 12} y1={padT + innerH * (1 - t)} y2={padT + innerH * (1 - t)} stroke="#e5e8ec" />
                        <text x={padL - 6} y={padT + innerH * (1 - t) + 4} fontSize="10" textAnchor="end" fill="#6e7681">{compact(min + span * t)}</text>
                    </g>
                ))}
                <path d={path} fill="none" stroke={color} strokeWidth="2" />
                {data.length <= 40 && data.map((d, i) => (
                    <circle key={d.label} cx={x(i)} cy={y(d.value)} r="3" fill={GOLD} stroke={color}><title>{`${d.label}: ${d.value} units`}</title></circle>
                ))}
                {data.map((d, i) => i % step === 0 && <text key={d.label} x={x(i)} y={H - 10} fontSize="10" textAnchor="middle" fill="#6e7681">{d.label.slice(5)}</text>)}
            </svg>
        </div>
    )
}

export function HBarList({ rows, format = (v) => v }) {
    // rows: [{ label, value, sub? }]
    const peak = Math.max(1, ...rows.map((r) => r.value))
    return (
        <div>
            {rows.map((r) => (
                <div key={r.label} className={styles.hBarRow}>
                    <div title={r.label} style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.label}</div>
                    <div className={styles.hBarTrack}><div className={styles.hBarFill} style={{ width: `${(r.value / peak) * 100}%` }} /></div>
                    <div className={styles.mono} style={{ textAlign: "right" }}>{format(r.value)}</div>
                </div>
            ))}
        </div>
    )
}
