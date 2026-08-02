package com.edua.beeduasystem.config;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;

class FlywayMigrationFilesTests {

    private static final Pattern VERSIONED_MIGRATION = Pattern.compile("^V(\\d+)__.+\\.sql$");
    private static final Path MIGRATION_DIRECTORY = Path.of("src", "main", "resources", "db", "migration");

    @Test
    void versionedMigrations_useUniqueNumericVersions() throws IOException {
        List<String> versions;
        try (Stream<Path> files = Files.list(MIGRATION_DIRECTORY)) {
            versions = files
                    .filter(Files::isRegularFile)
                    .map(path -> path.getFileName().toString())
                    .map(FlywayMigrationFilesTests::extractVersion)
                    .toList();
        }

        assertThat(versions).doesNotHaveDuplicates();
    }

    private static String extractVersion(String fileName) {
        Matcher matcher = VERSIONED_MIGRATION.matcher(fileName);
        assertThat(matcher.matches())
                .as("Flyway migration filename: %s", fileName)
                .isTrue();
        return matcher.group(1);
    }
}
