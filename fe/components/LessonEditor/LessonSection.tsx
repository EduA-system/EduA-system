"use client";

import type { LessonSection } from "@/data/lessonMock";
import { EditableText } from "./EditableText";

interface LessonSectionProps {
  section: LessonSection;
  onUpdateTitle: (title: string) => void;
  onUpdateItem: (itemId: string, text: string) => void;
}

export function LessonSection({ section, onUpdateTitle, onUpdateItem }: LessonSectionProps) {
  return (
    <section>
      <EditableText
        value={section.title}
        onChange={onUpdateTitle}
        placeholder="Ten phan"
        className="min-h-[28px] text-[20px] font-semibold leading-[28px] text-[#2b2926]"
      />

      <div className="mt-2 space-y-1">
        {section.items.map((item) => (
          <EditableText
            key={item.id}
            value={item.text}
            onChange={(text) => onUpdateItem(item.id, text)}
            placeholder="Nhap noi dung muc..."
            className="min-h-[24px] text-[15px] leading-[24px] text-[#4f4943]"
          />
        ))}
      </div>
    </section>
  );
}
