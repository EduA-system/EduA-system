import type { SubjectCode } from "../../lib/auth/subject-access";

export type Role = "TEACHER" | "MODERATOR" | "PRINCIPAL" | "IT_STAFF" | "STUDENT";

export type NavItem = {
  label: string;
  icon: string;
  href: string;
  active?: boolean;
  expanded?: boolean;
  child?: boolean;
  requiredRole?: Role[];
  requiredSubjects?: SubjectCode[];
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

export const navGroups: NavGroup[] = [
  {
    label: "Kh\u00f4ng gian chung",
    items: [
      { label: "Community Hub", icon: "community", href: "/community-hub", requiredRole: ["TEACHER", "MODERATOR", "PRINCIPAL", "STUDENT"] },
      { label: "Blog", icon: "community", href: "/blog", requiredRole: ["TEACHER", "MODERATOR"] },
      { label: "Thông báo", icon: "notification", href: "/notifications" },
    ],
  },
  {
    label: "N\u1ed9i dung gi\u1ea3ng d\u1ea1y",
    items: [
      { label: "Thư viện của tôi", icon: "book", href: "/library", requiredRole: ["TEACHER", "MODERATOR"] },
      { label: "Lớp học", icon: "book", href: "/list-class", requiredRole: ["TEACHER", "MODERATOR"] },
      { label: "Lớp học", icon: "book", href: "/list-class", requiredRole: ["STUDENT"] },
      { label: "Lịch nộp giáo án", icon: "book", href: "/weekly-schedule", requiredRole: ["TEACHER", "MODERATOR"] },
      { label: "T\u1ea1o b\u00e0i gi\u1ea3ng", icon: "book", href: "/lesson-create", active: true, requiredRole: ["TEACHER", "MODERATOR"] },
      { label: "T\u1ea1o slide", icon: "slides", href: "/slide-create", requiredRole: ["TEACHER", "MODERATOR"] },
      { label: "T\u1ea1o b\u00e0i ki\u1ec3m tra", icon: "check", href: "/exam-create-new", requiredRole: ["TEACHER", "MODERATOR"] },
    ],
  },
  {
    label: "M\u00f4 ph\u1ecfng & kh\u00e1m ph\u00e1",
    items: [
      { label: "M\u00f4 ph\u1ecfng", icon: "atom", href: "/homepage", expanded: true, requiredRole: ["TEACHER", "MODERATOR", "PRINCIPAL", "STUDENT"], requiredSubjects: ["PHYSICS", "CHEMISTRY"] },
      { label: "V\u1eadt l\u00fd", icon: "physics", href: "/mo-phong-vat-ly", child: true, requiredRole: ["TEACHER", "MODERATOR"], requiredSubjects: ["PHYSICS"] },
      { label: "B\u1ea3ng tu\u1ea7n ho\u00e0n", icon: "grid", href: "/periodic-table", child: true, requiredRole: ["TEACHER", "MODERATOR"], requiredSubjects: ["CHEMISTRY"] },
      { label: "C\u1ea5u t\u1ea1o ch\u1ea5t", icon: "atom", href: "/molecules", child: true, requiredRole: ["TEACHER", "MODERATOR"], requiredSubjects: ["CHEMISTRY"] },
    ],
  },
  {
    label: "H\u1ec7 th\u1ed1ng & h\u1ed7 tr\u1ee3",
    items: [
      { label: "C\u00e0i \u0111\u1eb7t", icon: "settings", href: "/homepage" },
      { label: "Tr\u1ee3 gi\u00fap", icon: "help", href: "/help" },
    ],
  },
  {
    label: "Qu\u1ea3n tr\u1ecb",
    items: [
      { label: "Blog Ki\u1ec3m duy\u1ec7t", icon: "community", href: "/blog-moderator", requiredRole: ["MODERATOR"] },
      { label: "Hub Ki\u1ec3m duy\u1ec7t", icon: "community", href: "/hub-moderation", requiredRole: ["MODERATOR"] },
      { label: "Duy\u1ec7t gi\u00e1o \u00e1n tu\u1ea7n", icon: "check", href: "/lesson-plan-approval", requiredRole: ["MODERATOR"] },
      { label: "Th\u1ed1ng k\u00ea", icon: "stats", href: "/statistics", requiredRole: ["MODERATOR", "PRINCIPAL"] },
      { label: "Qu\u1ea3n l\u00fd t\u00e0i kho\u1ea3n", icon: "settings", href: "/user-management", requiredRole: ["MODERATOR", "PRINCIPAL"] },
      { label: "C\u1ea5u h\u00ecnh AI", icon: "settings", href: "/it-staff", requiredRole: ["IT_STAFF"] },
      { label: "Nh\u1eadt k\u00fd ho\u1ea1t \u0111\u1ed9ng", icon: "settings", href: "/it-staff/activity-log", requiredRole: ["IT_STAFF"] },
    ],
  },
];

export const suggestions = [
  "Dao \u0111\u1ed9ng \u0111i\u1ec1u h\u00f2a",
  "B\u1ea3o to\u00e0n n\u0103ng l\u01b0\u1ee3ng",
  "\u0110i\u1ec7n tr\u01b0\u1eddng",
  "H\u00e0m s\u1ed1 b\u1eadc hai",
  "Quang h\u1ee3p",
  "C\u1ea3m \u1ee9ng \u0111i\u1ec7n t\u1eeb",
];

export const kpis = [
  ["11", "L\u1edbp"],
  ["45", "ph\u00fat \u00b7 Th\u1eddi l\u01b0\u1ee3ng"],
  ["4", "Ho\u1ea1t \u0111\u1ed9ng"],
  ["4", "M\u1ee5c ti\u00eau"],
] as const;

export const objectives = [
  "H\u1ecdc sinh m\u00f4 t\u1ea3 \u0111\u01b0\u1ee3c kh\u00e1i ni\u1ec7m dao \u0111\u1ed9ng \u0111i\u1ec1u h\u00f2a v\u00e0 c\u00e1c \u0111\u1ea1i l\u01b0\u1ee3ng \u0111\u1eb7c tr\u01b0ng",
  "H\u1ecdc sinh vi\u1ebft \u0111\u01b0\u1ee3c ph\u01b0\u01a1ng tr\u00ecnh dao \u0111\u1ed9ng v\u00e0 gi\u1ea3i th\u00edch \u00fd ngh\u0129a t\u1eebng \u0111\u1ea1i l\u01b0\u1ee3ng",
  "H\u1ecdc sinh v\u1eadn d\u1ee5ng c\u00f4ng th\u1ee9c t\u00ednh chu k\u00ec, v\u1eadn t\u1ed1c, gia t\u1ed1c v\u00e0o b\u00e0i to\u00e1n th\u1ef1c t\u1ebf",
  "H\u1ecdc sinh li\u00ean h\u1ec7 chuy\u1ec3n \u0111\u1ed9ng tu\u1ea7n ho\u00e0n v\u1edbi k\u0129 n\u0103ng l\u00e0m vi\u1ec7c nh\u00f3m",
];

export const methods = [
  "Gi\u1ea3ng gi\u1ea3i tr\u1ef1c ti\u1ebfp",
  "\u0110\u1eb7t c\u00e2u h\u1ecfi Socratic",
  "Th\u1ea3o lu\u1eadn nh\u00f3m",
  "H\u1ecdc t\u1eadp kh\u00e1m ph\u00e1",
  "Th\u1ef1c nghi\u1ec7m \u1ea3o",
];

export const materials = [
  "SGK V\u1eadt l\u00ed 11 - B\u00e0i 1: Dao \u0111\u1ed9ng \u0111i\u1ec1u h\u00f2a",
  "Ph\u1ea7n m\u1ec1m m\u00f4 ph\u1ecfng PhET Interactive con l\u1eafc l\u00f2 xo",
  "Phi\u1ebfu h\u1ecdc t\u1eadp in s\u1eb5n v\u1edbi b\u00e0i t\u1eadp theo nh\u00f3m",
  "M\u00e1y chi\u1ebfu v\u00e0 b\u1ea3ng tr\u1eafng t\u01b0\u01a1ng t\u00e1c",
  "C\u00e2u h\u1ecfi tr\u1eafc nghi\u1ec7m nhanh (Google Forms)",
];

export const timeline = [
  {
    title: "Kh\u1edfi \u0111\u1ed9ng",
    time: "10 ph\u00fat",
    type: "M\u1edf \u0111\u1ea7u",
    description: "K\u00edch ho\u1ea1t ki\u1ebfn th\u1ee9c n\u1ec1n th\u00f4ng qua c\u00e2u h\u1ecfi g\u1ee3i m\u1edf",
  },
  {
    title: "H\u00ecnh th\u00e0nh ki\u1ebfn th\u1ee9c",
    time: "20 ph\u00fat",
    type: "Gi\u1ea3ng d\u1ea1y",
    description: "Tr\u00ecnh b\u00e0y l\u00fd thuy\u1ebft dao \u0111\u1ed9ng \u0111i\u1ec1u h\u00f2a qua minh h\u1ecda",
  },
  {
    title: "Luy\u1ec7n t\u1eadp",
    time: "10 ph\u00fat",
    type: "Th\u1ef1c h\u00e0nh",
    description: "Gi\u1ea3i b\u00e0i t\u1eadp theo nh\u00f3m, \u00e1p d\u1ee5ng c\u00f4ng th\u1ee9c v\u00e0o t\u00ecnh hu\u1ed1ng c\u1ee5 th\u1ec3",
  },
  {
    title: "\u0110\u00e1nh gi\u00e1 & C\u1ee7ng c\u1ed1",
    time: "5 ph\u00fat",
    type: "Ki\u1ec3m tra",
    description: "Ki\u1ec3m tra nhanh m\u1ee9c \u0111\u1ed9 ti\u1ebfp thu qua c\u00e2u h\u1ecfi tr\u1eafc nghi\u1ec7m",
  },
];

export const homework = [
  "B\u00e0i 1-4 trang 12 SGK V\u1eadt l\u00ed 11",
  "\u0110\u1ecdc tr\u01b0\u1edbc n\u1ed9i dung con l\u1eafc l\u00f2 xo (B\u00e0i 2)",
  "V\u1ebd \u0111\u1ed3 th\u1ecb x(t) cho dao \u0111\u1ed9ng c\u00f3 A = 5cm, T = 2s",
];
