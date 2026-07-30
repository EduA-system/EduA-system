const helpSections = [
  {
    title: "Soạn giáo án",
    items: [
      "Dùng thanh công cụ để định dạng tiêu đề, font chữ, danh sách và căn lề.",
      "Kéo hai mốc trên ruler để chỉnh lề trái và lề phải của tài liệu.",
      "Dùng EDUA AI để tinh gọn nội dung hoặc tạo thêm câu hỏi kiểm tra.",
    ],
  },
  {
    title: "Tạo slide",
    items: [
      "Mở mục Slide trong sidebar để bắt đầu tạo bộ trình chiếu.",
      "Chọn giáo án nguồn, sau đó kiểm tra từng slide trước khi xuất bản.",
      "Giữ nội dung mỗi slide ngắn, ưu tiên ý chính và hoạt động lớp học.",
    ],
  },
  {
    title: "Tài khoản và hỗ trợ",
    items: [
      "Kiểm tra thông tin hồ sơ ở cuối sidebar.",
      "Nếu nội dung AI chưa đúng, nhập yêu cầu chỉnh sửa cụ thể ở panel bên phải.",
      "Liên hệ nhóm quản trị nếu cần cấp quyền hoặc khôi phục dữ liệu.",
    ],
  },
];

export default function HelpPage() {
  return (
    <main className="min-h-screen bg-white px-6 py-8 text-[#2b2926]">
      <section className="mx-auto max-w-5xl">
        <div className="mb-7">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#d97757]">Trợ giúp</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[0]">Hướng dẫn sử dụng EDUA</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6b625a]">
            Các thao tác chính để giáo viên tạo giáo án, chuyển thành slide và làm việc với trợ lý AI trong hệ thống.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {helpSections.map((section) => (
            <article key={section.title} className="rounded-lg border border-[#e8e2d9] bg-white p-5 shadow-sm">
              <h2 className="text-base font-semibold">{section.title}</h2>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-[#6b625a]">
                {section.items.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="mt-2 size-1.5 shrink-0 rounded-full bg-[#d97757]" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
