// Slim cross-tool bar shared across the EVIDENCIA course apps (C2, C3, C5).
// Self-contained inline styles so it needs no CSS setup. `active` marks this app.
const TOOLS = [
  { key: 'c2', label: 'C2 · Statistics', href: 'https://statistics.evidencia.ai' },
  { key: 'c3', label: 'C3 · Sample Size', href: 'https://sampsize.evidencia.ai' },
  { key: 'c4', label: 'C4 · Writing', href: 'https://writing.evidencia.ai' },
  { key: 'c5', label: 'C5 · Meta-Analysis', href: 'https://meta-analysis.io', external: true },
];

const S = {
  bar: { display: 'flex', alignItems: 'center', gap: '6px 14px', flexWrap: 'wrap',
         background: '#0b5a54', color: '#dbeeeb', padding: '7px 22px', fontSize: 12.5,
         fontFamily: 'Arial, Helvetica, sans-serif' },
  brand: { fontWeight: 700, letterSpacing: '.4px', color: '#fff', marginRight: 4 },
  links: { display: 'flex', gap: 4, flexWrap: 'wrap' },
  link: { color: '#cfe8e4', textDecoration: 'none', padding: '3px 10px', borderRadius: 6 },
  active: { background: '#fff', color: '#0b5a54', fontWeight: 600 },
  portal: { marginLeft: 'auto', color: '#a9d6d0', textDecoration: 'none' },
};

export default function ToolSwitcher({ active }) {
  return (
    <div style={S.bar}>
      <span style={S.brand}>EVIDENCIA Tools</span>
      <nav style={S.links}>
        {TOOLS.map((t) => (
          <a key={t.key} href={t.href} style={{ ...S.link, ...(t.key === active ? S.active : {}) }}
             {...(t.external ? { target: '_blank', rel: 'noreferrer' } : {})}>
            {t.label}{t.external ? ' ↗' : ''}
          </a>
        ))}
      </nav>
      <a style={S.portal} href="https://live.negida.com/tools">← Course Portal</a>
    </div>
  );
}
