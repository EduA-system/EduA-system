export interface LessonItem {
  id: string;
  text: string;
}

export interface LessonSection {
  id: number;
  title: string;
  items: LessonItem[];
}

export interface Lesson {
  id: string;
  title: string;
  subject: string;
  grade: string;
  duration: string;
  sections: LessonSection[];
}

export const lessonMock: Lesson = {
  id: "mock-1",
  title: "Dao động điều hòa",
  subject: "Vật lý 11",
  grade: "11",
  duration: "45 phút",
  sections: [
    {
      id: 1,
      title: "Mục tiêu bài học",
      items: [
        { id: "1-1", text: "Học sinh mô tả được khái niệm dao động điều hòa" },
        { id: "1-2", text: "Học sinh viết được phương trình dao động x = A·cos(ωt + φ)" },
        { id: "1-3", text: "Học sinh phân tích được các đặc trưng: biên độ, chu kỳ, tần số" },
      ],
    },
    {
      id: 2,
      title: "Phương pháp giảng dạy",
      items: [
        { id: "2-1", text: "Giảng giải trực tiếp kết hợp trình chiếu minh họa" },
        { id: "2-2", text: "Thảo luận nhóm nhỏ (4–5 học sinh)" },
        { id: "2-3", text: "Thí nghiệm mô phỏng con lắc đơn và lò xo" },
      ],
    },
    {
      id: 3,
      title: "Hoạt động khởi động (5 phút)",
      items: [
        { id: "3-1", text: "Quan sát video con lắc đơn dao động" },
        { id: "3-2", text: "Đặt câu hỏi gợi mở: \"Chuyển động này có quy luật gì?\"" },
      ],
    },
    {
      id: 4,
      title: "Hoạt động hình thành kiến thức (25 phút)",
      items: [
        { id: "4-1", text: "Giới thiệu định nghĩa dao động điều hòa" },
        { id: "4-2", text: "Trình bày phương trình: x = A·cos(ωt + φ)" },
        { id: "4-3", text: "Dẫn xuất công thức vận tốc v = −Aω·sin(ωt + φ)" },
        { id: "4-4", text: "Dẫn xuất công thức gia tốc a = −Aω²·cos(ωt + φ)" },
      ],
    },
    {
      id: 5,
      title: "Hoạt động luyện tập (10 phút)",
      items: [
        { id: "5-1", text: "Bài tập trắc nghiệm nhanh (5 câu)" },
        { id: "5-2", text: "Giải bài tập mẫu trang 12 SGK" },
      ],
    },
    {
      id: 6,
      title: "Đánh giá & Dặn dò (5 phút)",
      items: [
        { id: "6-1", text: "Kiểm tra nhanh bằng phiếu trả lời nhanh" },
        { id: "6-2", text: "Bài tập về nhà: bài 1–5 trang 13–14 SGK" },
        { id: "6-3", text: "Chuẩn bị bài tiếp theo: Con lắc đơn" },
      ],
    },
  ],
};
