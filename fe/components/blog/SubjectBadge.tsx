import { subjectBadgeClasses, subjectLabel } from "@/lib/blog";

export function SubjectBadge({ subject }: { subject: string }) {
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ${subjectBadgeClasses(subject)}`}>
      {subjectLabel(subject)}
    </span>
  );
}
