package com.edua.beeduasystem.service.textbook;

import com.edua.beeduasystem.domain.model.textbook.TextbookCatalog;
import com.edua.beeduasystem.repository.repositories.TextbookCatalogRepository;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class TextbookServiceTest {

    @Test
    void getCatalog_returnsExactlyWhatTheCatalogRepositoryLoads() {
        TextbookCatalogRepository repository = mock(TextbookCatalogRepository.class);
        TextbookCatalog catalog = new TextbookCatalog(
                new TextbookCatalog.Meta("NXB", "KNTT", "DB"), List.of());
        when(repository.loadCatalog()).thenReturn(catalog);

        assertThat(new TextbookService(repository).getCatalog()).isSameAs(catalog);
        verify(repository).loadCatalog();
    }
}
