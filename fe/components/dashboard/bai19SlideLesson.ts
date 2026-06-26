import type { InlineLessonPlan } from "@/lib/api/slides";

/** Giáo án CV 5512 — Bài 19. Tốc độ phản ứng (Tiết 2), KNTT. Nguồn: file Word Anh Đăng Vũ Hòa. */
export const BAI19_LESSON_ID = "bai-19-toc-do-phan-ung";

export const bai19LessonCard = {
  id: BAI19_LESSON_ID,
  title: "Bài 19. Tốc độ phản ứng (Tiết 2)",
  description:
    "Các yếu tố ảnh hưởng tới tốc độ phản ứng: áp suất, nhiệt độ, diện tích bề mặt, chất xúc tác; hệ số nhiệt độ Van't Hoff.",
  subject: "Hóa học" as const,
  grade: "Lớp 10",
  icon: "chemistry" as const,
  updatedAt: "26 thg 6, 2026",
  objectives: [
    "Thực hiện một số thí nghiệm và giải thích được các yếu tố ảnh hưởng tới tốc độ phản ứng (áp suất, nhiệt độ, chất xúc tác, diện tích bề mặt)",
    "Nêu được ý nghĩa của hệ số nhiệt độ Van't Hoff",
    "Vận dụng được kiến thức tốc độ phản ứng hóa học vào việc giải thích một số vấn đề trong cuộc sống và sản xuất",
  ],
};

