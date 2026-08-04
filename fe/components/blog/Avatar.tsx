import { useState } from "react";
import { avatarColorFor, initialsOf } from "@/lib/blog";

const SIZE_TEXT: Record<number, string> = {
  28: "text-[10px]",
  32: "text-[11px]",
  34: "text-[12px]",
  40: "text-[14px]",
};

export function Avatar({ name, seed, imageUrl, size = 34 }: { name: string; seed: string; imageUrl?: string | null; size?: 28 | 32 | 34 | 40 }) {
  const [imageFailed, setImageFailed] = useState(false);
  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full font-bold text-white ${SIZE_TEXT[size]}`}
      style={{ backgroundColor: avatarColorFor(seed), width: size, height: size }}
    >
      {imageUrl && !imageFailed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="" className="size-full object-cover" onError={() => setImageFailed(true)} />
      ) : initialsOf(name)}
    </div>
  );
}
