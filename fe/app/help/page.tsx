"use client";

import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Bell,
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  FilePenLine,
  Library,
  MessageCircleQuestion,
  Presentation,
  ScrollText,
  Settings2,
  ShieldCheck,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { useAuth } from "@/lib/auth/AuthContext";

type HelpRole = "TEACHER" | "MODERATOR" | "PRINCIPAL" | "IT_STAFF" | "STUDENT" | "GUEST";

type HelpAction = {
  title: string;
  description: string;
  href: string;
  action: string;
  icon: LucideIcon;
};

type HelpGuide = {
  label: string;
  summary: string;
  actions: HelpAction[];
  tips: string[];
};

const helpGuides: Record<HelpRole, HelpGuide> = {
  TEACHER: {
    label: "Giáo viên",
    summary: "Soạn học liệu, giao việc cho lớp và theo dõi các mốc cần nộp.",
    actions: [
      { title: "Soạn giáo án", description: "Chọn môn học, nội dung và hoàn thiện giáo án với AI.", href: "/lesson-create", action: "Tạo giáo án", icon: FilePenLine },
      { title: "Tạo slide", description: "Chuyển giáo án thành bộ trình chiếu, rồi rà soát từng slide.", href: "/slide-create", action: "Tạo slide", icon: Presentation },
      { title: "Tạo đề kiểm tra", description: "Lập đề, cấu hình câu hỏi và lưu vào thư viện cá nhân.", href: "/exam-create-new", action: "Tạo đề", icon: ClipboardCheck },
      { title: "Theo dõi lịch nộp", description: "Xem giáo án được giao và tiến độ nộp theo tuần.", href: "/weekly-schedule", action: "Mở lịch nộp", icon: CalendarDays },
    ],
    tips: ["Lưu học liệu vào Thư viện trước khi dùng cho lớp.", "Kiểm tra lại mục tiêu, nội dung và đáp án AI tạo trước khi sử dụng.", "Mở Lịch nộp giáo án đầu tuần để không bỏ sót yêu cầu của người kiểm duyệt."],
  },
  MODERATOR: {
    label: "Người kiểm duyệt",
    summary: "Điều phối giáo án theo tuần, kiểm duyệt nội dung cộng đồng và hỗ trợ giáo viên cùng môn.",
    actions: [
      { title: "Duyệt giáo án tuần", description: "Rà soát bài giáo án đã nộp và ghi nhận kết quả duyệt.", href: "/lesson-plan-approval", action: "Mở hàng chờ", icon: ClipboardCheck },
      { title: "Kiểm duyệt Community Hub", description: "Duyệt hoặc từ chối nội dung được gửi từ thư viện giáo viên.", href: "/hub-moderation", action: "Mở Hub", icon: ShieldCheck },
      { title: "Quản lý giáo viên", description: "Cấp, cập nhật hoặc theo dõi các tài khoản giáo viên trong phạm vi phụ trách.", href: "/user-management", action: "Mở tài khoản", icon: Users },
      { title: "Xem thống kê", description: "Theo dõi tiến độ nhiệm vụ và hoạt động kiểm duyệt của môn học.", href: "/statistics", action: "Mở thống kê", icon: BarChart3 },
    ],
    tips: ["Ưu tiên xử lý các bài sắp hoặc đã quá hạn trước.", "Khi từ chối, nêu rõ phần giáo viên cần chỉnh để lần nộp sau có thể xử lý nhanh.", "Chỉ duyệt nội dung Community Hub đã phù hợp để chia sẻ công khai."],
  },
  PRINCIPAL: {
    label: "Hiệu trưởng",
    summary: "Theo dõi vận hành, kiểm soát tài khoản và xem tổng quan hoạt động học liệu của nhà trường.",
    actions: [
      { title: "Theo dõi thống kê", description: "Xem xu hướng tạo học liệu, tiến độ nhiệm vụ và kết quả kiểm duyệt.", href: "/statistics", action: "Mở thống kê", icon: BarChart3 },
      { title: "Quản lý tài khoản", description: "Quản lý tài khoản và vai trò trong phạm vi quản trị của nhà trường.", href: "/user-management", action: "Mở tài khoản", icon: Users },
      { title: "Xem Community Hub", description: "Theo dõi các học liệu đã được cộng đồng chia sẻ.", href: "/community-hub", action: "Mở Community Hub", icon: Library },
    ],
    tips: ["Dùng thống kê để phát hiện môn học hoặc tuần có tiến độ thấp.", "Kiểm tra vai trò trước khi cấp hoặc thay đổi quyền tài khoản.", "Community Hub chỉ hiển thị nội dung đã được duyệt."],
  },
  IT_STAFF: {
    label: "Nhân viên IT",
    summary: "Cấu hình trợ lý AI, theo dõi nhật ký vận hành và hỗ trợ hệ thống hoạt động ổn định.",
    actions: [
      { title: "Cấu hình AI", description: "Cập nhật system prompt cho từng quy trình AI của hệ thống.", href: "/it-staff", action: "Mở cấu hình AI", icon: Settings2 },
      { title: "Xem nhật ký hoạt động", description: "Tra cứu các thay đổi quan trọng và lịch sử thao tác quản trị.", href: "/it-staff/activity-log", action: "Mở nhật ký", icon: ScrollText },
      { title: "Kiểm tra Community Hub", description: "Xem trải nghiệm nội dung công khai mà người dùng được phép truy cập.", href: "/community-hub", action: "Mở Community Hub", icon: Library },
    ],
    tips: ["Chỉ thay đổi prompt của đúng quy trình cần điều chỉnh.", "Dùng nhật ký để đối chiếu thời điểm và người thực hiện thay đổi.", "Không cấp hoặc thay đổi quyền nghiệp vụ từ khu vực cấu hình AI."],
  },
  STUDENT: {
    label: "Học sinh",
    summary: "Theo dõi lớp học, nhận thông báo và sử dụng các học liệu giáo viên đã chia sẻ.",
    actions: [
      { title: "Mở lớp học", description: "Xem các lớp đã tham gia và học liệu được giáo viên cung cấp.", href: "/list-class", action: "Mở lớp học", icon: BookOpen },
      { title: "Xem thông báo", description: "Theo dõi thông tin mới từ lớp học và hệ thống.", href: "/notifications", action: "Mở thông báo", icon: Bell },
    ],
    tips: ["Kiểm tra thông báo sau khi giáo viên cập nhật lớp.", "Mở học liệu từ lớp học để bảo đảm bạn có đúng quyền truy cập.", "Theo dõi các tài liệu và bài tập mà giáo viên chia sẻ trong từng lớp."],
  },
  GUEST: {
    label: "khách truy cập",
    summary: "Đăng nhập để nhận hướng dẫn theo vai trò và truy cập đầy đủ không gian làm việc.",
    actions: [
      { title: "Đăng nhập", description: "Đăng nhập bằng tài khoản đã được nhà trường cấp quyền.", href: "/login?next=%2Fhelp", action: "Đăng nhập", icon: ShieldCheck },
      { title: "Khám phá Community Hub", description: "Xem các nội dung cộng đồng đã được phê duyệt.", href: "/community-hub", action: "Mở Community Hub", icon: Library },
    ],
    tips: ["Liên hệ nhà trường nếu tài khoản chưa được cấp quyền.", "Sau khi đăng nhập, trang này sẽ hiển thị các thao tác phù hợp với vai trò của bạn.", "Không chia sẻ thông tin đăng nhập với người khác."],
  },
};

