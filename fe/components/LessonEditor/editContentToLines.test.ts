import { describe, expect, it } from "vitest";
import { editDataToBodyText } from "./editContentToLines";
import type { EditLessonSectionEdit } from "@/services/lessonPlanService";

describe("editDataToBodyText — kind text", () => {
  it("nối các dòng bằng \\n, không thêm gì khác", () => {
    const edit: EditLessonSectionEdit = {
      targetId: "sec-1",
      kind: "text",
      data: { lines: ["a) Mục tiêu: ...", "- bullet 1", "A. phương án A"] },
    };
    expect(editDataToBodyText(edit)).toBe("a) Mục tiêu: ...\n- bullet 1\nA. phương án A");
  });

  it("mảng rỗng ra chuỗi rỗng", () => {
    const edit: EditLessonSectionEdit = { targetId: "sec-1", kind: "text", data: { lines: [] } };
    expect(editDataToBodyText(edit)).toBe("");
  });
});

describe("editDataToBodyText — kind activity", () => {
  it("field 1 dòng: nhãn đậm và nội dung chung 1 dòng", () => {
    const edit: EditLessonSectionEdit = {
      targetId: "sec-1",
      kind: "activity",
      data: { objective: "Hiểu khái niệm X.", content: "Làm bài Y.", product: "Kết quả Z.", organizationText: "GV hướng dẫn." },
    };
    expect(editDataToBodyText(edit)).toBe(
      "**a) Mục tiêu:** Hiểu khái niệm X.\n" +
        "**b) Nội dung:** Làm bài Y.\n" +
        "**c) Sản phẩm:** Kết quả Z.\n" +
        "**d) Tổ chức thực hiện:** GV hướng dẫn.",
    );
  });

  it("field nhiều dòng: nhãn đứng riêng, mỗi dòng sau tách dòng riêng", () => {
    const edit: EditLessonSectionEdit = {
      targetId: "sec-1",
      kind: "activity",
      data: { objective: "", content: "Câu 1\nCâu 2", product: "", organizationText: "" },
    };
    expect(editDataToBodyText(edit)).toBe("**b) Nội dung:**\nCâu 1\nCâu 2");
  });

  it("field rỗng bị bỏ qua hoàn toàn (không để dòng nhãn trơ trọi)", () => {
    const edit: EditLessonSectionEdit = {
      targetId: "sec-1",
      kind: "activity",
      data: { objective: "  ", content: "Nội dung", product: "", organizationText: "" },
    };
    expect(editDataToBodyText(edit)).toBe("**b) Nội dung:** Nội dung");
  });
});

describe("editDataToBodyText — kind subActivity", () => {
  it("dựng đúng bảng 2 cột, 4 bước nối bằng <br> trong ô trái, bước rỗng bị bỏ qua", () => {
    const edit: EditLessonSectionEdit = {
      targetId: "sec-1",
      kind: "subActivity",
      data: {
        objective: "Mục tiêu tiểu hoạt động",
        content: "",
        organization: { transfer: "Giao việc", perform: "Làm việc", report: "", conclude: "Chốt kiến thức" },
        product: "Kết quả HS đạt được",
      },
    };
    expect(editDataToBodyText(edit)).toBe(
      "**Mục tiêu:** Mục tiêu tiểu hoạt động\n" +
        "‖ Hoạt động của GV và HS ‖ Sản phẩm dự kiến ‖\n" +
        "| **Giao nhiệm vụ học tập:** Giao việc<br>**Thực hiện nhiệm vụ:** Làm việc<br>**Kết luận, nhận định:** Chốt kiến thức | Kết quả HS đạt được |",
    );
  });

  it("thiếu objective/content thì bỏ hẳn 2 dòng đó, chỉ còn bảng", () => {
    const edit: EditLessonSectionEdit = {
      targetId: "sec-1",
      kind: "subActivity",
      data: {
        objective: "",
        content: "",
        organization: { transfer: "", perform: "", report: "", conclude: "" },
        product: "",
      },
    };
    expect(editDataToBodyText(edit)).toBe(
      "‖ Hoạt động của GV và HS ‖ Sản phẩm dự kiến ‖\n|  |  |",
    );
  });
});

describe("editDataToBodyText — kind materials", () => {
  it("bảng thiết bị đúng 2 cột + phiếu học tập ngăn cách bằng ---", () => {
    const edit: EditLessonSectionEdit = {
      targetId: "sec-1",
      kind: "materials",
      data: {
        equipment: { columns: ["Dụng cụ", "Số lượng"], rows: [["Máy chiếu", "1 cái"]] },
        worksheets: [{ name: "Phiếu học tập số 1", content: "Câu 1\nCâu 2" }],
      },
    };
    expect(editDataToBodyText(edit)).toBe(
      "‖ Dụng cụ ‖ Số lượng ‖\n" +
        "| Máy chiếu | 1 cái |\n" +
        "---\n" +
        "| **Phiếu học tập số 1**<br>Câu 1<br>Câu 2 |",
    );
  });

  it("không có thiết bị, nhiều phiếu liên tiếp vẫn ngăn cách bằng ---, không có --- thừa ở đầu", () => {
    const edit: EditLessonSectionEdit = {
      targetId: "sec-1",
      kind: "materials",
      data: {
        equipment: { columns: [], rows: [] },
        worksheets: [
          { name: "Phiếu 1", content: "A" },
          { name: "Phiếu 2", content: "B" },
        ],
      },
    };
    expect(editDataToBodyText(edit)).toBe(
      "| **Phiếu 1**<br>A |\n---\n| **Phiếu 2**<br>B |",
    );
  });

  it("escape ký tự | thật trong ô của hàng dữ liệu (delimiter của chính hàng đó)", () => {
    const edit: EditLessonSectionEdit = {
      targetId: "sec-1",
      kind: "materials",
      data: {
        equipment: { columns: ["Tên"], rows: [["A | B"]] },
        worksheets: [],
      },
    };
    expect(editDataToBodyText(edit)).toBe("‖ Tên ‖\n| A \\| B |");
  });

  it("escape ký tự ‖ thật trong ô của hàng tiêu đề (delimiter của chính hàng đó)", () => {
    const edit: EditLessonSectionEdit = {
      targetId: "sec-1",
      kind: "materials",
      data: {
        equipment: { columns: ["Tên ‖ phụ"], rows: [["A"]] },
        worksheets: [],
      },
    };
    expect(editDataToBodyText(edit)).toBe("‖ Tên \\‖ phụ ‖\n| A |");
  });
});
