# Components of the System (bản viết lại cho mục 1.1 Software Architecture)

The architecture diagram is organised into three areas: the **client side**, the **EDUA System** boundary that contains the components the project builds and deploys itself, and the **external systems** that the platform integrates with. Each box in the diagram is described below.

---

## A. Client side

### 1. End users (Teacher, Moderator, Principal, IT Staff, Student)

- **Description:** The actors who use the platform. Teachers create lesson plans, slide decks, practice exams and manage their classes; Moderators review submitted content and assign weekly tasks; Principals manage school-level accounts; IT Staff maintain AI system prompts and review activity logs; Students join classes and submit their work.
- **Interaction:** Users work entirely through a web browser. Every action they perform is issued as a request from the client device to the Frontend.

### 2. Client devices (web browser)

- **Description:** Desktop, tablet and mobile browsers. EDUA is delivered as a web application, so no software has to be installed on the user's machine.
- **Interaction:** The browser loads the Next.js application over **HTTPS** and keeps two channels open to the system: HTTPS for ordinary REST requests, and a WebSocket (STOMP) channel that receives streamed progress while AI content is being generated.

---

## B. EDUA System (components inside the system boundary)

### 3. Frontend — Next.js 16 / React 19

- **Description:** The client-side user interface. It renders every screen of the platform: lesson-plan creation and editing, slide generation, slide editing and presentation, classroom and weekly-task management, the content library and community hub, the blog, the statistics dashboards, and the interactive physics/chemistry simulations rendered with Three.js.
- **Interaction:** It calls the Backend over **HTTPS**, attaching the JWT access token as a Bearer header, and subscribes to the Backend's WebSocket endpoint to display generation progress as it arrives. It never talks to the database or to any external service directly.

### 4. Backend — Spring Boot 3.4.5 / Java 21

- **Description:** The core of the system, implemented as a layered architecture (Presentation → Service → Domain, with Repository ports implemented by an Infrastructure layer). It exposes the REST API, enforces authentication and authorisation, runs the AI generation pipelines for lesson plans, slide outlines and practice exams, produces PDF/DOCX exports, and manages classrooms, weekly tasks, the content library, the community hub, notifications and activity logging.
- **Interaction:** It receives requests from the Frontend, reads and writes the Database through JPA, publishes real-time events back to the Frontend over WebSocket/STOMP, and is the only component allowed to call the external systems.

### 5. Database — PostgreSQL

- **Description:** The relational database owned and deployed by the project — it is part of the system, not a third-party service. It holds all persistent data: user accounts and roles, the textbook catalogue, library content and its versions, classes, class members and resources, student submissions, weekly tasks, blog and community-hub content, notifications, activity logs and AI system prompts. The schema is versioned and applied automatically with Flyway migrations.
- **Interaction:** The Backend accesses it through Spring Data **JPA**. No other component connects to it; all reads and writes pass through the Backend's repository layer, which keeps data consistency and validation rules in one place.

---

## C. External systems

### 6. Authentication Services — Google

- **Description:** The external identity provider. Sign-in starts in the browser with Google Identity Services; the resulting ID token is verified by the Backend, which then issues its own JWT access and refresh tokens for all subsequent requests.
- **Interaction:** The Backend calls Google over **OAuth / SSO** to validate the ID token during login. It does not store user passwords — session management afterwards is handled entirely by the system's own JWT.

### 7. AI Services — OpenAI, DeepSeek

- **Description:** The external large-language-model providers that generate teaching content: lesson plans, slide outlines and slide HTML, practice exams, molecule and simulation descriptions, and illustrative images.
- **Interaction:** The Backend builds the prompt, sends it over **HTTPS via Spring AI**, and applies a fallback chain — OpenAI is called first, DeepSeek takes over if it fails — then parses, validates and sanitises the response before returning it to the Frontend, either as a single result or as streamed progress.

### 8. Object Storage — Cloudflare R2

- **Description:** The external S3-compatible cloud storage service that keeps binary assets: generated slide images, thumbnails, uploaded class resources and student submission files.
- **Interaction:** The Backend uploads files through the **AWS S3 SDK** and stores only the returned public URL in the Database, so the Frontend can load the asset directly from storage without routing the file through the Backend.

---

## Summary of the connections shown in the diagram

| From | To | Label in the diagram | Purpose |
|---|---|---|---|
| Client devices | Frontend | HTTPS | Load the web application, send user requests |
| Frontend | Backend | HTTPS (Bearer JWT) | REST API calls and WebSocket/STOMP streaming |
| Backend | Database | JPA | Persist and query all application data |
| Backend | Google | OAuth / SSO | Verify the Google ID token at login |
| Backend | OpenAI / DeepSeek | Spring AI / HTTPS | Generate AI teaching content |
| Backend | Cloudflare R2 | S3 SDK | Upload and serve media assets |
