import { ModuleStub } from "@/components/ModuleStub";
import { GenerateHighlightButton } from "@/modules/vip";

export default function Page() {
  return (
    <>
      <ModuleStub module="scoring" title="Hasil match" route="/match/[id]/result" />
      {/* TODO(integration): halaman hasil scoring belum menyediakan data match untuk fitur highlight. */}
      <section aria-label="Fitur VIP" style={{ margin: "0 auto", maxWidth: 640, padding: 24 }}>
        <GenerateHighlightButton />
      </section>
    </>
  );
}
