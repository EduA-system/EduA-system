package com.edua.beeduasystem.service.library;

import org.junit.jupiter.api.Test;
import org.springframework.transaction.annotation.Transactional;

import java.lang.reflect.Method;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class LibraryTransactionBoundaryTest {

    @Test
    void libraryContentMutationsRunInsideServiceTransaction() throws Exception {
        assertTransactional(LibraryContentService.class.getMethod("create", String.class, String.class, String.class,
                Integer.class, String.class, String.class, com.fasterxml.jackson.databind.JsonNode.class, String.class), false);
        assertTransactional(LibraryContentService.class.getMethod("update", UUID.class, String.class, String.class,
                boolean.class, Integer.class, boolean.class, String.class, boolean.class, String.class, boolean.class,
                com.fasterxml.jackson.databind.JsonNode.class, boolean.class, String.class, boolean.class), false);
        assertTransactional(LibraryContentService.class.getMethod("delete", UUID.class), false);
        assertTransactional(LibraryContentService.class.getMethod("submit", UUID.class), false);
        assertTransactional(LibraryContentService.class.getMethod("unsubmit", UUID.class), false);
        assertTransactional(LibraryContentService.class.getMethod("approve", UUID.class), false);
        assertTransactional(LibraryContentService.class.getMethod("reject", UUID.class, String.class), false);
    }

    @Test
    void hubCommentMultiRowMutationsRunInsideServiceTransaction() throws Exception {
        assertTransactional(HubCommentService.class.getMethod("create", UUID.class, String.class), false);
        assertTransactional(HubCommentService.class.getMethod("create", UUID.class, String.class, UUID.class), false);
        assertTransactional(HubCommentService.class.getMethod("update", UUID.class, String.class), false);
        assertTransactional(HubCommentService.class.getMethod("delete", UUID.class), false);
        assertTransactional(HubCommentService.class.getMethod("hideByContentOwner", UUID.class), false);
    }

    private static void assertTransactional(Method method, boolean readOnly) {
        Transactional tx = method.getAnnotation(Transactional.class);
        assertThat(tx).as(method.getName()).isNotNull();
        assertThat(tx.readOnly()).as(method.getName() + " readOnly").isEqualTo(readOnly);
    }
}
