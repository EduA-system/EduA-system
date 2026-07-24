package com.edua.beeduasystem.service.blog;

import com.edua.beeduasystem.domain.model.auth.Subject;
import com.edua.beeduasystem.domain.model.blog.BlogPost;
import com.edua.beeduasystem.domain.model.blog.BlogPostStatus;
import com.edua.beeduasystem.repository.repositories.BlogCommentRepository;
import com.edua.beeduasystem.repository.repositories.BlogPostRepository;
import com.edua.beeduasystem.service.auth.CurrentUserProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit test cho {@link BlogPostService#create(String, String, String)}.
 *
 * <p>Đây là unit test cô lập: không khởi động Spring và không kết nối database.
 * Các dependency của BlogPostService được thay bằng Mockito mock, ngoại trừ
 * {@link BlogContentSanitizer}. Test dùng sanitizer thật để kiểm tra đúng hành
 * vi làm sạch HTML.</p>
 *
 * <p>Mỗi test được tổ chức theo ba bước:</p>
 * <ol>
 *     <li>Arrange: chuẩn bị dữ liệu và hành vi của mock.</li>
 *     <li>Act: gọi service.create(...).</li>
 *     <li>Assert: kiểm tra kết quả, exception và tương tác với repository.</li>
 * </ol>
 */
class BlogPostServiceCreateTest {

    /*
     * Dữ liệu cố định dùng chung cho các test.
     * AUTHOR_ID và AUTHOR_NAME chỉ là dữ liệu giả trong bộ nhớ. Chúng không cần
     * tồn tại trong database vì CurrentUserProvider và BlogAuthorResolver đều
     * được mock. Hằng số giúp expected value rõ ràng và test có thể lặp lại.
     */
    private static final UUID AUTHOR_ID =
            UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final String AUTHOR_NAME = "Vũ Nhật Minh";
    private static final String TITLE = "Luyen tap bai 1 - Ham so bac nhat";
    private static final String SAFE_CONTENT =
            "<p>Nội dung bài viết đã sanitize vẫn giữ được thẻ an toàn.</p>";

    // Mock nơi service yêu cầu lưu BlogPost.
    private BlogPostRepository postRepository;

    // Mock nơi service lấy comments khi chuyển BlogPost thành PostDetail.
    private BlogCommentRepository commentRepository;

    // Mock dependency dùng để đổi authorId thành tên hiển thị.
    private BlogAuthorResolver authorResolver;

    // Mock user đăng nhập; không cần SecurityContext hoặc JWT thật.
    private CurrentUserProvider currentUser;

    // Đối tượng thật đang được kiểm thử.
    private BlogPostService service;

    /**
     * JUnit chạy setUp() trước MỖI test case.
     * Mock mới bảo đảm trạng thái của case trước không ảnh hưởng case sau.
     */
    @BeforeEach
    void setUp() {
        // Arrange chung: tạo các dependency giả bằng Mockito.
        postRepository = mock(BlogPostRepository.class);
        commentRepository = mock(BlogCommentRepository.class);
        authorResolver = mock(BlogAuthorResolver.class);
        currentUser = mock(CurrentUserProvider.class);

        /*
         * Tạo service thật và truyền dependency giả vào constructor.
         * Sanitizer thật giúp UTC-CBP-04 kiểm tra script bị loại bỏ.
         */
        service = new BlogPostService(
                postRepository,
                commentRepository,
                new BlogContentSanitizer(),
                authorResolver,
                currentUser);

        // Khi service hỏi ID user hiện tại, mock trả AUTHOR_ID cố định.
        when(currentUser.requireUserId()).thenReturn(AUTHOR_ID);
    }

    /**
     * UTC-CBP-01 - Luồng bình thường với title, content và subject hợp lệ.
     * Kiểm tra cả BlogPost gửi xuống repository và PostDetail trả về.
     */
    @Test
    void utcCbp01_createsPublishedBlogPostForValidRequest() {
        stubSuccessfulSaveAndDetail();

        BlogViews.PostDetail result = service.create(TITLE, SAFE_CONTENT, "MATH");

        /*
         * ArgumentCaptor bắt lại BlogPost mà service truyền vào save(); nhờ đó
         * kiểm tra được status vì PostDetail trả về không có trường status.
         */
        ArgumentCaptor<BlogPost> savedCaptor = ArgumentCaptor.forClass(BlogPost.class);
        verify(postRepository).save(savedCaptor.capture());
        BlogPost saved = savedCaptor.getValue();

        // ID bài phải được service tự sinh bằng UUID.randomUUID().
        assertNotNull(saved.id());

        // Kiểm tra dữ liệu nghiệp vụ trước khi lưu.
        assertEquals(AUTHOR_ID, saved.authorId());
        assertEquals(TITLE, saved.title());
        assertEquals(SAFE_CONTENT, saved.content());
        assertEquals(Subject.MATH, saved.subject());
        assertEquals(BlogPostStatus.PUBLISHED, saved.status());
        // Bài mới chưa bị gỡ nên các trường audit phải null.
        assertNull(saved.removedReason());
        assertNull(saved.removedBy());
        assertEquals(saved.createdAt(), saved.updatedAt());

        assertEquals(saved.id(), result.id());
        assertEquals(TITLE, result.title());
        assertEquals(SAFE_CONTENT, result.content());
        assertEquals(Subject.MATH, result.subject());
        assertEquals(AUTHOR_ID, result.authorId());
        assertEquals(AUTHOR_NAME, result.authorName());
        assertEquals(List.of(), result.comments());
    }

    /**
     * UTC-CBP-02 - Title phải được trim; subject phải được trim, viết hoa rồi
     * chuyển thành enum Subject.MATH.
     */
    @Test
    void utcCbp02_trimsTitleAndNormalizesSubject() {
        stubSuccessfulSaveAndDetail();

          System.out.println("===== UTC-CBP-02 =====");
  System.out.println("Input title   : \"  " + TITLE + "  \"");
  System.out.println("Input subject : \" math \"");

        BlogViews.PostDetail result =
                service.create("  " + TITLE + "  ", SAFE_CONTENT, " math ");

        // Bắt lại dữ liệu thực tế mà service gửi xuống repository.
        ArgumentCaptor<BlogPost> savedCaptor = ArgumentCaptor.forClass(BlogPost.class);
        verify(postRepository).save(savedCaptor.capture());
        BlogPost saved = savedCaptor.getValue();
        
          System.out.println("[CHECK] Title");
  System.out.println("  Expected: " + TITLE);
  System.out.println("  Actual  : " + result.title());

        assertEquals(TITLE, saved.title());

          System.out.println("[CHECK] Subject");
  System.out.println("  Expected: " + Subject.MATH);
  System.out.println("  Actual  : " + result.subject());

        assertEquals(Subject.MATH, saved.subject());
        assertEquals(SAFE_CONTENT, saved.content());
        assertEquals(BlogPostStatus.PUBLISHED, saved.status());

        assertEquals(TITLE, result.title());
        assertEquals(Subject.MATH, result.subject());
        assertEquals(SAFE_CONTENT, result.content());
    }

    /** UTC-CBP-03 - Title chỉ có whitespace là input không hợp lệ. */
    @Test
    void utcCbp03_rejectsBlankTitle() {
        /*
         * assertThrows thực thi lambda và xác nhận loại exception.
         * Không có exception hoặc exception sai loại đều làm test Failure.
         */
        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> service.create(" ", SAFE_CONTENT, "MATH"));

        assertEquals("Title is required.", exception.getMessage());
        // Validation thất bại trước khi lưu, vì vậy save() không được chạy.
        verify(postRepository, never()).save(any(BlogPost.class));
    }

    /** UTC-CBP-04 - HTML chỉ chứa script trở thành rỗng sau khi sanitize. */
    @Test
    void utcCbp04_rejectsContentThatIsEmptyAfterSanitization() {
        /*
         * Sanitizer thật loại thẻ script. Service thấy nội dung sau sanitize
         * là rỗng và phải ném IllegalArgumentException.
         */
        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> service.create(TITLE, "<script>alert(1)</script>", "MATH"));

        assertEquals("Content is required.", exception.getMessage());
        verify(postRepository, never()).save(any(BlogPost.class));
    }

    /** UTC-CBP-05 - HISTORY không nằm trong enum Subject hiện tại. */
    @Test
    void utcCbp05_rejectsInvalidSubject() {
        /*
         * Subject.valueOf với HISTORY thất bại trong parseSubject().
         * assertThrows xác nhận đây là lỗi validation được mong đợi.
         */
        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> service.create(TITLE, SAFE_CONTENT, "HISTORY"));

        assertEquals(
                "Invalid subject: HISTORY. Allowed: MATH, CHEMISTRY, PHYSICS.",
                exception.getMessage());
        verify(postRepository, never()).save(any(BlogPost.class));
    }

    /**
     * Cấu hình các mock cần cho hai test thành công.
     * Case validation không gọi helper vì luồng đúng phải dừng trước save().
     */
    private void stubSuccessfulSaveAndDetail() {
        /*
         * any(BlogPost.class) chấp nhận mọi BlogPost. thenAnswer trả lại đúng
         * argument service truyền vào, mô phỏng repository lưu thành công.
         */
        when(postRepository.save(any(BlogPost.class)))
                .thenAnswer(invocation -> invocation.getArgument(0, BlogPost.class));
        // Bài vừa tạo không có comment, đúng precondition trong Excel.
        when(commentRepository.findByPostId(any(UUID.class))).thenReturn(List.of());

        // Mô phỏng việc tra tên tác giả từ AUTHOR_ID.
        when(authorResolver.name(AUTHOR_ID)).thenReturn(AUTHOR_NAME);
    }
}
