import { avatarColorFor, initialsOf } from "@/lib/blog";

const SIZE_TEXT: Record<number, string> = {
  28: "text-[10px]",
  32: "text-[11px]",
  34: "text-[12px]",
  40: "text-[14px]",
};

export function Avatar({ name, seed, size = 34 }: { name: string; seed: string; size?: 28 | 32 | 34 | 40 }) {
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full font-bold text-white ${SIZE_TEXT[size]}`}
      style={{ backgroundColor: avatarColorFor(seed), width: size, height: size }}
    >
      {initialsOf(name)}
    </div>
  );
}
