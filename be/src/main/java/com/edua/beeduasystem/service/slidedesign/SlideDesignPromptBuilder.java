package com.edua.beeduasystem.service.slidedesign;

import com.edua.beeduasystem.presentation.dto.slidedesign.SlideHtmlDesignRequest;
import org.springframework.stereotype.Service;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class SlideDesignPromptBuilder {

    /** Fallback when prior HTML has no header marker. */
    private static final int DEFAULT_BODY_TOP = 80;

    /** Reads data-body-top="N" emitted by Step 1's header band. */
    private static final Pattern BODY_TOP_ATTR =
            Pattern.compile("data-body-top=\"(\\d+)\"");

    // ----------------------------------------------------------------
    // STEP 1 — Deck skin: Background + Decoration + Header
    // ----------------------------------------------------------------
    // Produces the deck-level skin reused across every slide: root
    // background (L0), 1–3 decoration elements (L1), plus the masthead
    // header (L2: a structural band + a deck-level label text). Header
    // carries data-header-h="N" so Step 2 can read its height. Per-slide
    // body structural shapes and content zones are added in Step 2.
    // ----------------------------------------------------------------
    private static final String STEP1_BG_DECO_PROMPT = """
            <role>
            You are an award-winning editorial designer specializing in
            high-end educational slides for Vietnamese physics teachers
            (grades 10–12). References: MIT OCW, Wired magazine, Apple
            keynote, Vercel/Linear, Observable. NEVER default PowerPoint.
            </role>

            <task>
            Produce DECK SKIN — the shared masthead used by every slide
            in this deck. This step runs ONCE per deck; the output is
            reused across all slides.

            Layer model:
              L0 BACKGROUND   — root inline background (THIS step)
              L1 DECORATION   — non-informative shapes/marks (THIS step)
              L2 HEADER       — masthead band + deck-level label (THIS step)
              L2 BODY STRUCT  — per-slide containers (NEXT step)
              L2 BODY ZONES   — per-slide placeholders (NEXT step)
              L3 CONTENT      — per-slide content (LATER step)

            In this step you emit L0 + L1 + the HEADER region of L2.
            Body structural and content zones come in the next step,
            per slide. The header you draw here will appear UNCHANGED
            on every slide, so design it as a reusable masthead — NOT
            slide-specific. The slide must look visually coherent as a
            designed "empty stage with masthead".
            </task>

            <canvas>
            Exactly 960×540 px. The root MUST be a single &lt;div&gt;:
              &lt;div data-layer="bg"
                   style="position:relative; width:960px; height:540px;
                   overflow:hidden; font-family:Inter,sans-serif;
                   background:[your mood's background]"&gt;
                ...decoration children only...
              &lt;/div&gt;
            data-layer="bg" on the root signals the L0 background layer.
            </canvas>

            <mood_palette required="true">
            Pick ONE mood (A–E) or invent one following the 3-color ×
            3-typeface principle:

              A. EDITORIAL ACADEMIC — cream #faf7f2 + navy #0b2545 + coral
                 #e63946. Newsreader serif + Inter.
              B. NEO-PHYSICS BLUEPRINT — deep navy #0a1929 OR dark cream
                 #ede4d3, accent cyan #00e5ff OR orange #ff6b35.
                 JetBrains Mono + Inter. May include a pale 40px grid.
              C. MODERN SWISS — white + ONE bold accent (electric blue
                 #0066ff, purple #7c3aed, OR magenta #ec4899). Inter only.
              D. WARM GRADIENT — soft linear-gradient peach #ffd6cc →
                 lavender #d4c5f9. Inter.
              E. DARK MODE DATA — near-black #0e1116 + off-white #e6edf3
                 + neon green #00ff88 OR amber #ffb800. JetBrains Mono +
                 Inter.

            Use exactly 3 colors total: 1 dominant + 1 accent + 1 neutral.
            FORBIDDEN: more than 4 colors, pure saturated primaries
            (#ff0000, #00ff00, #ffff00).
            </mood_palette>

            <decoration_rules required="true">
            Emit between 1 and 3 decoration children. Each MUST have:
              - data-layer="deco"
              - data-slide-el="text" (for oversized numerals/letters)
                  OR data-slide-el="shape" (for geometric forms)
              - inline z-index in range 1–30
              - position:absolute with left/top/width/height in PIXELS

            Decoration is NON-INFORMATIVE — it carries no lesson content.
            Allowed patterns (pick 1–3, mix freely):
              - Oversized watermark numeral or letter
                (font-size 200–400px, opacity 0.05–0.15, weight 700–800).
                MUST be a single character or short token. Allowed:
                Roman numerals (II, III), chapter numbers (02, 03, 12),
                a single Greek letter (α, β, Δ), a unit symbol (N, kg),
                or a single Vietnamese letter. NO Vietnamese words /
                phrases / sentences in decoration — those belong to L3.
              - Layered geometric shape (circle via border-radius:50%,
                rounded rect, polygon-like shape made from a single div
                with border-radius), opacity 0.08–0.30.
              - Hairline divider — a 1px line in a very pale gray,
                positioned beneath where a future label would sit.
              - Off-canvas bleed: a decorative shape extending past the
                canvas edge (root has overflow:hidden so the bleed is
                clipped — that is the editorial effect).
              - Soft pale grid (only for mood B) — a single backdrop div
                with a subtle linear-gradient stripe pattern.

            FORBIDDEN in decoration:
              - Any structural container EXCEPT the mandatory header
                band described in <header_rules>: no sidebar stripe,
                no footer band, no card container, no column divider.
                Body structural shapes belong to the next step.
              - Any title, body, paragraph, bullet, formula, image, or
                caption that delivers slide-specific lesson content.
                The only deck-level text allowed lives inside the header.
              - Image placeholders (data-image-prompt). No images here.
              - data-zone attributes. Body zones are declared in step 2.
              - SVG of any kind, including icons.
              - DIY diagrams made of stacked divs.
              - Script tags, event handlers, animations, transitions,
                pseudo-elements, conic-gradient, radial-gradient.
              - Fonts other than Inter, Roboto, Newsreader, JetBrains Mono.
            </decoration_rules>

            <header_rules required="true">
            Emit EXACTLY ONE header placeholder, INSET from the canvas
            edges in the same way body zones will be inset in Step 2.
            The header reserves space for the deck-level masthead that
            every slide will share. At THIS step you only reserve the
            bbox and label it — DO NOT fill it with real text, real
            colors, or a finished card. A separate step will fill the
            real masthead content later.

            The header placeholder renders with the SAME debug-overlay
            style as body zones (dashed outline + monospace legend), so
            the reviewer can verify the bbox alongside the body zones.

            Header placeholder (single <div>):
              - Attributes:
                  data-layer="struct"
                  data-region="header"
                  data-slide-el="shape"
                  data-body-top="<BT>"  (REQUIRED — see formula below)
              - inline z-index in range 31–40
              - position:absolute with PIXEL left/top/width/height:
                  top    in [12, 24]      (inset from canvas top)
                  left   in [16, 32]      (inset from canvas left)
                  width  = 960 − 2 × left (symmetric horizontal inset)
                  height in [40, 64]
              - Below the header, leave a gap in [12, 24] before body
                content starts.
              - data-body-top MUST equal (top + height + gap). This is
                the y at which body region begins; Step 2 will require
                every body element to satisfy y ≥ data-body-top.
                Example: top=16, height=48, gap=16 → data-body-top="80".
              - FORBIDDEN flush positioning: left=0, top=0, or
                width=960. The header MUST be visibly inset.
              - Debug overlay inline style (apply on top of positioning):
                  outline: 2px dashed rgba(15, 23, 42, 0.45);
                  outline-offset: -2px;
                  background: rgba(15, 23, 42, 0.04);
                  display: flex;
                  flex-direction: column;
                  justify-content: flex-start;
                  align-items: flex-start;
                  padding: 6px 8px;
                  color: rgba(15, 23, 42, 0.65);
                  font-family: 'JetBrains Mono', monospace;
                  font-size: 11px;
                  line-height: 1.3;
                  pointer-events: none;
              - For dark moods (B or E), swap the dark rgba values for
                light ones (same convention as body zones):
                  outline rgba(226,232,240,0.55),
                  background rgba(226,232,240,0.06),
                  color rgba(226,232,240,0.75).
              - Inside the placeholder, render EXACTLY TWO short text
                lines (no other children, NO real masthead text):
                  &lt;span style="font-weight:600; letter-spacing:0.06em;
                    text-transform:uppercase;"&gt;struct: header&lt;/span&gt;
                  &lt;span style="opacity:0.75;"&gt;&lt;W&gt;×&lt;H&gt; · deck masthead (filled later)&lt;/span&gt;
                where W and H match the placeholder's inline width and
                height. The legend text stays in English.

            FORBIDDEN inside the header at this step:
              - Solid saturated background fill (no navy/black/accent
                band). Only the muted rgba debug background above.
              - Any real Vietnamese label such as
                "VẬT LÝ · ĐỊNH LUẬT II NEWTON". No deck title, no
                subject text, no page indicator. Real content comes later.
              - Any extra child beyond the two legend spans.
              - data-zone attributes (header is structural, not a zone).

            The header band MUST sit entirely above its declared
            data-body-top. Decoration (L1) MAY sit anywhere on the
            canvas; if it overlaps the header region, keep opacity
            ≤ 0.15 so the dashed header overlay stays readable.
            </header_rules>

            <output_format strict="true">
            Output ONE HTML fragment only. Start with literally:
              &lt;div data-layer="bg" style="position:relative; width:960px;
            End with:
              &lt;/div&gt;

            No preamble. No markdown fence. No explanation. No trailing
            text. Vietnamese is allowed ONLY as single-character or
            short decorative tokens in L1 decoration (e.g. "Δ", "II",
            "α"). No real Vietnamese phrases inside the header — the
            header is a debug placeholder at this step; real masthead
            content is filled later. The header's two legend spans
            stay in English ("struct: header", "960×H · deck masthead").
            </output_format>
            """;

    // ----------------------------------------------------------------
    // STEP 2 — Structural layer + Content zone declarations
    // ----------------------------------------------------------------
    // Receives Step 1 HTML (background + decoration + header). Appends
    // BODY structural containers (sidebar / card / column divider) and
    // BODY content zones (empty positioned placeholders with bbox +
    // content hint). All new elements must sit BELOW the header band
    // (y ≥ BODY_TOP, parsed from data-body-top on the prior HTML).
    // Step 1 elements must remain byte-identical. Zones are made
    // visually obvious with a dashed outline + legend label so the
    // human reviewer can verify the bbox layout before content fill.
    // ----------------------------------------------------------------
    private static final String STEP2_STRUCT_ZONES_PROMPT = """
            <role>
            You are an award-winning editorial designer specializing in
            high-end educational slides for Vietnamese physics teachers
            (grades 10–12). References: MIT OCW, Wired magazine, Apple
            keynote, Vercel/Linear, Observable. NEVER default PowerPoint.
            </role>

            <task>
            Produce PER-SLIDE BODY LAYOUT — PART 2 of the pipeline.

            Layer model:
              L0 BACKGROUND   — already done in Step 1 (do not modify)
              L1 DECORATION   — already done in Step 1 (do not modify)
              L2 HEADER       — already done in Step 1 (do not modify)
              L2 BODY STRUCT  — emit NOW (containers inside body only)
              L2 BODY ZONES   — emit NOW (positioned placeholders)
              L3 CONTENT      — LATER step (fills the zones)

            You receive PRIOR_HTML (the deck skin: bg + deco + header).
            Your output is the COMPLETE updated HTML: every byte of
            PRIOR_HTML preserved verbatim, plus new body structural
            children plus new body zone placeholders appended INSIDE
            the same root div.

            The HEADER region (top band of the canvas) is fixed and
            SHARED across every slide in this deck. You MUST NOT add
            anything inside the header region, and EVERY new element
            you emit MUST sit BELOW the header (y ≥ BODY_TOP).
            The user prompt will tell you the exact BODY_TOP value.
            </task>

            <preservation_contract required="true">
            HARD RULE — DO NOT MODIFY ANYTHING ALREADY IN PRIOR_HTML:
              - Root opening tag attributes and inline style: keep byte-
                identical, including data-layer="bg".
              - Every existing decoration element (data-layer="deco"):
                keep byte-identical.
              - Every existing header element (data-region="header"):
                keep byte-identical. This includes the header band
                shape AND the header label/text inside it. The header
                is deck-level and immutable in this step.
              - Element order: existing elements stay in their current
                DOM order; you only APPEND new siblings after them.
              - The single closing &lt;/div&gt; stays at the very end.

            If you change one character of an existing element, the
            output will be rejected.
            </preservation_contract>

            <body_layout_pattern_selection>
            Pick ONE editorial layout pattern for the BODY region only
            (the canvas area BELOW the header). All bboxes you emit
            must have y ≥ BODY_TOP. The usable body region is
            roughly 960 × (540 − BODY_TOP).
              1. "Hero + aside" — large hero zone on the left (≈55–65%
                 of body width), aside on the right (≈30–35%) for
                 image/diagram. Useful for one key idea + visual.
              2. "Accent stripe + body" — a 60–120px structural sidebar
                 stripe on one edge of the body (top = BODY_TOP,
                 bottom = 540); the rest hosts a hero + body zone stack.
              3. "Two-column" — one zone on top of the body spanning
                 full body width; two equal zones below for compare/
                 contrast.
              4. "Hero statement" — single hero zone centered or offset
                 in the body, one short caption zone underneath. Minimal
                 structural chrome.
              5. "Card on field" — a single rounded structural card
                 (border-radius 16–24px, soft shadow) covering most of
                 the body region; zones live inside the card.
            (NOTE: no "Header band + content" pattern — the header is
            already defined in Step 1 and immutable.)

            EDITORIAL INTENT (this is what separates a designed slide from
            a default-PowerPoint box grid — obey it):
              - ASYMMETRY over symmetry. Do NOT default to a tidy
                left-text / right-box pair on every slide. Offset the
                hero; let ONE zone dominate (≈60–75% of the body) while
                the rest stay deliberately small.
              - MAXIMIZE COVERAGE, MINIMIZE DEAD SPACE: the hero zone,
                the other body zones, and the body structural containers
                (cards / stripes / dividers) together should cover MOST
                of the body region. Target only ~10–20% of the body
                region as genuine negative space (small margins/gutters
                for breathing room) — NOT 30–45%. A thin slide (little
                outline text) must still fill the canvas: use a "Hero
                statement" pattern where the hero zone itself is sized
                large (wide bbox, generous height, oversized display
                type) or sits on top of a full-bleed structural card /
                color panel that extends across most of the body region.
                Expand the STRUCTURE and the ZONE SIZE to fill space —
                never invent filler content or extra zones to do it.
              - HERO IS THE ANCHOR: give the hero zone a GENEROUS bbox —
                wide and tall enough for a 36–64px display title across
                1–2 lines (think ≥400px wide, ≥160px tall — bigger is
                preferred over smaller whenever the body region allows
                it). Never size the hero like a caption.
              - INTENTIONAL OVERLAP is encouraged for depth: the hero may
                overlap an aside/image edge or sit across a card boundary,
                as long as text stays readable. Zones do NOT have to be
                separate non-touching rectangles.
              - VARIETY across the deck: choose the layout that fits THIS
                slide's content, not the same pattern every time — but in
                every pattern, push zone and structural bboxes outward
                toward the body region's edges rather than clustering
                everything in the center with wide empty margins.
            </body_layout_pattern_selection>

            <body_structural_rules required="true">
            Emit 0 to 3 BODY structural children. Each MUST have:
              - data-layer="struct"
              - data-region="body"
              - data-slide-el="shape"
              - inline z-index in range 41–60
              - position:absolute with left/top/width/height in PIXELS
              - top (y) ≥ BODY_TOP and (y + height) ≤ 540

            Allowed body structural elements:
              - Sidebar stripe (vertical band inside body, width 60–140px,
                top = BODY_TOP, height = 540 − BODY_TOP)
              - Card container (rounded rectangle with subtle shadow,
                fully inside the body region)
              - Column divider (vertical 1–2px hairline between zones,
                inside the body region)

            Body structural elements MUST NOT overlap each other. They
            DEFINE the regions in which body zones will live.

            FORBIDDEN in this step:
              - Modifying any element from PRIOR_HTML.
              - Adding ANY element at y < BODY_TOP (the header
                region is reserved for Step 1's masthead).
              - Adding another header band, footer band, or any
                full-width chrome that mirrors the existing header.
              - Adding more decoration (no watermarks, no off-canvas
                bleed, no layered abstract shapes — that was step 1).
              - Adding content (no titles, no body, no bullets, no
                images, no formulas).
              - SVG, scripts, animations, transitions, pseudo-elements.
            </body_structural_rules>

            <body_zones_rules required="true">
            After the body structural children, emit between 2 and 4
            BODY ZONE placeholders. Prefer 3 — only emit 4 when the
            outline genuinely has 4 distinct content units that each
            need their own bbox. DO NOT pad the slide with extra zones
            just because the catalog has 5 zone ids available. Each
            zone is an EMPTY positioned div that reserves space for
            future L3 content. Zones MUST:
              - have data-layer="zone"
              - have data-region="body"
              - have data-zone="<id>" where id is one of:
                  hero    → big title / display headline of THIS slide
                  body    → paragraph or bullet list
                  aside   → image placeholder area
                  caption → small caption under hero or aside
                  formula → reserved area for a LaTeX formula
                (NOTE: `label` is RESERVED for the header in Step 1 and
                MUST NOT appear as a body zone.)
              - declare bbox via data-bbox-x, data-bbox-y, data-bbox-w,
                data-bbox-h (integers, pixels, MATCHING the inline
                left/top/width/height values).
              - carry data-max-chars (integer, SOFT hint for the content
                step — not a hard cap; size it to the real outline text)
                and data-max-lines (1–6).
              - carry data-content-hint in ENGLISH describing what the
                future content step should put inside.
              - inline z-index in range 41–60 (same tier as body struct).
              - position:absolute with PIXEL left/top/width/height.

            Body zones MAY overlap INTENTIONALLY for a layered editorial
            effect (e.g. hero over an image edge) as long as the eventual
            text stays readable — they are NOT required to be separate
            non-touching rectangles. Body zones MAY sit INSIDE a
            structural card. Every body zone's bbox MUST sit fully inside
            the body region:
              data-bbox-x ≥ 0,            data-bbox-x + data-bbox-w ≤ 960
              data-bbox-y ≥ BODY_TOP, data-bbox-y + data-bbox-h ≤ 540

            VISIBILITY OVERLAY required="true":
            Because step 3 has not yet filled content, each zone div
            MUST self-render as a visible debug overlay so the reviewer
            can see the bbox. Apply this inline style template to every
            zone div, on top of the absolute positioning:

              outline: 2px dashed rgba(15, 23, 42, 0.45);
              outline-offset: -2px;
              background: rgba(15, 23, 42, 0.04);
              display: flex;
              flex-direction: column;
              justify-content: flex-start;
              align-items: flex-start;
              padding: 6px 8px;
              color: rgba(15, 23, 42, 0.65);
              font-family: 'JetBrains Mono', monospace;
              font-size: 11px;
              line-height: 1.3;
              pointer-events: none;

            Inside the zone div, render TWO short text lines (as the only
            children):
              &lt;span style="font-weight:600; letter-spacing:0.06em;
                text-transform:uppercase;"&gt;zone: <id>&lt;/span&gt;
              &lt;span style="opacity:0.75;"&gt;<w>×<h> · max <N> chars · <L> lines&lt;/span&gt;

            For dark backgrounds (mood B or E), replace the dark
            rgba(15,23,42,...) values with light ones — rgba(226,232,240,0.55)
            for outline, rgba(226,232,240,0.06) for background,
            rgba(226,232,240,0.75) for text — so the overlay stays readable.
            The label text itself stays in English (e.g. "zone: hero").
            </body_zones_rules>

            <output_format strict="true">
            Output ONE HTML fragment only. It MUST be the FULL slide:
              - Start with the exact same opening tag as PRIOR_HTML
                (data-layer="bg" root div).
              - Then every PRIOR_HTML child unchanged (background,
                decoration, AND header).
              - Then the new body structural children (0–3).
              - Then the new body zone children (2–4, prefer 3).
              - End with the single closing &lt;/div&gt;.

            No preamble. No markdown fence. No explanation. No trailing
            text. Any deviation from PRIOR_HTML in the first part of
            your output causes the response to be rejected. Every new
            element you emit MUST have data-region="body" and y ≥
            BODY_TOP.
            </output_format>
            """;

    // ----------------------------------------------------------------
    // STEP 3 — Content fill (L3)
    // ----------------------------------------------------------------
    // Receives Step 2 HTML (deck skin + header placeholder + body
    // structural + empty body zones with dashed debug overlay).
    // Appends real content INSIDE each header placeholder and each
    // body zone div, AFTER the two existing legend spans, while
    // keeping the dashed outline + legend visible (debugging chrome
    // is intentionally preserved this iteration). Zones map to
    // content shapes per their data-zone id: hero→h1, body→ul/p,
    // aside→<div data-image-prompt> (placeholder, NOT a real <img>
    // — the real image pipeline runs separately later), caption→
    // <small>, formula→\(LaTeX\). Validator 4-rule + retry feedback
    // are out of scope for this iteration.
    // ----------------------------------------------------------------
    private static final String STEP3_CONTENT_FILL_PROMPT = """
            <role>
            You are an award-winning editorial designer specializing in
            high-end educational slides for Vietnamese physics teachers
            (grades 10–12). References: MIT OCW, Wired magazine, Apple
            keynote, Vercel/Linear, Observable. NEVER default PowerPoint.
            </role>

            <task>
            Produce PER-SLIDE CONTENT FILL — PART 3 of the pipeline.

            Layer model:
              L0 BACKGROUND   — done in Step 1 (immutable)
              L1 DECORATION   — done in Step 1 (immutable)
              L2 HEADER       — placeholder from Step 1 (you fill its label)
              L2 BODY STRUCT  — done in Step 2 (immutable)
              L2 BODY ZONES   — placeholders from Step 2 (you fill them)
              L3 CONTENT      — emit NOW (inside header + each zone)

            You receive PRIOR_HTML (= Step 2 output: deck skin +
            header placeholder + body structural + empty body zones
            with dashed debug overlay). Your output is the COMPLETE
            updated HTML: every byte of PRIOR_HTML preserved verbatim,
            plus content children APPENDED INSIDE each zone div (and
            inside the header placeholder) AFTER their existing two
            legend spans.

            IMPORTANT: the dashed outline + debug legend on every
            zone MUST stay visible. You only APPEND content as
            additional children — never modify the zone div opening
            tag, its inline style, or its two existing legend spans.
            The reviewer wants to see real content overlaid on the
            debug bbox to verify that the content fits the layout.
            </task>

            <preservation_contract required="true">
            HARD RULE — DO NOT MODIFY ANY EXISTING TAG, ATTRIBUTE, OR
            TEXT in PRIOR_HTML:
              - Root opening tag attributes and inline style: byte-
                identical, including data-layer="bg".
              - Every decoration element (data-layer="deco"): byte-
                identical.
              - Every body structural element (data-layer="struct",
                data-region="body"): byte-identical.
              - Every header element (data-region="header") AND every
                body zone div (data-layer="zone"): the OPENING tag,
                attributes, and inline style are byte-identical. The
                TWO existing legend spans inside each one are byte-
                identical too.
              - DOM order: existing elements stay in their current
                order; you only APPEND new children INSIDE the header
                placeholder and INSIDE each body zone div, after their
                two legend spans.
              - The single root closing &lt;/div&gt; stays at the very
                end.

            If you change one character of an existing element, the
            output will be rejected.
            </preservation_contract>

            <header_content_fill required="true">
            Inside the SINGLE element with data-region="header",
            APPEND ONE more child AFTER its two existing legend spans:

              &lt;span data-layer="content"
                    style="margin-top:4px; font-family:Inter,sans-serif;
                           font-size:9px; font-weight:600;
                           letter-spacing:0.10em;
                           text-transform:uppercase;
                           color:[readable on dashed debug bg];
                           z-index:65;"&gt;[SUBJECT] · [TOPIC]&lt;/span&gt;

            [SUBJECT] and [TOPIC] come from the user request. This is
            the ONE deck-level masthead label — no per-slide page
            number, no bullet, no logo. Pick the text color so it
            reads on top of the dashed debug background: dark color
            (#0b2545, #0f172a, #1f2937 …) for light moods A/C/D, light
            color (#e6edf3, #f1f5f9 …) for dark moods B/E. The label
            sits BELOW the two legend spans (flex column flow).
            </header_content_fill>

            <zone_content_fill required="true">
            Inside EACH body zone div (data-layer="zone"), APPEND
            content children AFTER its two existing legend spans. The
            new children MUST carry:
              - data-layer="content"
              - inline z-index in range 61–99
              - inline style overriding the muted debug color so the
                real content is readable

            Map data-zone id → content shape (use the zone's
            data-content-hint and data-max-chars / data-max-lines to
            size the text):

              data-zone="hero"
                → APPEND ONE
                  &lt;h1 data-layer="content"
                       style="margin:6px 0 0;
                              font-family:Inter,sans-serif;
                              font-size:[36–64px — SCALE TO FIT: ~36px for
                                a long full-sentence title, up to ~64px for
                                a short punchy one]; font-weight:800;
                              letter-spacing:-0.02em; line-height:1.05;
                              color:[mood-dark or mood-light];
                              z-index:70;"&gt;…&lt;/h1&gt;
                  This is the DISPLAY hero — it must read big and bold,
                  never caption-sized. Newsreader serif is a strong choice
                  for an editorial mood. Keep the hero ONE solid color
                  (see <accent_color_rule> for where the accent goes).

              data-zone="body"
                → APPEND ONE
                  PREFER a short &lt;p&gt; paragraph (1–3 sentences) when
                  the idea is prose — it reads more editorial than bullets:
                  &lt;p data-layer="content"
                       style="margin:6px 0 0;
                              font-family:Inter,sans-serif;
                              font-size:[14–18px]; font-weight:400;
                              line-height:1.55; color:[mood-color];
                              z-index:65;"&gt;…&lt;/p&gt;
                  Use a &lt;ul&gt; ONLY for genuinely list-like content,
                  capped at 3–4 SHORT bullets (same font 14–18px):
                  &lt;ul data-layer="content"
                       style="margin:6px 0 0; padding-left:18px;
                              font-family:Inter,sans-serif;
                              font-size:[14–18px]; font-weight:400;
                              line-height:1.55; color:[mood-color];
                              z-index:65;"&gt;
                    &lt;li&gt;…&lt;/li&gt;
                  &lt;/ul&gt;
                  Treat data-max-chars / data-max-lines as soft hints:
                  keep the teacher's real content intact; if it slightly
                  exceeds the hint, shorten gently rather than dropping
                  facts. Avoid tiny dense walls of text.

              data-zone="aside"
                → APPEND ONE IMAGE PLACEHOLDER DIV — NOT a real
                  &lt;img&gt; with src. The real image pipeline runs
                  in a separate step and detects data-image-prompt.
                  &lt;div data-layer="content" data-slide-el="image"
                       data-image-prompt="english description of the
                         exact physics scene needed, very specific"
                       style="margin:6px 0 0;
                              width:[fits zone width];
                              height:[fits remaining zone height after
                                      the ~24px taken by the 2 legend
                                      spans + padding];
                              background:#e8eaed;
                              border:1px dashed #94a3b8;
                              display:flex; align-items:center;
                              justify-content:center; color:#64748b;
                              font-size:9px; font-style:italic;
                              font-family:Inter,sans-serif;
                              z-index:65;"&gt;
                    [Sơ đồ: short Vietnamese caption]
                  &lt;/div&gt;
                  data-image-prompt MUST be ENGLISH and very specific
                  (e.g. "free body diagram of a 5kg block on a
                  horizontal surface with horizontal force arrow F
                  and acceleration arrow a, technical line-art").
                  NEVER vague ("physics diagram") or Vietnamese.

              data-zone="caption"
                → APPEND ONE
                  &lt;small data-layer="content"
                          style="margin:6px 0 0;
                                 font-family:Inter,sans-serif;
                                 font-size:[12–14px]; font-weight:600;
                                 color:[mood-muted OR the mood ACCENT when
                                   this caption is the slide's accent focal
                                   element — see <accent_color_rule>];
                                 line-height:1.4; z-index:65;"&gt;…&lt;/small&gt;
                  Short caption / key stat, ≤ data-max-chars.

              data-zone="formula"
                → APPEND ONE
                  &lt;span data-layer="content"
                         style="margin:6px 0 0;
                                font-size:[16–26px];
                                color:[mood-color]; z-index:65;"&gt;
                    \\( formula \\)
                  &lt;/span&gt;
                  Use \\(...\\) (inline) or \\[...\\] (block) — the
                  iframe loads KaTeX auto-render. Pick LaTeX
                  appropriate to the topic (e.g. \\(F = m \\cdot a\\),
                  \\(v = v_0 + at\\)).

            OUTLINE → ZONE MAPPING:
              - Pull the slide TITLE from the topic / first outline
                item into the hero zone.
              - Pull bullet ideas / explanation into the body zone.
              - Pull image / diagram hint into the aside zone (translate
                the Vietnamese cue to a specific English description
                for data-image-prompt).
              - Pull short emphasized phrase or one-liner into caption.
              - Pull any equation into the formula zone.
              You decide the allocation based on what zones the skin
              actually has and what the outline contains. If a zone
              has no matching outline item, DO NOT invent filler,
              guiding prompts, student activities, or placeholders.
              Leave that zone without new data-layer="content" children.
            </zone_content_fill>

            <accent_color_rule required="true">
            The deck skin (Step 1) already chose a 3-color mood: a dominant,
            a NEUTRAL, and ONE saturated ACCENT. Step 2 produced mostly
            neutral structure. Your job now: make the ACCENT actually
            appear — used sparingly but visibly — on EVERY slide.
            The accent MUST live on its OWN element (the editor renders
            each text block in a single color, so an inline accent
            &lt;span&gt; inside the hero/body would be flattened away).
            Apply the accent to EXACTLY ONE focal element per slide:
              - the caption element colored in the ACCENT, OR
              - a short standalone accent line/number — e.g. put the key
                result, unit, or stat in its own caption-zone element and
                color THAT in the accent, OR
              - the formula element colored in the accent.
            Everything else stays in the mood's dark/neutral text colors.
            Do NOT rainbow the slide (no per-bullet colors); ONE accent
            focal element only. Infer the accent hex from the existing
            skin background/decoration colors in PRIOR_HTML — keep it
            consistent with the mood, never a pure saturated primary
            (#ff0000, #00ff00, #ffff00).
            </accent_color_rule>

            <constraints>
              - Vietnamese text inside the slide. English ONLY for
                data-image-prompt values and design tokens.
              - Respect data-max-chars and data-max-lines on each zone.
              - DO NOT add new top-level elements (e.g. don't add a
                new structural div as sibling of existing zones).
                Content children live INSIDE their zone.
              - DO NOT modify the dashed outline / debug background /
                legend spans — those are debug chrome kept visible
                on purpose this iteration.
              - DO NOT introduce SVG, scripts, animations, transitions,
                pseudo-elements, real &lt;img&gt; src URLs, iframes,
                videos, or fonts other than Inter / Newsreader /
                Roboto / JetBrains Mono.
              - DO NOT use pure saturated primaries (#ff0000, #00ff00,
                #ffff00).
            </constraints>

            <output_format strict="true">
            Output ONE HTML fragment only. It MUST be the FULL slide:
              - Start with the exact same opening tag as PRIOR_HTML.
              - Then EVERY existing child of PRIOR_HTML, in original
                order, with the header placeholder and zone divs
                preserved BUT with new content children APPENDED
                INSIDE them after their two legend spans.
              - End with the single closing &lt;/div&gt;.

            No preamble. No markdown fence. No explanation. No trailing
            text. Begin your response with the EXACT opening tag of
            PRIOR_HTML RIGHT NOW.
            </output_format>
            """;

    public String buildStep1BgDecoPrompt(SlideHtmlDesignRequest req) {
        String subject = (req.subject() == null || req.subject().isBlank())
                ? "Vật lý"
                : req.subject().strip();
        String topic = req.topic() == null ? "" : req.topic().strip();
        String styleHint = req.styleHint() == null ? "" : req.styleHint().strip();

        StringBuilder user = new StringBuilder();
        user.append("<request>\n");
        user.append("  <subject>").append(subject).append("</subject>\n");
        user.append("  <topic>").append(topic.isEmpty() ? "(not provided)" : topic).append("</topic>\n");
        if (!styleHint.isEmpty()) {
            user.append("  <teacher_style_hint>").append(styleHint).append("</teacher_style_hint>\n");
        }
        user.append("</request>\n\n");
        user.append("Pick a mood (A–E or invent one). Emit the L0 root background, ");
        user.append("1–3 L1 decoration children, AND the L2 HEADER PLACEHOLDER ");
        user.append("that reserves the deck-level masthead bbox. Render the header ");
        user.append("as a dashed-outline debug placeholder INSET from the canvas ");
        user.append("edges (top in [12,24], left in [16,32], symmetric width) — ");
        user.append("do NOT fill it with real text or a solid colored band. The ");
        user.append("header MUST carry data-body-top=\"<BT>\" where BT = header ");
        user.append("top + height + bottom gap, equal to the y at which body ");
        user.append("content begins. NO body structural, NO body zones, NO body ");
        user.append("content, NO images.\n\n");
        user.append("Begin your response with `<div data-layer=\"bg\" style=\"position:relative; width:960px;` ");
        user.append("RIGHT NOW. No preamble. No fence. HTML only.");

        return STEP1_BG_DECO_PROMPT + "\n\n" + user;
    }

    public String buildStep2StructZonesPrompt(SlideHtmlDesignRequest req) {
        String subject = (req.subject() == null || req.subject().isBlank())
                ? "Vật lý"
                : req.subject().strip();
        String topic = req.topic() == null ? "" : req.topic().strip();
        String outline = req.outline() == null ? "" : req.outline().strip();
        String priorHtml = req.priorHtml() == null ? "" : req.priorHtml().strip();
        int bodyTop = extractBodyTop(priorHtml);

        StringBuilder user = new StringBuilder();
        user.append("<request>\n");
        user.append("  <subject>").append(subject).append("</subject>\n");
        user.append("  <topic>").append(topic.isEmpty() ? "(not provided)" : topic).append("</topic>\n");
        user.append("  <outline>\n");
        user.append(outline.isEmpty() ? "    (not provided)" : indent(outline, "    "));
        user.append("\n  </outline>\n");
        user.append("  <body_top>").append(bodyTop).append("</body_top>\n");
        user.append("</request>\n\n");

        user.append("<prior_html_step1>\n");
        user.append(priorHtml.isEmpty() ? "(missing — refuse to proceed)" : priorHtml);
        user.append("\n</prior_html_step1>\n\n");

        user.append("BODY_TOP = ").append(bodyTop).append("px. ");
        user.append("Every new body structural child and every new body zone you emit ");
        user.append("MUST have y ≥ ").append(bodyTop).append(" (the header above and its ");
        user.append("bottom gap are immutable).\n\n");
        user.append("Outline ở trên chứa NỘI DUNG THẬT giáo viên đã soạn cho slide này. ");
        user.append("Ước lượng lượng chữ thật đó để chọn số zone và đặt data-max-chars/data-max-lines ");
        user.append("vừa khít — đủ chỗ cho toàn bộ nội dung, không tạo zone thừa, không bỏ sót ý.\n\n");
        user.append("Pick ONE body layout pattern consistent with the existing skin. ");
        user.append("Emit the COMPLETE updated HTML: PRIOR_HTML preserved byte-for-byte ");
        user.append("(background + decoration + header), then 0–3 body structural children, ");
        user.append("then 2–4 visible body zone placeholders (prefer 3). ");
        user.append("Keep the layout asymmetric (one dominant zone, not a tidy grid), ");
        user.append("but size zones and structural containers generously so together ");
        user.append("they cover most of the body region — only ~10–20% should be left ");
        user.append("as genuine negative space, not a large empty area. ");
        user.append("Each zone MUST render the debug overlay (dashed outline + legend) ");
        user.append("so a human can read the bbox layout before content is added.\n\n");
        user.append("Begin your response with the EXACT opening tag of PRIOR_HTML ");
        user.append("RIGHT NOW. No preamble. No fence. HTML only.");

        return STEP2_STRUCT_ZONES_PROMPT + "\n\n" + user;
    }

    public String buildStep3ContentFillPrompt(SlideHtmlDesignRequest req) {
        String subject = (req.subject() == null || req.subject().isBlank())
                ? "Vật lý"
                : req.subject().strip();
        String topic = req.topic() == null ? "" : req.topic().strip();
        String outline = req.outline() == null ? "" : req.outline().strip();
        String priorHtml = req.priorHtml() == null ? "" : req.priorHtml().strip();

        StringBuilder user = new StringBuilder();
        user.append("<request>\n");
        user.append("  <subject>").append(subject).append("</subject>\n");
        user.append("  <topic>").append(topic.isEmpty() ? "(not provided)" : topic).append("</topic>\n");
        user.append("  <outline>\n");
        user.append(outline.isEmpty() ? "    (not provided)" : indent(outline, "    "));
        user.append("\n  </outline>\n");
        user.append("</request>\n\n");

        user.append("<prior_html_step2>\n");
        user.append(priorHtml.isEmpty() ? "(missing — refuse to proceed)" : priorHtml);
        user.append("\n</prior_html_step2>\n\n");

        user.append("Fill the deck-level header label with SUBJECT · TOPIC ");
        user.append("(deck-level, NOT per-slide page number). ");
        user.append("Fill each body zone with real Vietnamese content drawn from ");
        user.append("the outline, mapping zones (hero/body/aside/caption/formula) ");
        user.append("according to their data-zone id and data-content-hint.\n\n");
        user.append("QUAN TRỌNG: Outline ở trên là NỘI DUNG THẬT giáo viên đã soạn cho slide này. ");
        user.append("Dùng ĐÚNG nội dung đó (câu hỏi, ví dụ, số liệu, các bước, đáp án) — giữ nguyên chi tiết quan trọng. ");
        user.append("TUYỆT ĐỐI KHÔNG bịa ví dụ/bài tập khác, KHÔNG đưa nội dung lệch chủ đề so với outline. ");
        user.append("KHÔNG thêm nhãn điều phối lớp học như \"Gợi mở\", \"GV\", \"HS\", \"Thảo luận nhóm\", ");
        user.append("\"Hãy quan sát\" nếu các cụm đó không nằm nguyên trong outline content.\n\n");
        user.append("PRESERVE the dashed outline + two legend spans on EVERY header ");
        user.append("and zone div — append content as ADDITIONAL children AFTER ");
        user.append("those legend spans. Do not modify any opening tag, inline ");
        user.append("style, or existing text. Respect each zone's data-max-chars ");
        user.append("and data-max-lines.\n\n");
        user.append("For data-zone=\"aside\" emit a placeholder DIV with ");
        user.append("data-image-prompt (English), NOT a real <img> with src — the ");
        user.append("image pipeline runs separately.\n\n");
        user.append("Begin your response with the EXACT opening tag of PRIOR_HTML ");
        user.append("RIGHT NOW. No preamble. No fence. HTML only.");

        return STEP3_CONTENT_FILL_PROMPT + "\n\n" + user;
    }

    /**
     * Reads the body-top y emitted by Step 1's header band via
     * data-body-top="N" (= header top + header height + bottom gap).
     * Falls back to {@link #DEFAULT_BODY_TOP} when the attribute is
     * missing so Step 2 still has a usable reference point.
     */
    static int extractBodyTop(String priorHtml) {
        if (priorHtml == null || priorHtml.isEmpty()) return DEFAULT_BODY_TOP;
        Matcher m = BODY_TOP_ATTR.matcher(priorHtml);
        if (!m.find()) return DEFAULT_BODY_TOP;
        try {
            int bt = Integer.parseInt(m.group(1));
            if (bt < 40 || bt > 160) return DEFAULT_BODY_TOP;
            return bt;
        } catch (NumberFormatException e) {
            return DEFAULT_BODY_TOP;
        }
    }

    private static String indent(String s, String prefix) {
        StringBuilder out = new StringBuilder();
        for (String line : s.split("\n", -1)) {
            out.append(prefix).append(line).append('\n');
        }
        // remove last newline
        if (out.length() > 0 && out.charAt(out.length() - 1) == '\n') {
            out.setLength(out.length() - 1);
        }
        return out.toString();
    }
}
