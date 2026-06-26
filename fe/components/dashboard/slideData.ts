import type { InlineLessonPlan } from "@/lib/api/slides";

export type LessonCard = {
  id: string;
  title: string;
  description: string;
  subject: "Vật lý" | "Hóa học";
  grade: string;
  icon: "physics" | "chemistry";
  updatedAt: string;
  objectives: string[];
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
    objectives: [
      "Phát biểu định luật II Newton và giải thích ý nghĩa từng đại lượng",
      "Vận dụng F = ma để giải bài toán lực và gia tốc",
    ],
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
    objectives: [
      "Mô tả dao động điều hòa và các đại lượng đặc trưng",
      "Viết phương trình dao động và tính chu kì con lắc",
    ],
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
    objectives: [
      "Giải thích khái niệm điện trường và cường độ điện trường",
      "Tính hiệu điện thế giữa hai điểm trong điện trường đều",
    ],
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
    objectives: [
      "Phân biệt liên kết ion và liên kết cộng hóa trị",
      "Dự đoán loại liên kết trong hợp chất đơn giản",
    ],
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
    objectives: [
      "Xác định số oxi hóa của nguyên tố trong hợp chất",
      "Cân bằng phản ứng oxi hóa khử cơ bản",
    ],
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
    objectives: [
      "Phát biểu định luật bảo toàn cơ năng",
      "Áp dụng bảo toàn năng lượng vào bài toán rơi tự do và con lắc",
    ],
  },
];

const STYLE_OPTIONS = ["Tối giản", "Học thuật", "Sống động", "Truyền cảm hứng"] as const;

export function parseGradeLevel(grade: string): number {
  const digits = grade.replace(/\D+/g, "");
  const n = parseInt(digits, 10);
  return Number.isFinite(n) ? n : 10;
}

export function buildInlinePlan(lesson: LessonCard): InlineLessonPlan {
  return {
    lessonTitle: lesson.title,
    gradeLevel: parseGradeLevel(lesson.grade),
    totalDurationMinutes: 45,
    objectives: lesson.objectives,
    teachingMethods: ["Thuyết trình", "Thảo luận nhóm", "Bài tập thực hành"],
    activities: [
      {
        id: "a1",
        name: "Khởi động",
        durationMinutes: 10,
        goal: "Tạo hứng thú và kích hoạt kiến thức nền",
        teacherActions: `<p>Đặt câu hỏi tình huống liên quan ${lesson.title}.</p>`,
        studentActions: "<p>Thảo luận nhóm ngắn và trình bày.</p>",
        evaluation: "Học sinh nêu được vấn đề mở đầu.",
      },
      {
        id: "a2",
        name: "Hình thành kiến thức",
        durationMinutes: 20,
        goal: "Giúp học sinh nắm nội dung cốt lõi",
        teacherActions: `<p>Trình bày ${lesson.description}</p>`,
        studentActions: "<p>Ghi chép và trả lời câu hỏi.</p>",
        evaluation: "Học sinh giải thích được khái niệm chính.",
      },
      {
        id: "a3",
        name: "Luyện tập",
        durationMinutes: 10,
        goal: "Củng cố qua ví dụ và bài tập",
        teacherActions: "<p>Hướng dẫn giải 1–2 bài mẫu.</p>",
        studentActions: "<p>Làm bài theo nhóm.</p>",
        evaluation: "Học sinh vận dụng được công thức/khái niệm.",
      },
      {
        id: "a4",
        name: "Tổng kết",
        durationMinutes: 5,
        goal: "Chốt kiến thức bài học",
        teacherActions: "<p>Nhắc lại các ý chính và giao BTVN.</p>",
        studentActions: "<p>Tóm tắt bài học.</p>",
        evaluation: "Học sinh nêu được 3 ý chính.",
      },
    ],
    consolidation: `<p>Tóm tắt ${lesson.title} và liên hệ thực tiễn.</p>`,
    homework: `<p>Ôn lại nội dung ${lesson.title}; chuẩn bị bài sau.</p>`,
  };
}

export { STYLE_OPTIONS };
