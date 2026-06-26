/**
 * Khung Kế hoạch bài dạy theo Công văn 5512/BGDĐT-GDTrH (Phụ lục IV, kiểu KNTT).
 *
 * Giá trị các ô hiện là NGUYÊN VĂN HƯỚNG DẪN gốc (placeholder) — giáo viên đọc và thay
 * bằng nội dung thật ở bước sau. Khóa/field là phần cố định (khung 5512).
 *
 * Cấu trúc bám mẫu thực tế `Bai-19...KNTT.docx`: năng lực 2 tầng (chung + đặc thù),
 * học liệu có phiếu học tập, mỗi hoạt động có thời lượng + tiểu hoạt động, mục
 * d) Tổ chức thực hiện tách 4 bước chuẩn. Schema khớp DTO backend dự kiến.
 */

/** Mục d) Tổ chức thực hiện — 4 bước chuẩn CV 5512. */
export interface Organization {
  transfer: string; // Giao nhiệm vụ học tập
  perform: string; // Thực hiện nhiệm vụ
  report: string; // Báo cáo, thảo luận
  conclude: string; // Kết luận, nhận định (+ đánh giá)
}

export interface Activity5512 {
  order: number;
  name: string;
  duration: string;
  objective: string; // a) Mục tiêu
  content: string; // b) Nội dung
  product: string; // c) Sản phẩm
  organization: Organization; // d) Tổ chức thực hiện
  subActivities: Activity5512[]; // tiểu hoạt động (nhất là HĐ2); rỗng nếu không có
}

export interface Worksheet {
  name: string;
  content: string;
}

/** Phần I. MỤC TIÊU — khớp DTO `Objectives` của backend. */
export interface Objectives {
  knowledge: string[];
  competencies: {
    general: string[];
    specific: string[];
  };
  qualities: string[];
}

export interface LessonPlan5512 {
  title: string;
  metadata: {
    school: string;
    department: string;
    teacher: string;
    subject: string;
    grade: string;
    duration: string;
  };
  objectives: Objectives;
  equipmentAndMaterials: {
    equipment: string[];
    worksheets: Worksheet[];
  };
  activities: Activity5512[];
}

const standardOrganization: Organization = {
  transfer: "Giao nhiệm vụ học tập: GV chuyển giao nhiệm vụ cụ thể cho HS.",
  perform: "Thực hiện nhiệm vụ: HS thực hiện nhiệm vụ (cá nhân/nhóm).",
  report: "Báo cáo, thảo luận: HS trình bày kết quả; các HS khác nhận xét, bổ sung.",
  conclude: "Kết luận, nhận định: GV nhận xét, chốt kiến thức và đánh giá kết quả hoạt động.",
};

export const lessonPlan5512Mock: LessonPlan5512 = {
  title: "TÊN BÀI DẠY: …………………………………..",
  metadata: {
    school: "Trường: ...................",
    department: "Tổ: ............................",
    teacher: "Họ và tên giáo viên: ……………………",
    subject: "Môn học/Hoạt động giáo dục: ……….",
    grade: "lớp: ………",
    duration: "Thời gian thực hiện: (số tiết)",
  },
  objectives: {
    knowledge: [
      "Nêu cụ thể nội dung kiến thức học sinh cần học trong bài theo yêu cầu cần đạt của chương trình môn học.",
    ],
    competencies: {
      general: [
        "Năng lực tự chủ và tự học: tìm kiếm thông tin trong SGK, quan sát hình ảnh/thí nghiệm để rút ra nhận xét.",
        "Năng lực giao tiếp và hợp tác: làm việc nhóm tìm hiểu nội dung bài học.",
        "Năng lực giải quyết vấn đề và sáng tạo: vận dụng kiến thức để giải thích, đề xuất giải pháp.",
      ],
      specific: [
        "Nêu các biểu hiện năng lực đặc thù của môn học (vd: nhận thức …; tìm hiểu tự nhiên …; vận dụng kiến thức, kĩ năng đã học).",
      ],
    },
    qualities: [
      "Nêu yêu cầu về hành vi, thái độ (biểu hiện cụ thể của phẩm chất cần phát triển gắn với nội dung bài dạy).",
    ],
  },
  equipmentAndMaterials: {
    equipment: [
      "Máy tính, máy chiếu.",
      "Dụng cụ và hóa chất/vật liệu phục vụ thí nghiệm (nếu có).",
    ],
    worksheets: [
      {
        name: "Phiếu học tập số 1",
        content:
          "Nêu rõ nhiệm vụ HS phải thực hiện và hệ thống câu hỏi tương ứng của phiếu học tập.",
      },
    ],
  },
  activities: [
    {
      order: 1,
      name: "Hoạt động 1: Khởi động/Xác định vấn đề",
      duration: "5 phút",
      objective:
        "Tạo nhu cầu/tâm thế tìm hiểu kiến thức mới; xác định vấn đề/nhiệm vụ cụ thể cần giải quyết trong bài.",
      content:
        "Nêu rõ nhiệm vụ cụ thể HS phải thực hiện (trò chơi, tình huống, câu hỏi, bài tập…) để xác định vấn đề và đề xuất cách giải quyết.",
      product: "Câu trả lời/kết quả HS cần đạt được; kèm đáp án (nếu có).",
      organization: { ...standardOrganization },
      subActivities: [],
    },
    {
      order: 2,
      name: "Hoạt động 2: Hình thành kiến thức mới",
      duration: "… phút",
      objective:
        "Giúp HS chiếm lĩnh kiến thức mới/giải quyết vấn đề đặt ra từ Hoạt động 1.",
      content:
        "HS làm việc với SGK, thiết bị dạy học, học liệu (đọc/xem/nghe/làm) để chiếm lĩnh kiến thức.",
      product: "Kiến thức mới/kết quả HS cần viết ra, trình bày được.",
      organization: { ...standardOrganization },
      subActivities: [
        {
          order: 1,
          name: "Tiểu hoạt động 2.1: (tên đơn vị kiến thức)",
          duration: "… phút",
          objective: "Mục tiêu của tiểu hoạt động.",
          content: "Nội dung/nhiệm vụ cụ thể của tiểu hoạt động.",
          product: "Sản phẩm dự kiến (đáp án, kết luận kiến thức).",
          organization: { ...standardOrganization },
          subActivities: [],
        },
      ],
    },
    {
      order: 3,
      name: "Hoạt động 3: Luyện tập",
      duration: "… phút",
      objective:
        "Củng cố, khắc sâu kiến thức đã học; tiếp tục phát triển kĩ năng vận dụng.",
      content:
        "Hệ thống câu hỏi, bài tập (có thể phân mức: nhận biết → thông hiểu → vận dụng → vận dụng cao).",
      product: "Đáp án, lời giải của các câu hỏi, bài tập.",
      organization: { ...standardOrganization },
      subActivities: [],
    },
    {
      order: 4,
      name: "Hoạt động 4: Vận dụng",
      duration: "… phút",
      objective: "Vận dụng kiến thức, kĩ năng đã học vào giải quyết vấn đề/tình huống thực tiễn.",
      content: "Yêu cầu HS phát hiện/giải quyết vấn đề thực tiễn gắn với nội dung bài học.",
      product: "Bài viết/báo cáo của HS về vấn đề thực tiễn.",
      organization: {
        ...standardOrganization,
        conclude:
          "Kết luận, nhận định: GV hướng dẫn HS thực hiện ở nhà; đánh giá kết quả vào buổi học kế tiếp.",
      },
      subActivities: [],
    },
  ],
};
