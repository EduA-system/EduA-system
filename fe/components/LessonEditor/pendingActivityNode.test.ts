import { describe, expect, it } from "vitest";
import type { JSONContent } from "@tiptap/core";
import { resolveDeadPendingActivities } from "./pendingActivityNode";

function doc(...content: JSONContent[]): JSONContent {
  return { type: "doc", content };
}

function pendingActivity(status: "pending" | "failed", overrides: Partial<JSONContent["attrs"]> = {}): JSONContent {
  return {
    type: "pendingActivity",
    attrs: { order: "3", name: "Hoạt động 3: Luyện tập", duration: "15 phút", status, reason: "", ...overrides },
  };
}

describe("resolveDeadPendingActivities", () => {
  it("thay node failed bằng heading + đoạn 'Mời soạn tay.' khi includePending=false", () => {
    const result = resolveDeadPendingActivities(doc(pendingActivity("failed")), false);

    expect(result.content).toEqual([
      { type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "Hoạt động 3: Luyện tập (15 phút)" }] },
      { type: "paragraph", content: [{ type: "text", text: "Mời soạn tay." }] },
    ]);
  });

  it("KHÔNG đụng vào node còn pending khi includePending=false (đang generate thật)", () => {
    const input = doc(pendingActivity("pending"));
    const result = resolveDeadPendingActivities(input, false);

    expect(result.content).toEqual(input.content);
  });

  it("thay CẢ node pending khi includePending=true (mở lại tài liệu đã lưu, không còn stream sống)", () => {
    const result = resolveDeadPendingActivities(doc(pendingActivity("pending")), true);

    expect(result.content?.[0]).toMatchObject({ type: "heading" });
    expect(result.content?.[1]).toMatchObject({ type: "paragraph" });
  });

  it("không đổi node khác pendingActivity", () => {
    const heading = { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "I. MỤC TIÊU" }] };
    const result = resolveDeadPendingActivities(doc(heading), true);

    expect(result.content).toEqual([heading]);
  });

  it("mặc định 'Hoạt động' khi thiếu name, bỏ ngoặc đơn khi thiếu duration", () => {
    const result = resolveDeadPendingActivities(
      doc(pendingActivity("failed", { name: "", duration: "" })),
      false,
    );

    expect(result.content?.[0]).toEqual({
      type: "heading",
      attrs: { level: 3 },
      content: [{ type: "text", text: "Hoạt động" }],
    });
  });

  it("đệ quy vào node con lồng nhau (vd trong section wrapper)", () => {
    const wrapped = { type: "section", content: [pendingActivity("failed")] };
    const result = resolveDeadPendingActivities(doc(wrapped), false);

    expect((result.content?.[0] as JSONContent).content?.[0]).toMatchObject({ type: "heading" });
  });
});
