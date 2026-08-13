# EDUA Capstone Presentation Outline

## I. Problem Statement and Key Changes

### 1. Project Context

- Focused on real problems at Le Quy Don High School: lack of safe lab equipment, lesson-preparation pressure (1–2 hours per period), and the need to visualize abstract concepts.
- EDUA is not merely an AI content-generation tool, but an ecosystem supporting the full teaching–learning lifecycle: creating learning materials, editing, moderation, sharing with classrooms, and progress tracking.

### 2. Feedback Adopted from the Review Board

- **Added the Subject Group Leader role (Moderator):** establishes the workflow to create, assign, submit, and approve weekly lesson plans before teachers deploy them.
- **Expanded Classroom:** teachers assign resources/assignments; students access them, submit, resubmit, or withdraw submissions. The system distinguishes on-time from late submissions.
- **Adjusted the Principal role:** focused on school-wide statistics by subject, AI material type, weekly tasks, material-approval progress, and accounts.
- **Added IT Staff:** manages AI system prompts and activity logs to improve operability and system control.

## II. Overall Solution and Role Model

### 1. Five User Groups

- **Teacher:** creates lesson plans, tests, slides, and simulations; edits and shares materials with classes.
- **Student:** accesses classroom resources and submits work by the deadline.
- **Moderator:** approves weekly lesson plans and shared materials, and coordinates within the subject group.
- **Principal:** manages school-level accounts and monitors aggregate metrics.
- **IT Staff:** manages AI system prompts and monitors system activity.

### 2. Closed-Loop Material Lifecycle

`AI generates lesson plans/slides/tests and supports simulations → Teacher edits → Save to Library → Submit lesson plan for Weekly Task approval → Moderator approves/rejects → Teacher shares resources or assignments with the classroom → Students study/submit work → Teachers track submissions and the school tracks aggregate workflow metrics`

- Weekly lesson-plan approval is distinct from Community Hub moderation: a teacher submits a Library lesson plan to a Weekly Task; the subject-group leader (Moderator) approves or rejects it with a reason, and the teacher can revise and resubmit.
- Materials are organized through the Library and Community Hub. Community Hub moderation is optional and separately controls broad sharing, with comments, content reports, and approve/reject states.
- Real-time notifications keep users aware of events such as task assignment, submission, and approval.

## III. AI Architecture and Knowledge Management

### 1. AI Orchestration Layer

- **Fallback mechanism:** DeepSeek is the primary provider for text tasks; on failure the system switches automatically to OpenAI. For image/vision tasks, OpenAI is the suitable provider.
- **Illustration generation:** the system uses OpenAI Images and stores images on Cloudflare R2. If image generation fails, the slide flow continues with a placeholder rather than interrupting the whole lesson.
- **Format control:** structured-generation flows require the AI to return JSON; the backend validates the schema before passing data to the UI, which limits format errors.
- **AI safety:** reference data and prompts are clearly separated from instructions, outputs are validated, and the teacher remains the final reviewer.

### 2. Textbook Grounding

- The system stores the core content of the *Ket noi tri thuc* textbook series in a `textbooks → chapters → lessons` structure; each lesson carries a `knowledge_json`.

- When a teacher picks a lesson, the system retrieves the matching knowledge as context for the AI so the content stays aligned with the curriculum.
- Grounding reduces the risk of AI generating inaccurate content; teachers still review before classroom use.

## IV. Business Workflows and Highlight Features

### 1. Weekly Lesson-Plan Approval

`Group leader creates the weekly task → Teacher submits the lesson plan (from library or a document) → Group leader approves/rejects with a reason → Teacher finalizes and deploys`

### 2. Teacher AI Pipeline

- Generates lesson plans following the Official Dispatch 5512 format.
- Generates tests scoped to the selected knowledge range.
- Generates the slide outline in **two phases**: build the presentation skeleton first, then generate the detail of each section/slide so users can follow progress and retry failed parts.
- Long-running AI tasks execute per session and stream progress over WebSocket/STOMP, avoiding a single long-blocking request.

### 3. Intelligent Slide Design Pipeline

- **Step 1 – Skin deck:** the AI produces the shared visual style: background, palette, and header zone.
- **Step 2 – Dynamic layout:** a frontend algorithm arranges content by slide type, content density, and semantic relationships, rather than relying entirely on fixed templates.
- **Step 3 – Content fill:** the AI fills text/images into each slot from the exact source data.
- The slide editor supports drag-and-drop, alignment, property editing, slide reordering, undo/redo, and inserting text/shapes/images and simulations.

### 4. Simulations and Subject-Specific Tools

- **Physics Hub:** interactive simulations for mechanics, oscillation, waves, thermodynamics, electricity–magnetism, nuclear/radioactivity, and circuits; users change parameters and observe phenomena and results visually.
- **Chemistry Lab:** an interactive periodic table, electron models, and 3D molecule generation from a name or formula.
- Simulations can be embedded into materials/slides to better visualize abstract concepts.

## V. System Architecture and Operability

### 1. Technology and Runtime Architecture

- Frontend: Next.js, React, and TypeScript; backend: Spring Boot; database: PostgreSQL.
- REST APIs handle normal client requests, while WebSocket/STOMP delivers AI-generation progress and real-time notifications without requiring the client to continuously poll the server.
- Cloudflare R2 stores uploaded documents and generated image assets; PostgreSQL stores structured business data and workflow state.
- The backend follows the dependency direction **Presentation → Service → Domain → Repository/Infrastructure**. This keeps business rules independent from HTTP, database, AI-provider, storage, and messaging details, so technical integrations can be changed with lower impact.

### 2. Backend Folder Responsibilities

