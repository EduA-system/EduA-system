// Hồ sơ read-only của người khác (Moderator xem Teacher cùng môn hoặc Student trong lớp mình quản lý,
// Teacher xem Student trong lớp mình dạy,
// Principal xem Moderator/IT Staff) — học sinh không được xem hồ sơ người khác. Khác `saveProfile`/
// `/api/users/me` vốn chỉ sửa hồ sơ của chính mình.
export type UserProfileView = {
  id: string;
  fullName: string | null;
  avatarUrl: string | null;
  email: string;
  bio: string | null;
  role: string;
  subject: string | null;
  grades: number[];
  status: string;
  grantedAt: string | null;
  grantedByName: string | null;
};

type AuthFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export async function getUserProfileView(authFetch: AuthFetch, id: string): Promise<UserProfileView> {
  const res = await authFetch(`/api/users/${id}/profile`);
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error((data as { message?: string } | null)?.message ?? res.statusText);
  }
  return data as UserProfileView;
}
