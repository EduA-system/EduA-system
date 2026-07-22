import type { OutlinePart, SlideItem } from "@/lib/api/slides";
import type { ContentBlock } from "@/lib/slide-layout/types";

function quizAnswerText(block: Extract<ContentBlock, { kind: "quiz" }>): string | null {
  const lines = [
    block.answer?.trim() ? `Đáp án: ${block.answer.trim()}` : "",
    block.explanation?.trim() ? `Giải thích: ${block.explanation.trim()}` : "",
  ].filter(Boolean);
  return lines.length ? lines.join("\n\n") : null;
}

function uniqueId(base: string, usedIds: Set<string>): string {
  let candidate = base;
  let suffix = 2;
  while (usedIds.has(candidate)) candidate = `${base}-${suffix++}`;
  usedIds.add(candidate);
  return candidate;
}

function splitQuizAnswerSlide(slide: SlideItem, usedIds: Set<string>): SlideItem[] {
  const answerTexts: string[] = [];
  const questionBlocks = slide.contentPlan.blocks.map((block) => {
    if (block.kind !== "quiz") return block;
    const answer = quizAnswerText(block);
    if (answer) answerTexts.push(answer);
    return { ...block, answer: undefined, explanation: undefined };
  });

  if (!answerTexts.length) return [slide];

  const questionSlide: SlideItem = {
    ...slide,
    contentPlan: { ...slide.contentPlan, blocks: questionBlocks },
  };
  const answerSlide: SlideItem = {
    id: uniqueId(`${slide.id}-answer`, usedIds),
    title: `Đáp án: ${slide.title}`,
    pedagogicalRole: "recap",
    contentPlan: {
      slideType: "summary",
      headerMode: "fixed",
      blocks: [{
        id: `${slide.id}-answer-text`,
        kind: "text",
        role: "body",
        semanticType: "takeaway",
        priority: "primary",
        required: true,
        text: answerTexts.join("\n\n"),
      }],
      relationships: [],
    },
  };
  return [questionSlide, answerSlide];
}

export function slidesWithQuizAnswerReveals(parts: OutlinePart[]): SlideItem[] {
  const usedIds = new Set(parts.flatMap((part) => part.slides.map((slide) => slide.id)));
  return parts.flatMap((part) => part.slides.flatMap((slide) => splitQuizAnswerSlide(slide, usedIds)));
}
