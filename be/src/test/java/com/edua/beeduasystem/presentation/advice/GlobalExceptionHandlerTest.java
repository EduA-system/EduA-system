package com.edua.beeduasystem.presentation.advice;

import com.edua.beeduasystem.infrastructure.persistence.entity.LibraryContentEntity;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.orm.ObjectOptimisticLockingFailureException;

import static org.assertj.core.api.Assertions.assertThat;

class GlobalExceptionHandlerTest {

    @Test
    void optimisticLockFailureMapsToConflict() {
        GlobalExceptionHandler handler = new GlobalExceptionHandler();

        var response = handler.handleOptimisticLock(new ObjectOptimisticLockingFailureException(LibraryContentEntity.class, "content-id"));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().code()).isEqualTo("STALE_STATE");
    }
}
