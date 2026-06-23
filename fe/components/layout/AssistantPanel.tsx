import { DashboardIcon } from "../ui/DashboardIcon";

const assistantChips = [
  { label: "Tinh gọn", icon: "chipTighten" },
  { label: "Hoạt động nhóm", icon: "chipGroup" },
  { label: "Tăng độ khó", icon: "chipHarder" },
  { label: "Tạo câu hỏi", icon: "chipQuestion" },
];

export function AssistantPanel() {
  return (
    <aside className="hidden h-screen w-[320px] shrink-0 overflow-y-auto border-l border-[#d9d9d9] bg-white xl:flex xl:flex-col">
      <div className="flex-1 px-5 py-4">
        <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.04em] text-[#6b6b6b]">
          <span className="flex size-4 items-center justify-center rounded-[5px] border border-[#ff9571]/25 bg-[#fff0ea] text-[#e8724a]">
            <DashboardIcon name="aiBadge" className="size-[9px]" />
          </span>
          EDUA AI
        </div>
        <div className="mt-2 w-[251px] rounded-bl-[14px] rounded-br-[14px] rounded-tl rounded-tr-[14px] border border-[#d8d1c9] bg-[#faf7f4] px-3.5 py-3 text-[13px] leading-[21px] text-[#171717]">
          Giáo án đã được tạo xong. Bạn có muốn tôi điều chỉnh phần nào không? Tôi có thể
          tinh gọn nội dung, bổ sung hoạt động nhóm hoặc tạo câu hỏi kiểm tra.
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5 px-5 py-2">
        {assistantChips.map((chip) => (
          <button key={chip.label} className="flex items-center gap-1.5 rounded-full border border-[#ff9571] bg-[#fff0ea] px-3 py-1.5 text-[11px] font-medium text-[#ff9571]">
            <DashboardIcon name={chip.icon} className="size-2.5" />
            {chip.label}
          </button>
        ))}
      </div>
      <div className="px-5 pb-5 pt-3">
        <div className="flex items-center gap-2 rounded-[12px] border border-[#d8d1c9] bg-[#faf7f4] px-[15px] py-[11px]">
          <span className="flex-1 text-[13px] text-[#171717]/50">Nhập yêu cầu chỉnh sửa...</span>
          <button className="flex size-7 items-center justify-center rounded-lg bg-[#d8d1c9] text-white" aria-label="Gửi yêu cầu">
            <DashboardIcon name="send" />
          </button>
        </div>
        <p className="mt-2 text-center text-[10px] leading-[15px] text-[#6b6b6b]">
          AI sẽ chỉnh sửa trực tiếp trên giáo án của bạn
        </p>
      </div>
    </aside>
  );
}
