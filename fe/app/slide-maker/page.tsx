import { Sidebar } from "@/components/layout/Sidebar";
import { SlideEditor } from "@/components/slide-editor/SlideEditor";

export default function SlideMakerPage() {
  return (
    <main className="h-screen w-full overflow-hidden bg-[#f5f1ec] text-[#171717]">
      <div className="flex h-full w-full">
        <Sidebar activeHref="/slide-create" />
        <section className="min-w-0 flex-1 overflow-hidden">
          <SlideEditor />
        </section>
      </div>
    </main>
  );
}
