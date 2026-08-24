import { currentPageStyles } from "@/lib/lesson-plan-pdf-export";

/**
 * In dashboard thống kê bằng hộp thoại in của trình duyệt thay vì render PDF ở backend.
 *
 * Backend dùng openhtmltopdf và phải tự đăng ký font theo đường dẫn tuyệt đối; trên image
 * Alpine không có font nào khớp nên chữ tiếng Việt rơi về font base-14 của PDF và mất dấu.
 * Trình duyệt thì luôn sẵn font, và biểu đồ Recharts đã là SVG nên in ra đúng như trên màn hình.
 *
 * Cách làm: clone nguyên khối DOM đang hiển thị (kể cả SVG donut/bar/area đã render) sang một
 * iframe ẩn, mượn lại stylesheet của trang, giữ nguyên bề rộng đã đo được rồi thu nhỏ cả khối
 * bằng `zoom` cho vừa khổ A4 ngang. Không render lại chart trong iframe — nếu render lại thì
 * `ResponsiveContainer` sẽ đo lại bề rộng và ra kích thước khác với thứ người dùng đang nhìn.
 */

/** A4 ngang 297mm trừ 2 lề 10mm, quy ra CSS pixel ở 96dpi. */
const PRINTABLE_WIDTH_PX = ((297 - 20) / 25.4) * 96;

/** Gỡ iframe kể cả khi `afterprint` không bắn (một số trình duyệt bỏ qua khi người dùng huỷ). */
const CLEANUP_FALLBACK_MS = 60_000;

/** Bỏ qua phần bên trong <svg>: Recharts vẽ bằng presentation attribute nên clone là đủ. */
const HTML_NODES = ":not(svg):not(svg *)";

export type StatisticsPrintMeta = {
  /** Tên file gợi ý trong hộp thoại in — trình duyệt lấy từ <title>. */
  title: string;
  /** Dòng phụ dưới tiêu đề, vd "Xuất bởi a@b.com lúc 24/08/2026 14:30". */
  byline: string;
};

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

