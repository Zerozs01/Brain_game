# Design System: High-Performance Cognitive Architecture

## 1. Overview & Creative North Star
**The Creative North Star: "The Flow State Sanctuary"**

This design system is engineered to facilitate a state of "Flow"—where the boundary between the user and the interface dissolves. We are merging the surgical precision of high-end e-sports telemetry with the inviting clarity of modern educational tools. 

To break the "standard template" feel, we reject the rigid, boxed-in layouts of traditional dashboards. Instead, we embrace **Intentional Asymmetry** and **Tonal Depth**. Navigation elements should feel like they are floating in a deep, digital void, while game cards and interactive modules utilize overlapping "Glassmorphism" layers to create a sense of tactile physical presence. We don't just show data; we curate an atmosphere of elite mental performance.

---

## 2. Color & Surface Theory
Our palette is rooted in a deep-space foundation (`#111317`), punctuated by hyper-vibrant accents that signify energy and synaptic firing.

### The "No-Line" Rule
**Explicit Instruction:** Designers are prohibited from using 1px solid borders to define sections. Layout boundaries must be established exclusively through:
*   **Background Shifts:** Using `surface-container-low` vs. `surface`.
*   **Tonal Transitions:** Creating soft margins of color rather than hard lines.

### Surface Hierarchy & Nesting
Treat the UI as a physical stack of semi-translucent materials.
*   **Base Layer:** `surface` (#111317) for the main application background.
*   **Secondary Content:** `surface-container-low` for sidebars or secondary panels.
*   **Floating Modules:** `surface-container-highest` for primary interactive cards.
*   **Nesting:** When placing an element inside a card, the inner element should move *down* the tier (e.g., a `surface-container-low` input field inside a `surface-container-high` card) to create a "recessed" tactile feel.

### The "Glass & Gradient" Rule
To elevate the "playful but pro" aesthetic, use backdrop-blur (12px–20px) on floating menus using semi-transparent versions of `surface-bright`. 
*   **Signature Textures:** Main CTAs must utilize a linear gradient from `primary` (#dbfcff) to `primary-container` (#00f0ff) at a 135-degree angle. This prevents the "flat" look and adds a premium, liquid-neon glow.

---

## 3. Typography: Editorial Authority
We utilize a dual-font system to balance "High-Tech" with "Highly Legible."

*   **Display & Headlines (Space Grotesk):** This is our "Precision" font. It should feel wide, technical, and authoritative. Use it for game titles, scores, and major section headings to lean into the e-sports aesthetic.
*   **Body & Titles (Inter):** Our "Function" font. Inter provides maximum readability during high-speed gameplay instructions.

**Scale Philosophy:**
*   **High Contrast:** We use aggressive sizing (e.g., `display-lg` at 3.5rem) contrasted against small, tracked-out `label-sm` (0.6875rem) to create a sophisticated, editorial rhythm that avoids the "boring" middle-ground of standard app design.

---

## 4. Elevation & Depth
In this system, depth is "felt," not "seen."

*   **The Layering Principle:** Stack `surface-container` tiers to create hierarchy. A `surface-container-lowest` card sitting on a `surface-container-low` section creates a natural, soft "lift" without the clutter of a shadow.
*   **Ambient Shadows:** For floating modals, use "Deep Ambient" shadows: `blur: 40px`, `spread: -5px`, `opacity: 8%`, using a tinted version of `primary-fixed-dim`.
*   **The "Ghost Border" Fallback:** If a container absolutely requires a boundary for accessibility, use a **Ghost Border**: `outline-variant` at 15% opacity. Never use 100% opaque borders.
*   **Tactile Glows:** Interactive elements (buttons, active cards) should emit a subtle outer glow using the `surface-tint` token when hovered, simulating a powered-on neon filament.

---

## 5. Component Logic

### Buttons (Tactile & Energetic)
*   **Primary:** Gradient (`primary` to `primary-container`), roundedness `md`, with a 2px bottom "shading" shift for a 3D tactile feel.
*   **Secondary:** Ghost-style. No fill, `outline-variant` (20% opacity), with `on-surface` text. On hover, the background fills with a 5% `primary` tint.
*   **Tertiary:** Text-only with `label-md` styling, using `primary-fixed` color.

### Game Cards (High Contrast)
*   **Structure:** No dividers. Separate the "Game Icon" from the "Stats" using vertical white space (use the `xl` 1.5rem spacing).
*   **Corner Radius:** Always `xl` (1.5rem) for the outer container and `md` (0.75rem) for internal elements to create a nested, organic look.
*   **State:** When a game card is "Focused," it should scale to 1.02x and gain a `surface-tint` glow.

### Input Fields & Search
*   **Visuals:** Use `surface-container-lowest` as the fill. The label should be `label-sm` placed *above* the field, never inside as a placeholder. 
*   **Interaction:** Upon focus, the "Ghost Border" transitions from 15% to 80% opacity in `primary-fixed-dim`.

### Progress Indicators (The "Dash" Element)
*   Instead of standard circular loaders, use sleek, horizontal "Segmented Bars" using `secondary` (#50e084) for success and `tertiary` (#fdf2ff) for current progress, mirroring a car's RPM gauge.

---

## 6. Do's and Don'ts

### Do:
*   **Do** use extreme vertical white space. Let the content breathe like a high-end magazine.
*   **Do** overlap elements. Let a "Performance Graph" slightly bleed over the edge of its container for a dynamic, non-grid feel.
*   **Do** use `primary` and `secondary` colors for "Success" and "Action" and `tertiary` for "Special/Bonus" content.

### Don't:
*   **Don't** use pure black (#000000) for backgrounds. It kills the depth. Use `surface` (#111317).
*   **Don't** use 1px dividers. If you need to separate content, use a 24px–32px gap or a subtle background color shift.
*   **Don't** use "Drop Shadows" that are grey or black. Shadows must always be tinted with the brand's navy or cyan to maintain the "Neon Dark" atmosphere.
*   **Don't** clutter. If a screen feels busy, increase the font size of the header and double the padding of the cards.