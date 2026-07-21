import { describe, expect, it } from "vitest";
import type { OutlinePart } from "@/lib/api/slides";
import { slidesWithQuizAnswerReveals } from "@/lib/slide-create/quiz-answer-slides";

describe("quiz answer reveal slides", () => {
  it("moves quiz answers to the following reveal slide", () => {
    const parts: OutlinePart[] = [{
      id: "p1",
      title: "Luyen tap",
      slides: [{
        id: "s1",
        title: "Cau hoi",
        pedagogicalRole: "practice",
        contentPlan: {
          slideType: "quiz",
          headerMode: "fixed",
          blocks: [{
            id: "q1",
            kind: "quiz",
            role: "body",
            semanticType: "quiz",
            priority: "primary",
            required: true,
            question: "Chon dap an dung",
            choices: ["A", "B", "C", "D"],
            answer: "C",
            explanation: "Tan so bang tan so luc cuong buc.",
          }],
          relationships: [],
        },
      }],
    }];

    const slides = slidesWithQuizAnswerReveals(parts);

    expect(slides.map((slide) => slide.id)).toEqual(["s1", "s1-answer"]);
    expect(slides[0].contentPlan.blocks[0]).toMatchObject({ kind: "quiz", question: "Chon dap an dung" });
    expect(slides[0].contentPlan.blocks[0]).not.toHaveProperty("answer", "C");
    expect(slides[1]).toMatchObject({ title: "Đáp án: Cau hoi", pedagogicalRole: "recap" });
    expect(slides[1].contentPlan.blocks[0]).toMatchObject({
      kind: "text",
      text: "Đáp án: C\n\nGiải thích: Tan so bang tan so luc cuong buc.",
    });
  });
});