function resolveRole(role: string | null | undefined): HelpRole {
  return role === "TEACHER" || role === "MODERATOR" || role === "PRINCIPAL" || role === "IT_STAFF" || role === "STUDENT" ? role : "GUEST";
}

export default function HelpPage() {
  const { user } = useAuth();
  const role = resolveRole(user?.role);
  const guide = helpGuides[role];

  return (
    <main className="min-h-screen bg-[#fbfaf8] text-[#2b2926]">
      <div className="flex min-h-screen">
        <Sidebar activeHref="/help" />
        <section className="min-w-0 flex-1 px-5 pb-10 pt-16 sm:px-8 sm:pt-8 lg:px-10">
          <div className="mx-auto max-w-6xl">
            <header className="border-b border-[#e7e1da] pb-7">
              <div className="flex flex-wrap items-start justify-between gap-5">
                <div className="max-w-2xl">
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#df704b]">Trợ giúp</p>
                  <h1 className="mt-2 text-3xl font-bold text-[#30343d]">Hướng dẫn dành cho {guide.label}</h1>
                  <p className="mt-3 text-sm leading-6 text-stone-600">{guide.summary}</p>
                </div>
                <div className="flex items-center gap-2 rounded-lg border border-[#e7e1da] bg-white px-3 py-2 text-sm font-semibold text-[#4a4640] shadow-sm">
                  {guide.label}
                </div>
              </div>
            </header>

            <section className="py-7" aria-labelledby="help-actions-heading">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-stone-500">Lối tắt công việc</p>
                  <h2 id="help-actions-heading" className="mt-1 text-xl font-bold text-[#30343d]">Bắt đầu từ việc bạn cần làm</h2>
                </div>
              </div>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {guide.actions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <article key={action.href} className="flex min-h-40 flex-col border border-[#e7e1da] bg-white p-5 shadow-sm transition hover:border-[#d9b9aa] hover:shadow-md">
                      <div className="flex items-start gap-3">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#fdf0ea] text-[#cc5e3d]"><Icon aria-hidden className="size-5" /></span>
                        <div className="min-w-0">
                          <h3 className="font-bold text-[#30343d]">{action.title}</h3>
                          <p className="mt-1 text-sm leading-5 text-stone-600">{action.description}</p>
                        </div>
                      </div>
                      <Link href={action.href} className="mt-auto inline-flex w-fit items-center gap-1.5 pt-5 text-sm font-bold text-[#b95133] hover:text-[#8e3d25] hover:underline">
                        {action.action}<ArrowRight aria-hidden className="size-4" />
                      </Link>
                    </article>
                  );
                })}
              </div>
            </section>

            <section className="grid gap-6 border-t border-[#e7e1da] py-7 lg:grid-cols-[1.45fr_0.85fr]" aria-labelledby="help-tips-heading">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-stone-500">Thao tác hiệu quả</p>
                <h2 id="help-tips-heading" className="mt-1 text-xl font-bold text-[#30343d]">Các lưu ý cho {guide.label}</h2>
                <ol className="mt-5 space-y-4">
                  {guide.tips.map((tip, index) => (
                    <li key={tip} className="flex gap-3 text-sm leading-6 text-stone-700">
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#30343d] text-xs font-bold text-white">{index + 1}</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ol>
              </div>
              <aside className="border-l border-[#e7e1da] pl-0 lg:pl-6">
                <div className="flex size-10 items-center justify-center rounded-lg bg-[#eef5f5] text-[#397274]"><MessageCircleQuestion aria-hidden className="size-5" /></div>
                <h2 className="mt-4 text-lg font-bold text-[#30343d]">Cần hỗ trợ thêm?</h2>
                <p className="mt-2 text-sm leading-6 text-stone-600">Kiểm tra thông báo hệ thống trước. Với lỗi quyền truy cập hoặc dữ liệu, liên hệ người phụ trách tại trường.</p>
                {role !== "GUEST" && <Link href="/notifications" className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-[#397274] hover:text-[#285557] hover:underline">Mở thông báo<ArrowRight aria-hidden className="size-4" /></Link>}
              </aside>
            </section>

            {role === "TEACHER" || role === "MODERATOR" ? (
              <section className="border-t border-[#e7e1da] pt-7" aria-label="Gợi ý sử dụng AI">
                <div className="flex items-start gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#eef5f5] text-[#397274]"><Wrench aria-hidden className="size-5" /></span>
                  <div>
                    <h2 className="font-bold text-[#30343d]">Khi làm việc với EDUA AI</h2>
                    <p className="mt-1 text-sm leading-6 text-stone-600">Nêu rõ lớp, môn, mục tiêu và yêu cầu đầu ra. Luôn rà soát nội dung trước khi lưu, giao cho lớp hoặc gửi kiểm duyệt.</p>
                  </div>
                </div>
              </section>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
