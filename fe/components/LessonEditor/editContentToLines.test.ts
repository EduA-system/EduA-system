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
  it("field 1 câu: nhãn đậm và nội dung chung 1 dòng", () => {
    const edit: EditLessonSectionEdit = {
      targetId: "sec-1",
      kind: "activity",
      data: { objective: ["Hiểu khái niệm X."], content: ["Làm bài Y."], product: ["Kết quả Z."], organizationText: ["GV hướng dẫn."] },
    };
    expect(editDataToBodyText(edit)).toBe(
      "**a) Mục tiêu:** Hiểu khái niệm X.\n" +
        "**b) Nội dung:** Làm bài Y.\n" +
        "**c) Sản phẩm:** Kết quả Z.\n" +
        "**d) Tổ chức thực hiện:** GV hướng dẫn.",
    );
  });

  it("field nhiều câu (mảng nhiều phần tử): nhãn đứng riêng, mỗi câu tách dòng riêng", () => {
    const edit: EditLessonSectionEdit = {
      targetId: "sec-1",
      kind: "activity",
      data: { objective: [], content: ["Câu 1", "Câu 2"], product: [], organizationText: [] },
    };
    expect(editDataToBodyText(edit)).toBe("**b) Nội dung:**\nCâu 1\nCâu 2");
  });

  it("field rỗng bị bỏ qua hoàn toàn (không để dòng nhãn trơ trọi)", () => {
    const edit: EditLessonSectionEdit = {
      targetId: "sec-1",
      kind: "activity",
      data: { objective: ["  "], content: ["Nội dung"], product: [], organizationText: [] },
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
        objective: ["Mục tiêu tiểu hoạt động"],
        content: [],
        organization: { transfer: ["Giao việc"], perform: ["Làm việc"], report: [], conclude: ["Chốt kiến thức"] },
        product: ["Kết quả HS đạt được"],
      },
    };
    expect(editDataToBodyText(edit)).toBe(
      "**Mục tiêu:** Mục tiêu tiểu hoạt động\n" +
        "‖ Hoạt động của GV và HS ‖ Sản phẩm dự kiến ‖\n" +
        "| **Giao nhiệm vụ học tập:** Giao việc<br>**Thực hiện nhiệm vụ:** Làm việc<br>**Kết luận, nhận định:** Chốt kiến thức | Kết quả HS đạt được |",
    );
  });

  it("bước có nhiều câu (mảng nhiều phần tử) nối bằng khoảng trắng trong cùng một bước", () => {
    const edit: EditLessonSectionEdit = {
      targetId: "sec-1",
      kind: "subActivity",
      data: {
        objective: [],
        content: [],
        organization: { transfer: ["Câu 1.", "Câu 2."], perform: [], report: [], conclude: [] },
        product: [],
      },
    };
    expect(editDataToBodyText(edit)).toBe(
      "‖ Hoạt động của GV và HS ‖ Sản phẩm dự kiến ‖\n" +
        "| **Giao nhiệm vụ học tập:** Câu 1. Câu 2. |  |",
    );
  });

  it("thiếu objective/content thì bỏ hẳn 2 dòng đó, chỉ còn bảng", () => {
    const edit: EditLessonSectionEdit = {
      targetId: "sec-1",
      kind: "subActivity",
      data: {
        objective: [],
        content: [],
        organization: { transfer: [], perform: [], report: [], conclude: [] },
        product: [],
      },
    };
    expect(editDataToBodyText(edit)).toBe(
      "‖ Hoạt động của GV và HS ‖ Sản phẩm dự kiến ‖\n|  |  |",
    );
  });

  /**
   * Tái hiện lỗi thật gặp trên live ("Hoạt động 2: Phương trình tham số của đường thẳng"): dù
   * prompt yêu cầu "mỗi phần tử mảng là MỘT dòng, KHÔNG dùng \n", AI vẫn nhét một "\n" THẬT nằm
   * lẫn TRONG một phần tử `product` (gộp câu dẫn + công thức khối thành 1 chuỗi có xuống dòng).
   * Trước khi sửa, `\n` nhúng đó phá đôi dòng bảng thành 2 dòng vật lý — hàng bảng không còn
   * bắt đầu/kết thúc bằng "|" trên CÙNG một dòng, rơi về hiển thị text thô (thấy cả "|"/"<br>"
   * là ký tự sống thay vì bảng thật). `normalizeLines` giờ tách "\n" nhúng trong từng phần tử
   * trước khi build hàng, nên kết quả vẫn PHẢI là đúng MỘT dòng vật lý duy nhất.
   */
  it("tự tách \\n nhúng bên trong một phần tử mảng — không để vỡ hàng bảng thành nhiều dòng", () => {
    const edit: EditLessonSectionEdit = {
      targetId: "sec-1",
      kind: "subActivity",
      data: {
        objective: [],
        content: [],
        organization: { transfer: [], perform: [], report: [], conclude: [] },
        product: [
          "1. Phương trình tham số của đường thẳng là:\n\\[\\begin{cases}x = 1 + 2t\\end{cases}\\]",
          "2. Phương trình tham số của đường thẳng Δ là:\n$$\\begin{cases}x = t\\end{cases}$$ (với t ∈ R).",
        ],
      },
    };
    const result = editDataToBodyText(edit);
    const rows = result.split("\n");
    const dataRow = rows.find((line) => line.startsWith("|"));
    expect(dataRow).toBeDefined();
    // Toàn bộ nội dung product phải nằm gọn trên CÙNG một dòng vật lý (kết thúc bằng "|"), không
    // bị "\n" nhúng cắt thành 2+ dòng.
    expect(dataRow!.endsWith("|")).toBe(true);
    expect(dataRow).toContain(
      "1. Phương trình tham số của đường thẳng là:<br>\\[\\begin{cases}x = 1 + 2t\\end{cases}\\]" +
        "<br>2. Phương trình tham số của đường thẳng Δ là:<br>$$\\begin{cases}x = t\\end{cases}$$ (với t ∈ R).",
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