export const bai19InlinePlan: InlineLessonPlan = {
  lessonTitle: "Bài 19. Tốc độ phản ứng (Tiết 2)",
  gradeLevel: 10,
  totalDurationMinutes: 45,
  objectives: [
    "Thực hiện một số thí nghiệm và giải thích được các yếu tố ảnh hưởng tới tốc độ phản ứng (áp suất, nhiệt độ, chất xúc tác, diện tích bề mặt)",
    "Nêu được ý nghĩa của hệ số nhiệt độ Van't Hoff",
    "Vận dụng được kiến thức tốc độ phản ứng hóa học vào việc giải thích một số vấn đề trong cuộc sống và sản xuất",
    "Năng lực tự chủ và tự học: tìm kiếm thông tin trong SGK, quan sát hình ảnh, thí nghiệm để rút ra nhận xét",
    "Năng lực giao tiếp và hợp tác: làm việc nhóm tìm hiểu các yếu tố ảnh hưởng đến tốc độ phản ứng",
    "Phẩm chất: chăm chỉ, tự tìm tòi thông tin trong SGK, tích cực quan sát video và làm thí nghiệm",
  ],
  teachingMethods: [
    "Thí nghiệm",
    "Thảo luận nhóm",
    "Trò chơi Hỏi nhanh – Đáp nhanh",
    "Phiếu học tập",
    "Trắc nghiệm ABCD",
  ],
  activities: [
    {
      id: "a1",
      name: "Khởi động",
      durationMinutes: 5,
      goal: "Tạo nhu cầu tìm hiểu kiến thức mới; ôn khái niệm tốc độ phản ứng và ảnh hưởng của nồng độ",
      teacherActions: `<p>GV tổ chức trò chơi "Hỏi nhanh – Đáp nhanh":</p>
<ul>
<li>Câu 1: Trong các phản ứng (đốt cháy than, sắt bị gỉ, trung hòa acid–base, tinh bột lên men rượu, lên men sữa chua), phản ứng nào nhanh, phản ứng nào chậm?</li>
<li>Câu 2: Điền chỗ trống: "... được xác định bằng sự biến thiên lượng chất đầu hoặc chất sản phẩm trong một đơn vị thời gian"</li>
<li>Câu 3: Tại sao khi mở van bình ga nhiều thì lửa cháy to hơn?</li>
</ul>
<p>GV nhận xét, chuẩn hóa kiến thức. Gợi mở: ngoài nồng độ, còn yếu tố nào ảnh hưởng tốc độ phản ứng?</p>
<p><strong>Đáp án:</strong> Câu 1: a nhanh, b chậm, c nhanh, d chậm, e chậm. Câu 2: Tốc độ phản ứng. Câu 3: Mở van ga to → lượng khí thoát nhiều → nồng độ chất cháy tăng → phản ứng cháy nhanh hơn.</p>`,
      studentActions: "<p>HS tham gia trò chơi, trả lời câu hỏi, nhận xét bổ sung cho bạn.</p>",
      evaluation: "Thông qua câu trả lời, GV phát hiện khó khăn của HS và hỗ trợ kịp thời.",
    },
    {
      id: "a2",
      name: "Hình thành kiến thức — Áp suất",
      durationMinutes: 5,
      goal: "Tìm hiểu ảnh hưởng của áp suất tới tốc độ phản ứng",
      teacherActions: `<p>GV giao nhiệm vụ: HS tìm hiểu SGK, trả lời câu 4, 5 trang 97.</p>
<p>GV gọi ngẫu nhiên HS trả lời, nhận xét và chốt kiến thức.</p>
<p><strong>Kết luận:</strong> Khi áp suất tăng, nồng độ chất khí tăng theo → tốc độ phản ứng tăng (đối với phản ứng có chất khí tham gia).</p>`,
      studentActions: "<p>HS làm việc cá nhân, đọc SGK, trả lời câu hỏi và thảo luận.</p>",
      evaluation: "HS nêu được mối liên hệ giữa nồng độ và áp suất khí; giải thích ảnh hưởng của áp suất.",
    },
    {
      id: "a3",
      name: "Hình thành kiến thức — Thí nghiệm",
      durationMinutes: 20,
      goal: "Rèn kỹ năng thực hành hóa học; tìm hiểu ảnh hưởng của nhiệt độ, diện tích bề mặt và chất xúc tác",
      teacherActions: `<p><strong>Thiết bị:</strong> Ống nghiệm, đèn cồn, bình tam giác, kẹp gỗ, máy chiếu.</p>
<p><strong>Hóa chất:</strong> HCl 0,5M, phenolphtalein, Mg dạng phoi bào, H₂O₂ 10%, bột MnO₂, nước cất, đá vôi dạng viên và dạng dập nhỏ.</p>
<p>GV tổ chức HS làm thí nghiệm theo SGK trang 97–99 và hoàn thành 3 phiếu học tập:</p>
<ul>
<li><strong>Phiếu 1 (nhiệt độ):</strong> Ống nào đổi màu nhanh hơn? Nhiệt độ ảnh hưởng thế nào? Giải thích mối liên hệ. Ý nghĩa hệ số nhiệt Van't Hoff.</li>
<li><strong>Phiếu 2 (diện tích bề mặt):</strong> Bình nào thoát khí mạnh hơn? Đá vôi dạng nào có tổng diện tích bề mặt lớn hơn?</li>
<li><strong>Phiếu 3 (xúc tác):</strong> So sánh tốc độ thoát khí ở 2 bình; chất xúc tác là gì?</li>
</ul>
<p>3 nhóm trình bày kết quả. GV lưu ý: quy tắc Van't Hoff đúng khi ΔT không quá lớn; chỉ xét diện tích tiếp xúc khi có chất rắn; chất xúc tác làm tăng tốc độ nhưng không bị mất đi sau phản ứng.</p>
<p><strong>Đáp án phiếu:</strong> P1: ống đun nóng nhanh hơn; nhiệt cao → tốc độ nhanh; hệ số nhiệt cho biết tốc độ tăng bao nhiêu lần khi T tăng 10°C. P2: bình (2) nhanh hơn; đá vôi dập nhỏ có diện tích lớn hơn. P3: bình có MnO₂ nhanh hơn; xúc tác tăng tốc độ, không tiêu hao.</p>`,
      studentActions: "<p>HS làm thí nghiệm theo nhóm, hoàn thành phiếu học tập, đại diện nhóm báo cáo.</p>",
      evaluation: "HS trình bày đúng kết quả thí nghiệm và giải thích được các yếu tố ảnh hưởng.",
    },
    {
      id: "a4",
      name: "Hình thành kiến thức — Ứng dụng",
      durationMinutes: 8,
      goal: "Vận dụng kiến thức vào thực tiễn đời sống và kỹ thuật",
      teacherActions: `<p>GV cho HS thảo luận nhóm đôi, nêu ví dụ ứng dụng tăng/giảm tốc độ phản ứng trong đời sống và công nghệ.</p>
<p><strong>Ví dụ:</strong> Đèn xì O₂–acetylene (tăng nồng độ O₂); tủ lạnh bảo quản thực phẩm (giảm nhiệt độ); dập nhỏ than củi khi nhóm lò (tăng diện tích bề mặt).</p>
<p><strong>Kết luận:</strong> Hiểu biết các yếu tố ảnh hưởng tốc độ phản ứng có ý nghĩa quan trọng trong đời sống.</p>`,
      studentActions: "<p>HS thảo luận nhóm 2, đại diện báo cáo, các nhóm khác nhận xét bổ sung.</p>",
      evaluation: "HS nêu được ít nhất một ví dụ ứng dụng thực tiễn hợp lý.",
    },
    {
      id: "a5",
      name: "Luyện tập",
      durationMinutes: 5,
      goal: "Củng cố khái niệm tốc độ phản ứng và các yếu tố ảnh hưởng",
      teacherActions: `<p>GV chiếu 6 câu trắc nghiệm ABCD (30 giây/câu), HS giơ bìa trả lời.</p>
<ol>
<li>Tốc độ phản ứng là: <strong>C</strong></li>
<li>Tốc độ phản ứng phụ thuộc: <strong>D</strong> (nhiệt độ, nồng độ/áp suất, xúc tác, diện tích bề mặt)</li>
<li>Thổi khí nén vào lò cao đốt than cốc: <strong>A</strong> (nhiệt độ, áp suất)</li>
<li>Diện tích bề mặt tăng → tốc độ tăng với chất: <strong>B</strong> (chất rắn)</li>
<li>5g kẽm viên + 50ml H₂SO₄ 4M 25°C, TH không đổi tốc độ: <strong>D</strong></li>
<li>MnO₂ + H₂O₂, tốc độ trung bình: <strong>B</strong> (5,0×10⁻⁴ mol/(l·s))</li>
</ol>`,
      studentActions: "<p>HS chuẩn bị 4 bìa ABCD, tham gia trò chơi trắc nghiệm.</p>",
      evaluation: "HS trả lời đúng các câu nhận biết và thông hiểu.",
    },
    {
      id: "a6",
      name: "Vận dụng",
      durationMinutes: 2,
      goal: "Vận dụng kiến thức vào tình huống thực tiễn",
      teacherActions: "<p>GV hướng dẫn HS về nhà: lấy ít nhất 2 ví dụ trong mỗi yếu tố (nhiệt độ, áp suất, diện tích bề mặt, xúc tác) ảnh hưởng tới tốc độ phản ứng trong đời sống.</p>",
      studentActions: "<p>HS ghi nhận yêu cầu, chuẩn bị bài viết nộp đầu giờ sau.</p>",
      evaluation: "GV đánh giá bài viết ở tiết học kế tiếp.",
    },
  ],
  consolidation:
    "<p>Tóm tắt các yếu tố ảnh hưởng tốc độ phản ứng: nhiệt độ, áp suất (nồng độ chất khí), diện tích tiếp xúc bề mặt (chất rắn), chất xúc tác. Nêu ý nghĩa hệ số nhiệt Van't Hoff và ứng dụng thực tiễn.</p>",
  homework:
    "<p>Viết bài vận dụng: mỗi yếu tố (nhiệt độ, áp suất, diện tích bề mặt, chất xúc tác) cho ít nhất 2 ví dụ trong thực tiễn. Ôn lại nội dung bài 19 tiết 2.</p>",
};
