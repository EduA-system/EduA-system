export type LessonCard = {
  id: string;
  title: string;
  description: string;
  subject: "Vật lý" | "Hóa học";
  grade: string;
  icon: "physics" | "chemistry";
  updatedAt: string;
};

export const lessons: LessonCard[] = [
  {
    id: "newton-2",
    title: "Định luật II Newton",
    description:
      "Lực, gia tốc và mối quan hệ khối lượng kèm bài tập minh họa thực tế.",
    subject: "Vật lý",
    grade: "Lớp 10",
    icon: "physics",
    updatedAt: "10 thg 6, 2026",
  },
  {
    id: "dao-dong-dieu-hoa",
    title: "Dao động điều hòa & Con lắc",
    description:
      "Chu kỳ, tần số, biên độ và phương trình dao động của con lắc đơn.",
    subject: "Vật lý",
    grade: "Lớp 11",
    icon: "physics",
    updatedAt: "8 thg 6, 2026",
  },
  {
    id: "dien-truong",
    title: "Điện trường & Điện thế",
    description:
      "Đại lượng đặc trưng cho điện trường, đường sức điện và hiệu điện thế.",
    subject: "Vật lý",
    grade: "Lớp 11",
    icon: "physics",
    updatedAt: "5 thg 6, 2026",
  },
  {
    id: "lien-ket-hoa-hoc",
    title: "Liên kết hóa học",
    description:
      "Liên kết ion, liên kết cộng hóa trị và tính chất hợp chất đại diện.",
    subject: "Hóa học",
    grade: "Lớp 10",
    icon: "chemistry",
    updatedAt: "2 thg 6, 2026",
  },
  {
    id: "phan-ung-oxi-hoa-khu",
    title: "Phản ứng oxi hóa - khử",
    description:
      "Quy tắc xác định số oxi hóa và cân bằng phản ứng redox cơ bản.",
    subject: "Hóa học",
    grade: "Lớp 10",
    icon: "chemistry",
    updatedAt: "28 thg 5, 2026",
  },
  {
    id: "bao-tan-nang-luong",
    title: "Bảo toàn năng lượng",
    description:
      "Định luật bảo toàn cơ học năng lượng trong chuyển động và dao động.",
    subject: "Vật lý",
    grade: "Lớp 10",
    icon: "physics",
    updatedAt: "25 thg 5, 2026",
  },
];
