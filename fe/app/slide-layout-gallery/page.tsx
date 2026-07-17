import { generateSlideLayout } from "@/lib/slide-layout/engine";
import { GALLERY_FAMILIES, galleryFixture } from "@/lib/slide-layout/gallery-fixtures";

const densities = ["sparse", "normal", "dense"] as const;

export default function SlideLayoutGalleryPage() {
  return <main className="min-h-screen bg-[#f5f1ec] p-8 text-[#2b2926]">
    <h1 className="text-2xl font-bold">Dynamic slide layout fixtures</h1>
    <p className="mt-1 text-sm text-[#6b625a]">Mỗi family ở ba mức mật độ, seed cố định để visual QA.</p>
    <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
      {GALLERY_FAMILIES.flatMap((family) => densities.map((density) => {
        const result = generateSlideLayout(galleryFixture(family, density));
        return <article key={`${family}-${density}`} className="rounded-xl border bg-white p-3 shadow-sm">
          <div className="mb-2 flex justify-between text-xs"><strong>{family} · {density}</strong><span>{result.topology} · {result.score.total}</span></div>
          <div className="relative aspect-video overflow-hidden rounded border bg-[#fffdf9]">
            <div className="absolute left-0 top-0 h-[540px] w-[960px] origin-top-left scale-[0.34]">
              {result.structures.map((item) => <div key={item.id} className="absolute rounded-xl border-2 border-[#d97757]/40 bg-[#f7e9dd]" style={{ left: item.rect.x, top: item.rect.y, width: item.rect.w, height: item.rect.h }} />)}
              {result.slots.map((slot) => <div key={slot.id} className={`absolute overflow-hidden border-2 p-2 text-sm ${slot.kind === "image" ? "border-blue-500 bg-blue-100" : "border-emerald-600 bg-emerald-50"}`} style={{ left: slot.rect.x, top: slot.rect.y, width: slot.rect.w, height: slot.rect.h }}>{slot.sourcePartId ?? slot.sourceBlockId}<br />{slot.sourceText}</div>)}
            </div>
          </div>
        </article>;
      }))}
    </div>
  </main>;
}

