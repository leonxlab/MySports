// Komponen kecil untuk state loading, error, dan kosong. Dipakai halaman modul Jonathan.
export function Loading({ text = "Memuat…" }: { text?: string }) {
  return <p role="status">{text}</p>;
}

export function ErrorNote({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" style={{ color: "crimson" }}>
      {message}
    </p>
  );
}

export function Page({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main style={{ padding: 24, maxWidth: 720, margin: "0 auto" }}>
      <h1>{title}</h1>
      {children}
    </main>
  );
}

export function Card({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ border: "1px solid #8884", borderRadius: 8, padding: 12, margin: "8px 0" }}>
      {children}
    </div>
  );
}
