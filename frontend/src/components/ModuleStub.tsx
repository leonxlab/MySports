// Placeholder halaman. Ganti dengan komponen dari src/modules/<modul>/components.
export function ModuleStub({
  module,
  title,
  route,
}: {
  module: string;
  title: string;
  route: string;
}) {
  return (
    <main style={{ padding: 24, maxWidth: 640 }}>
      <h1>{title}</h1>
      <p>
        Modul <code>{module}</code>, route <code>{route}</code>. Belum dikerjakan.
      </p>
      <p>
        Lihat <code>frontend/src/modules/{module}/README.md</code>.
      </p>
    </main>
  );
}
