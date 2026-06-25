---
name: edua-backend-layered-architecture
description: Apply the EDUA Spring Boot backend layered architecture. Use when changing files under be/src/main/java or be/src/test/java, adding REST APIs, services, domain models, repositories, persistence adapters, external integrations, configuration, or tests for the EDUA backend.
---

# Edua Backend Layered Architecture

## Overview

Keep backend code aligned with the project layered architecture in `designs/layered-architecture.md`. Make the smallest useful change, keep public API contracts stable unless requested, and verify with backend tests.

## Workflow

1. Read `designs/layered-architecture.md` when the task touches backend structure, adds a new feature area, or is ambiguous.
2. Identify the feature boundary before coding: controller/API, use case, domain model, repository contract, infrastructure adapter, or config.
3. Place code in the narrowest correct layer.
4. Use constructor injection for Spring-managed dependencies.
5. Add or update focused tests for changed behavior.
6. Run `cd be && .\mvnw.cmd test` on Windows, or `cd be && ./mvnw test` on macOS/Linux, unless the user only asked for analysis.

## Package Rules

- `presentation.controller`: REST controllers and WebSocket endpoints. Controllers receive input, call services, and return DTOs.
- `presentation.dto`: request and response DTOs used by HTTP/WebSocket boundaries.
- `presentation.advice`: global exception handling and HTTP error mapping.
- `service`: use cases and business orchestration. Services may call domain models, repository interfaces, and technical gateway interfaces.
- `domain.model`: core business models and value objects.
- `domain.exception`: domain exceptions that do not depend on HTTP or framework details.
- `repository`: interfaces needed by services, including persistence repositories and technical gateway contracts such as `AiClient`, `StorageClient`, or `MessagePublisher` when needed.
- `infrastructure.persistence`: JPA entities, Spring Data repositories, mappers, and repository-interface implementations.
- `infrastructure.ai`, `infrastructure.storage`, `infrastructure.external`, `infrastructure.messaging`: concrete integrations with SDKs, external services, storage, AI, and STOMP.
- `config`: Spring configuration, security, WebSocket setup, executor setup, and special beans.

## Dependency Rules

- `presentation` may depend on `service` and DTO/domain types needed for mapping.
- `service` may depend on `domain` and `repository` interfaces.
- `domain` must not depend on Spring Web, JPA, controller DTOs, SDKs, or infrastructure.
- `infrastructure` may depend on `repository` interfaces and `domain`.
- `config` wires Spring-specific setup and must not contain business logic.
- Do not use field injection with `@Autowired`.
- Do not create interfaces for every service by default; create interfaces where multiple implementations, external integrations, persistence adapters, or independent testing require them.

## Common Placement

- New REST endpoint: `presentation.controller` + `presentation.dto`; call a `service`.
- New use case: `service.<feature>` unless the package is still simple enough for `service`.
- New business object/rule: `domain.model` or `domain.exception`.
- Database access: define service-facing interface in `repository`; put JPA implementation in `infrastructure.persistence`.
- External API/AI/storage call: define a gateway interface in `repository` if the service needs it; put SDK code in `infrastructure`.
- HTTP error response: map exceptions in `presentation.advice`; keep HTTP status out of services and domain.

## Minimality

- Keep changes surgical and avoid speculative packages/classes.
- For very small features, use the fewest layers that preserve the dependency direction.
- Do not add persistence, external integrations, security, or abstractions unless the task requires them.
- Preserve UTF-8 for Vietnamese text.
