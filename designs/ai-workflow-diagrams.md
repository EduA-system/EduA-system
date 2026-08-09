# AI Workflow Diagrams

This file contains simple block-style Mermaid diagrams for the AI workflow section in Report 4. The diagrams avoid actor-based workflows and focus on program activities connected by processing steps.

## 1. Overall AI Processing Blocks

**Diagram type:** High-level activity block diagram  
**Goal:** Show the main program blocks used whenever an AI feature runs.

```mermaid
flowchart LR
    A["Frontend request"]
    B["Backend REST controller"]
    C["Service use case"]
    D["Prompt builder"]
    E["AiClient gateway"]
    F["AI provider"]
    G["Response parser"]
    H["Output validator"]
    I["Database or storage"]
    J["Frontend result view"]

    A --> B --> C --> D --> E --> F --> G --> H --> I --> J
```

## 2. AI Provider Selection Blocks

**Diagram type:** Provider fallback block diagram  
**Goal:** Show how the backend chooses the provider through the gateway.

```mermaid
flowchart LR
    A["Service calls AiClient"]
    B["FallbackAiClient"]
    C["Try DeepSeek"]
    D{"DeepSeek success"}
    E["Return text or JSON"]
    F["Try OpenAI"]
    G{"OpenAI success"}
    H["Return fallback result"]
    I["Return provider error"]
    J["OpenAI image client"]
    K["Generated image bytes"]

    A --> B --> C --> D
    D -->|Yes| E
    D -->|No| F --> G
    G -->|Yes| H
    G -->|No| I
    A -->|image task| J --> K
```

## 3. Prompt Construction Blocks

**Diagram type:** Prompt construction block diagram  
**Goal:** Show how system prompts and runtime context become the final AI prompt.

```mermaid
flowchart LR
    A["Select AiPromptKey"]
    B["Load system prompt"]
    C["Validate feature input"]
    D["Load lesson or content context"]
    E["Read user instruction"]
    F["Build workflow prompt"]
    G["Merge system prompt and workflow prompt"]
    H["Send final prompt to AiClient"]

    A --> B
    C --> D --> E --> F
    B --> G
    F --> G --> H
```

## 4. Lesson Plan Generation Blocks

**Diagram type:** Generation pipeline block diagram  
**Goal:** Show the two-phase lesson-plan generation process.

```mermaid
flowchart LR
    A["Receive generation request"]
    B["Validate textbook scope"]
    C["Load textbook knowledge"]
    D["Generate objectives"]
    E["Generate materials"]
    F["Generate activity frame"]
    G["Publish frame ready"]
    H["Generate activity details"]
    I["Publish activity results"]
    J["Publish done"]

    A --> B --> C
    C --> D --> G
    C --> E --> G
    C --> F --> G
    G --> H --> I --> J
```

## 5. Lesson Section AI Edit Blocks

**Diagram type:** AI edit block diagram  
**Goal:** Show the two-step edit logic without UI actor details.

```mermaid
flowchart LR
    A["Extract editable sections"]
    B["Receive edit instruction"]
    C["Ask AI to select target sections"]
    D["Validate selected section ids"]
    E["Rewrite each selected section"]
    F["Parse rewritten content"]
    G["Create diff preview data"]
    H["Apply accepted edits"]
    I["Auto save lesson plan"]

    A --> C
    B --> C
    C --> D --> E --> F --> G --> H --> I
```

## 6. Slide Generation and Design Blocks

**Diagram type:** Slide pipeline block diagram  
**Goal:** Show the main slide-generation program steps from lesson plan to final deck.

```mermaid
flowchart LR
    A["Lesson plan input"]
    B["Chunk lesson content"]
    C["Generate deck blueprint"]
    D["Generate part skeletons"]
    E["Expand parts and slides"]
    F["Consolidate deck outline"]
    G["Confirm outline"]
    H["Generate deck skin"]
    I["Run layout engine"]
    J["Fill content slots"]
    K["Generate image slots"]
    L["Store image assets"]
    M["Build final slide deck"]

    A --> B --> C --> D --> E --> F --> G --> H --> I --> J --> M
    J --> K --> L --> M
```

## 7. Other AI Feature Blocks

**Diagram type:** Feature grouping block diagram  
**Goal:** Show smaller AI workflows that reuse the same backend gateway pattern.

```mermaid
flowchart TB
    A["Common AiClient gateway"]

    subgraph Exam["Practice exam"]
        E1["Validate exam request"]
        E2["Split question batches"]
        E3["Generate batch content"]
        E4["Parse and validate questions"]
        E5["Stream batch result"]
    end

    subgraph Molecule["Molecule model"]
        M1["Read formula or name"]
        M2["Generate molecule JSON"]
        M3["Parse atoms and bonds"]
        M4["Return 3D model data"]
    end

    subgraph Simulation["Physics simulation edit"]
        S1["Read current params"]
        S2["Generate updated params"]
        S3["Validate param schema"]
        S4["Return simulation update"]
    end

    E1 --> E2 --> E3 --> E4 --> E5
    M1 --> M2 --> M3 --> M4
    S1 --> S2 --> S3 --> S4
    E3 --> A
    M2 --> A
    S2 --> A
```

## 8. AI Reliability and Safety Blocks

**Diagram type:** Control block diagram  
**Goal:** Show the control steps around every AI call.

```mermaid
flowchart LR
    A["Receive request"]
    B["Authenticate request"]
    C["Apply rate limit"]
    D["Validate input"]
    E["Separate user data in prompt"]
    F["Call AI provider"]
    G["Parse response"]
    H{"Valid response"}
    I["Retry if allowed"]
    J["Validate output rules"]
    K["Store or stream result"]
    L["Return controlled error"]

    A --> B --> C --> D --> E --> F --> G --> H
    H -->|Yes| J --> K
    H -->|No| I --> G
    I -->|Retry exhausted| L
```

