/**
 * Переключатель день/ночь: солнце едет и становится луной одной внутренней тенью,
 * небо темнеет, облака уплывают, загораются звёзды. Шортс «Солнце → луна одной тенью».
 */
const STARS = Array.from({ length: 22 }, (_, i) => ({
  // равномерно-случайное небо: дробные части золотого сечения
  x: 4 + ((i * 0.618034 + 0.13) % 1) * 92,
  y: 4 + ((i * 0.7548777 + 0.41) % 1) * 50,
  r: 2 + (i % 3),
  d: (i % 5) * 0.4,
}));

export function ThemeToggle({ checked, onChange, labels }: { checked: boolean; onChange: (v: boolean) => void; labels: [day: string, night: string] }) {
  return (
    <div className={`sky ${checked ? "night" : ""}`}>
      {STARS.map((s, i) => (
        <span key={i} className="star" style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.r * 2, height: s.r * 2, animationDelay: `${s.d}s` }} />
      ))}
      <span className="cloud" style={{ left: "8%", top: "14%", scale: "1" }} />
      <span className="cloud" style={{ left: "56%", top: "26%", scale: ".8" }} />
      <span className="cloud" style={{ left: "26%", top: "38%", scale: ".6" }} />
      <label className="toggle">
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} aria-label={labels[1]} />
        <span className="knob" aria-hidden="true" />
      </label>
      <b className="sky-label">{checked ? labels[1] : labels[0]}</b>
    </div>
  );
}
