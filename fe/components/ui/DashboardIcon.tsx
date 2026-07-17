const iconFiles: Record<string, string> = {
  aiBadge: "ai-badge.svg",
  atom: "simulation.svg",
  book: "lesson.svg",
  check: "quiz.svg",
  chevronUp: "chevron-up.svg",
  chevronDown: "/arrow down.svg",
  chipGroup: "chip-group.svg",
  chipHarder: "chip-harder.svg",
  chipQuestion: "chip-question.svg",
  chipTighten: "chip-tighten.svg",
  createSlide: "create-slide.svg",
  formTitle: "form-title.svg",
  grid: "periodic-table.svg",
  library: "/Group.svg",
  chemistryLight: "/lets-icons_chemistry-light.png",
  headerBadge: "header-badge.svg",
  help: "help.svg",
  notification: "notification.svg",
  save: "save.svg",
  community: "/community.svg",
  sectionConsolidate: "section-consolidate.svg",
  sectionHomework: "section-homework.svg",
  sectionMaterials: "section-materials.svg",
  sectionMethods: "section-methods.svg",
  sectionObjectives: "section-objectives.svg",
  sectionTimeline: "section-timeline.svg",
  send: "send.svg",
  settings: "settings.svg",
  slides: "slide.svg",
  spark: "logo-spark.svg",
  upload: "upload.svg",
};

iconFiles.atom = "/Icon.svg";
iconFiles.chemistry = "/chem.svg";
iconFiles.physics = "/physical.svg";

export function DashboardIcon({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const file = iconFiles[name];

  if (!file) {
    return (
      <span
        aria-hidden
        className={`block size-1.5 shrink-0 rounded-full bg-current ${className ?? ""}`}
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={file.startsWith("/") ? file : `/dashboard/icons/${file}`}
      alt=""
      aria-hidden
      className={`block size-4 shrink-0 ${className ?? ""}`}
    />
  );
}
