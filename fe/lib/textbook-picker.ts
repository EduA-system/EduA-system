"use client";

import { useEffect, useMemo, useState } from "react";
import {
  fetchChapterLessons,
  fetchTextbookChapters,
  fetchTextbookNames,
  type CatalogBookName,
  type CatalogChapterSummary,
  type CatalogLesson,
} from "@/services/lessonPlanService";

/**
 * Chọn Chương → Bài (BR-53) scoped theo (subject, khối) đã biết trước — dùng cho form giao lịch tuần
 * (`/weekly-schedule`) và filter màn duyệt (`/lesson-plan-approval`). Tự resolve sách giáo khoa đúng khối
 * (thường chỉ có 1 cuốn/khối/môn; nếu nhiều tập thì lộ thêm dropdown chọn sách).
 */
export function useTextbookPicker(subject: string | undefined, grade: number | null, enabled: boolean) {
  const [books, setBooks] = useState<CatalogBookName[]>([]);
  const [selectedBookCode, setSelectedBookCode] = useState("");
  const [chapters, setChapters] = useState<CatalogChapterSummary[]>([]);
  const [chapterCode, setChapterCode] = useState("");
  const [lessons, setLessons] = useState<CatalogLesson[]>([]);
  const [lessonCode, setLessonCode] = useState("");

  useEffect(() => {
    if (!enabled || !subject) return;
    fetchTextbookNames(subject).then(setBooks).catch(() => setBooks([]));
  }, [subject, enabled]);

  const matchingBooks = useMemo(() => books.filter((b) => b.grade === grade), [books, grade]);
  // Tự chọn nếu chỉ đúng 1 sách khớp khối (trường hợp phổ biến); nhiều sách thì chờ setBookCode.
  // Tính trực tiếp lúc render (không setState trong effect) để tránh cascading render.
  const bookCode = selectedBookCode || (matchingBooks.length === 1 ? matchingBooks[0].id : "");

  useEffect(() => {
    if (!enabled || !bookCode) return;
    fetchTextbookChapters(bookCode).then(setChapters).catch(() => setChapters([]));
  }, [enabled, bookCode]);

  useEffect(() => {
    if (!enabled || !bookCode || !chapterCode) return;
    fetchChapterLessons(bookCode, chapterCode).then(setLessons).catch(() => setLessons([]));
  }, [enabled, bookCode, chapterCode]);

  // Không setState([]) trong effect khi bookCode/chapterCode bị xóa — chỉ ẩn kết quả cũ lúc render;
  // dropdown tương ứng cũng đang `disabled` nên không chọn nhầm được dữ liệu cũ.
  const effectiveChapters = bookCode ? chapters : [];
  const effectiveLessons = bookCode && chapterCode ? lessons : [];

  function reset() {
    setSelectedBookCode("");
    setChapterCode("");
    setLessonCode("");
    setChapters([]);
    setLessons([]);
  }

  function selectChapter(code: string) {
    setChapterCode(code);
    setLessonCode("");
  }

  return {
    matchingBooks,
    bookCode,
    setBookCode: setSelectedBookCode,
    chapters: effectiveChapters,
    chapterCode,
    setChapterCode: selectChapter,
    lessons: effectiveLessons,
    lessonCode,
    setLessonCode,
    reset,
  };
}