- **`config/` – application configuration and bean wiring:** contains Spring-specific setup such as security, WebSocket/STOMP, executors, CORS, and configuration properties. It connects components together but does not contain business rules.

- **`presentation/` – API boundary:** receives requests from the frontend and returns responses. This layer is intentionally thin: it validates/maps input, invokes a service, and formats the output.
  - **`presentation/controller/`**: REST controllers and WebSocket-facing endpoints. They expose functions such as authentication, lesson-plan generation, classroom management, weekly-task approval, uploads, and notifications.
  - **`presentation/dto/`**: request and response data-transfer objects, grouped by feature (`ai`, `auth`, `classroom`, `lessonplan`, `slides`, `weeklytask`, and others). DTOs prevent external API contracts from leaking directly into the core domain.
  - **`presentation/advice/`**: global exception handling. It translates known application/domain errors into consistent HTTP status codes and error responses.

- **`service/` – use cases and workflow orchestration:** implements application behavior by coordinating domain models with repository and gateway interfaces. Feature-oriented packages such as `ai`, `lessonplan`, `slides`, `classroom`, `practiceexam`, `weeklytask`, `library`, `notification`, `statistics`, and `textbook` keep each workflow cohesive. For example, this layer coordinates the two-phase slide-generation process, weekly-plan submission/approval, assignment submissions, and notification delivery.

- **`domain/` – core educational business model:** contains framework-independent models and rules. Its feature packages represent concepts such as users/authentication, lesson plans, classrooms, textbooks, library materials, slides, practice exams, weekly tasks, notifications, blogs, AI sessions, and activity logs.
  - **`domain/model/`**: business entities, value objects, and state/rule definitions grouped by feature.
  - **`domain/exception/`**: business exceptions, for example invalid state transitions or unauthorized business actions, with no dependency on HTTP or Spring.

- **`repository/` – contracts required by services:** defines interfaces rather than concrete technical implementations.
  - **`repository/repositories/`**: persistence contracts for reading and saving business data.
  - **`repository/gateways/`**: contracts for technical capabilities used by services, such as AI providers, file storage, document export, or message publishing. This makes services testable and prevents vendor SDK code from entering business workflows.

- **`infrastructure/` – replaceable technical adapters:** implements the contracts from `repository/` and contains technology-specific code.
  - **`infrastructure/persistence/`**: JPA entities, Spring Data repositories, mappings, and implementations that persist data in PostgreSQL.
  - **`infrastructure/ai/`**: AI-provider adapters and configuration, including provider selection/fallback and structured-output handling.
  - **`infrastructure/storage/`**: Cloudflare R2/S3 integration for uploads and generated assets.
  - **`infrastructure/messaging/`**: STOMP/WebSocket message publishing for generation progress and notifications.
  - **`infrastructure/security/`**: authentication and authorization mechanisms, such as token/security filters and Spring Security integration.
  - **`infrastructure/documentexport/`**: concrete document/PDF/export generation capabilities.
  - **`infrastructure/logging/`**: technical activity/audit logging support.

### 3. Frontend Folder Responsibilities

- **`fe/app/`:** Next.js routes, full screens, and server-side Route Handlers for each product feature.
- **`fe/components/`:** Reusable feature UI and shared layout/UI building blocks.
- **`fe/stores/`:** Zustand stores for shared interactive client-side state.
- **`fe/services/`:** Centralized HTTP API calls and response/error handling.
- **`fe/lib/`:** Shared helpers for authentication, WebSocket, layouts, assets, and feature utilities.
- **`fe/data/`:** Static data and configuration consumed by frontend features.
- **`fe/public/`:** Static assets served directly to the browser.
- **Hooks/utilities:** Reusable interaction, animation, export, and graphics-support logic kept near common or feature code.

### 4. Why This Structure Improves Operability

- Technical failures are isolated: an AI, R2, database, or messaging adapter can be retried, replaced, or monitored without rewriting the lesson/classroom business flow.
- Each use case has a clear entry point and ownership, making logs, error handling, testing, and troubleshooting easier.
- The role model is enforced across the API and security layers, while workflow rules remain in the service/domain layers; this supports safe operations for Teacher, Student, Moderator, Principal, and IT Staff functions.
- The architecture supports observable long-running AI work: the service manages the generation session, infrastructure sends progress events, and the frontend shows live status to the teacher.


## VI. Testing and Evaluation

### 1. Evaluation Method

- Testing of the main flows: lesson-plan creation, outline/slide generation, test generation, document upload, class management, assignment/submission, approval, and authorization.
- Quality of AI-generated materials assessed with a rubric: adherence to requirements, knowledge accuracy, pedagogical quality, and presentation quality.
- Experience assessed through failure scenarios: AI/provider errors, invalid JSON, interrupted real-time connections, wrongly formatted uploads, late submissions, and approval rejections.

### 2. Presenting Results

- Report figures such as the number of piloted lessons or average rubric scores only when the data table, scoring criteria, and demo evidence are presented alongside them.
- Prioritize an end-to-end demo: pick a textbook lesson → generate lesson plan/slides → edit → share with the class → student submits → track results.

## VII. Limitations and Future Work

- **Data autonomy:** textbook data is currently normalized by the team; the goal is a module letting schools update, moderate, and embed knowledge for new lessons.
- **Pedagogical review:** AI is an assistant, not a replacement for the teacher in final decisions on content and teaching method.
- **Device performance:** 3D models and simulations need WebGL 2.0 browser support for a good experience.
- **Future expansion:** more subjects, more textbook data, a more complete AI evaluation rubric, learning analytics from classroom data, and a larger simulation catalog.
- **Reference-document grounding:** extend the current upload capability so teachers can attach reference documents to an AI-generation request; the system will extract relevant content and use it as context for period-specific requirements and writing style.
