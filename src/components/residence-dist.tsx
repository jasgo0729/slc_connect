/**
 * 방학 중 거주지 분포.
 *
 * 방학 구간에는 만날 수 있는지가 거주지에 달려 있어서, 참여 전에
 * 알아야 하는 정보다(G-09 온라인 인정과도 연결된다).
 * 인원 수만 보여주고 누가 어디 사는지는 드러내지 않는다.
 */
const TONES = ['#2dd4bf', '#fbbf24', '#c4b5fd', '#647feb', '#f9a8d4'];

export function ResidenceDist({ data }: { data: { label: string; count: number }[] }) {
  const total = data.reduce((s, d) => s + d.count, 0);
  if (total === 0) return null;

  return (
    <div>
      <div className="dist-legend">
        {data.map((d, i) => (
          <span key={d.label} className="dist-key">
            <span className="dist-dot" style={{ background: TONES[i % TONES.length] }} />
            {d.label} ({d.count}명)
          </span>
        ))}
      </div>
      <div
        className="dist-bar"
        role="img"
        aria-label={data.map((d) => `${d.label} ${d.count}명`).join(', ')}
      >
        {data.map((d, i) => (
          <span
            key={d.label}
            className="dist-seg"
            style={{
              width: `${(d.count / total) * 100}%`,
              background: TONES[i % TONES.length],
            }}
          />
        ))}
      </div>
    </div>
  );
}
