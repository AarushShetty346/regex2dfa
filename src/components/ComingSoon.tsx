interface ComingSoonProps {
  title: string;
  note?: string;
}

/** Placeholder for features that are planned but not built yet. */
export default function ComingSoon({ title, note }: ComingSoonProps) {
  return (
    <section className="card coming-soon">
      <h2>{title}</h2>
      <p className="coming-soon-label">Coming soon</p>
      <p className="muted">{note ?? 'This visualizer has not been built yet.'}</p>
    </section>
  );
}
