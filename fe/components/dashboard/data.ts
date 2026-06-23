export type NavItem = {
  label: string;
  icon: string;
  active?: boolean;
  expanded?: boolean;
  child?: boolean;
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

export const navGroups: NavGroup[] = [
  {
    label: "COMMUNITY",
    items: [{ label: "Community Hub", icon: "community", active: true }],
  },
  {
    label: "CONTENT",
    items: [
      { label: "Bài giảng", icon: "book", active: true },
      { label: "Slide", icon: "slides" },
      { label: "Bài kiểm tra", icon: "check" },
    ],
  },
  {
    label: "SIMULATIONS",
    items: [
      { label: "Mô phỏng", icon: "atom", expanded: true },
      { label: "Vật lý", icon: "physics", child: true },
      { label: "Hóa học", icon: "chemistry", child: true },
      { label: "Bảng tuần hoàn", icon: "grid", child: true },
    ],
  },
  {
    label: "SYSTEM",
    items: [
      { label: "Cài đặt", icon: "settings" },
      { label: "Trợ giúp", icon: "help" },
    ],
  },
];

export const suggestions = [
  "Dao động điều hòa",
  "Bảo toàn năng lượng",
  "Điện trường",
  "Hàm số bậc hai",
  "Quang hợp",
  "Cảm ứng điện từ",
];

export const kpis = [
  ["11", "Lớp"],
  ["45", "phút · Thời lượng"],
  ["4", "Hoạt động"],
  ["4", "Mục tiêu"],
] as const;

export const objectives = [
  "Học sinh mô tả được khái niệm dao động điều hòa và các đại lượng đặc trưng",
  "Học sinh viết được phương trình dao động và giải thích ý nghĩa từng đại lượng",
  "Học sinh vận dụng công thức tính chu kì, vận tốc, gia tốc vào bài toán thực tế",
  "Học sinh liên hệ chuyển động tuần hoàn với kĩ năng làm việc nhóm",
];

export const methods = [
  "Giảng giải trực tiếp",
  "Đặt câu hỏi Socratic",
  "Thảo luận nhóm",
  "Học tập khám phá",
  "Thực nghiệm ảo",
];

export const materials = [
  "SGK Vật lí 11 - Bài 1: Dao động điều hòa",
  "Phần mềm mô phỏng PhET Interactive con lắc lò xo",
  "Phiếu học tập in sẵn với bài tập theo nhóm",
  "Máy chiếu và bảng trắng tương tác",
  "Câu hỏi trắc nghiệm nhanh (Google Forms)",
];

export const timeline = [
  {
    title: "Khởi động",
    time: "10 phút",
    type: "Mở đầu",
    description: "Kích hoạt kiến thức nền thông qua câu hỏi gợi mở",
  },
  {
    title: "Hình thành kiến thức",
    time: "20 phút",
    type: "Giảng dạy",
    description: "Trình bày lý thuyết dao động điều hòa qua minh họa",
  },
  {
    title: "Luyện tập",
    time: "10 phút",
    type: "Thực hành",
    description: "Giải bài tập theo nhóm, áp dụng công thức vào tình huống cụ thể",
  },
  {
    title: "Đánh giá & Củng cố",
    time: "5 phút",
    type: "Kiểm tra",
    description: "Kiểm tra nhanh mức độ tiếp thu qua câu hỏi trắc nghiệm",
  },
];

export const homework = [
  "Bài 1-4 trang 12 SGK Vật lí 11",
  "Đọc trước nội dung con lắc lò xo (Bài 2)",
  "Vẽ đồ thị x(t) cho dao động có A = 5cm, T = 2s",
];