export function printByline(who: string, when: Date = new Date()): string {
  const stamp = `${pad2(when.getDate())}/${pad2(when.getMonth() + 1)}/${when.getFullYear()} ${pad2(when.getHours())}:${pad2(when.getMinutes())}`;
  return `Xuất bởi ${who} lúc ${stamp}`;
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/**
 * Ghim những thuộc tính layout phụ thuộc breakpoint vào inline style của bản sao.
 *
 * Trong iframe in, media query được tính lại theo bề rộng khổ giấy (~1047px) chứ không phải bề
 * rộng cửa sổ, nên `xl:grid-cols-2` sẽ rớt về 1 cột. Trong khi đó SVG của Recharts đã bị đóng
 * băng ở kích thước đo trên màn hình — để lệch thì biểu đồ sẽ hụt so với thẻ chứa nó.
 *
 * Phải chạy trước mọi thao tác thêm/bớt node để hai danh sách còn khớp chỉ số.
 */
function freezeResponsiveLayout(source: HTMLElement, clone: HTMLElement): void {
  const view = source.ownerDocument.defaultView;
  if (!view) return;

  clone.style.padding = view.getComputedStyle(source).padding;

  const sourceNodes = source.querySelectorAll<HTMLElement>(HTML_NODES);
  const cloneNodes = clone.querySelectorAll<HTMLElement>(HTML_NODES);
  sourceNodes.forEach((node, index) => {
    const target = cloneNodes[index];
    if (!target) return;
    const computed = view.getComputedStyle(node);
    if (computed.display === "grid" || computed.display === "inline-grid") {
      target.style.display = computed.display;
      target.style.gridTemplateColumns = computed.gridTemplateColumns;
    }
  });
}

/**
 * Bỏ phần điều khiển chỉ có nghĩa khi tương tác, và thay <select> bằng text tĩnh — giá trị đang
 * chọn của <select> nằm ở DOM property nên `cloneNode` không giữ lại.
 */
function stripInteractiveControls(source: HTMLElement, clone: HTMLElement): void {
  const liveSelects = source.querySelectorAll("select");
  clone.querySelectorAll("select").forEach((select, index) => {
    const selectedLabel = liveSelects[index]?.selectedOptions[0]?.textContent?.trim() ?? "";
    const replacement = clone.ownerDocument.createElement("span");
    replacement.className = select.className;
    replacement.textContent = selectedLabel;
    select.replaceWith(replacement);
  });
  clone.querySelectorAll("[data-print='hide']").forEach((node) => node.remove());
}

function prepareClone(source: HTMLElement): HTMLElement {
  const clone = source.cloneNode(true) as HTMLElement;
  freezeResponsiveLayout(source, clone);
  stripInteractiveControls(source, clone);
  return clone;
}

function whenStylesReady(win: Window): Promise<unknown> {
  const links = Array.from(win.document.querySelectorAll<HTMLLinkElement>("link[rel='stylesheet']"));
  const sheets = links.map((link) =>
    link.sheet
      ? Promise.resolve()
      : new Promise<void>((resolve) => {
          link.addEventListener("load", () => resolve(), { once: true });
          link.addEventListener("error", () => resolve(), { once: true });
        }),
  );
  return Promise.all([...sheets, win.document.fonts?.ready]);
}

function printStyles(scale: number, capturedWidth: number): string {
  return `
@page { size: A4 landscape; margin: 10mm; }
* { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
html, body { margin: 0; padding: 0; background: #fff; }
.print-root { zoom: ${scale}; }
.print-canvas { width: ${capturedWidth}px; margin: 0 auto; }
.print-byline { margin: 10px 0 0; font-size: 13px; color: #6b6b6b; }
/* Tooltip của Recharts là node ẩn nằm sẵn trong DOM — đừng để nó chiếm chỗ khi in. */
.recharts-tooltip-wrapper { display: none !important; }
/* Đừng cắt một thẻ biểu đồ làm đôi giữa hai trang. */
.print-canvas .rounded-lg { break-inside: avoid; page-break-inside: avoid; }
`;
}

/**
 * @param source phần tử đang hiển thị cần in (thường là <section> chứa toàn bộ dashboard).
 * @returns false khi không tạo được iframe in.
 */
export function printStatisticsReport(source: HTMLElement, meta: StatisticsPrintMeta): boolean {
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText = "position:fixed;left:-10000px;top:0;width:1px;height:1px;border:0;opacity:0;pointer-events:none;";
  document.body.append(frame);

  const win = frame.contentWindow;
  if (!win) {
    frame.remove();
    return false;
  }

  let removed = false;
  const removeFrame = () => {
    if (removed) return;
    removed = true;
    frame.remove();
  };
  win.addEventListener("afterprint", removeFrame, { once: true });
  window.setTimeout(removeFrame, CLEANUP_FALLBACK_MS);

  const capturedWidth = Math.round(source.getBoundingClientRect().width) || Math.round(PRINTABLE_WIDTH_PX);
  const scale = Math.min(1, PRINTABLE_WIDTH_PX / capturedWidth);
  const clone = prepareClone(source);

  win.document.open();
  win.document.write(
    `<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>${escapeHtml(meta.title)}</title>` +
      `${currentPageStyles()}<style>${printStyles(scale, capturedWidth)}</style></head>` +
      `<body><div class="print-root"><div class="print-canvas"></div></div></body></html>`,
  );
  win.document.close();

  const imported = win.document.importNode(clone, true) as HTMLElement;
  // Đặt dòng "xuất bởi / lúc" ngay dưới header của bản sao để nó thừa hưởng padding của section.
  const byline = win.document.createElement("p");
  byline.className = "print-byline";
  byline.textContent = meta.byline;
  const header = imported.querySelector("header");
  if (header) header.after(byline);
  else imported.prepend(byline);
  win.document.querySelector(".print-canvas")?.append(imported);

  void whenStylesReady(win).then(() => {
    // Cho trình duyệt một nhịp layout sau khi stylesheet áp vào trước khi chụp trang in.
    win.setTimeout(() => {
      win.focus();
      win.print();
    }, 150);
  });

  return true;
}
