import type { AuthUser } from "./client";

export type SubjectCode = "MATH" | "CHEMISTRY" | "PHYSICS";
export type SubjectAccessUser = {
  role?: string | null;
  roles?: string[] | null;
  subject?: string | null;
};

export const SUBJECT_CODES: SubjectCode[] = ["MATH", "CHEMISTRY", "PHYSICS"];

export const SUBJECT_LABELS: Record<SubjectCode, string> = {
  MATH: "To\u00e1n",
  CHEMISTRY: "H\u00f3a h\u1ecdc",
  PHYSICS: "V\u1eadt l\u00fd",
};

export function isSubjectCode(value: string | null | undefined): value is SubjectCode {
  return SUBJECT_CODES.includes(value as SubjectCode);
}

export function getUserRoles(user: SubjectAccessUser | null | undefined): string[] {
  if (!user) return [];
  return user.roles?.length ? user.roles : user.role ? [user.role] : [];
}

export function isSubjectBoundEducator(user: SubjectAccessUser | null | undefined): boolean {
  const roles = getUserRoles(user);
  return roles.includes("TEACHER") || roles.includes("MODERATOR");
}

export function getAssignedSubject(user: SubjectAccessUser | Pick<AuthUser, "subject"> | null | undefined): SubjectCode | null {
  return isSubjectCode(user?.subject) ? user.subject : null;
}

export function getSubjectRestriction(
  user: SubjectAccessUser | null | undefined,
): SubjectCode | null {
  if (!isSubjectBoundEducator(user)) return null;
  return getAssignedSubject(user);
}

/**
 * Educator bị ràng buộc môn nhưng chưa được gán môn nào.
 *
 * <p>Tách riêng khỏi {@link getSubjectRestriction} vì hai hàm trả về "không ràng buộc" ở hai
 * nghĩa khác nhau: `getSubjectRestriction` trả null cho cả Principal/IT Staff (thật sự không
 * ràng buộc) lẫn Teacher thiếu môn (ràng buộc nhưng không biết môn nào). Nếu để UI chỉ dựa vào
 * `getSubjectRestriction` thì nhóm sau sẽ thấy dropdown mở đầy đủ trong khi `canUseSubject` chặn
 * mọi lựa chọn — nút submit disabled mà không có lý do. Dùng hàm này để chặn sớm và nói rõ.</p>
 */
export function isSubjectUnassigned(user: SubjectAccessUser | null | undefined): boolean {
  return isSubjectBoundEducator(user) && getAssignedSubject(user) === null;
}

export function canUseSubject(
  user: SubjectAccessUser | null | undefined,
  subject: string | null | undefined,
): boolean {
  if (!isSubjectBoundEducator(user)) return true;
  const assignedSubject = getAssignedSubject(user);
  return Boolean(assignedSubject && subject === assignedSubject);
}

export function canAccessSubjectScope(
  user: SubjectAccessUser | null | undefined,
  allowedSubjects?: readonly SubjectCode[],
): boolean {
  if (!allowedSubjects?.length) return true;
  if (!isSubjectBoundEducator(user)) return true;
  const assignedSubject = getAssignedSubject(user);
  return Boolean(assignedSubject && allowedSubjects.includes(assignedSubject));
}

export function subjectOptionsForUser<T extends { value: string }>(
  user: SubjectAccessUser | null | undefined,
  options: readonly T[],
): T[] {
  const restriction = getSubjectRestriction(user);
  return restriction ? options.filter((option) => option.value === restriction) : [...options];
}
