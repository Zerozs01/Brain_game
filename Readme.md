## 🎯 Scoring System: Color Memory (HSB Accuracy)

The scoring algorithm for the Color Memory game is inspired by Dialed.gg. It evaluates the user's accuracy across the three dimensions of the HSB (Hue, Saturation, Brightness) color model. A perfect round awards **10 points** (Maximum 50 points per 5-round game).

The system weights each color component based on human cognitive difficulty:

1. **Hue (Max 5 points):** The hardest to recall. Calculated on a 360-degree circular scale.
2. **Saturation (Max 3 points):** Easier to perceive (Vividness). Calculated as a flat percentage.
3. **Brightness (Max 2 points):** The easiest to perceive (Lightness). Calculated as a flat percentage.

### Mathematical Formulas

For a given target color and user guess, the score is calculated as follows:

**1. Hue Calculation:**
Since Hue is a color wheel (0 to 360), the distance must account for the circular wrap-around (e.g., the distance between 350 and 10 is 20, not 340).
Let $\Delta H$ be the shortest distance between the target and guess on the hue wheel:
$$\Delta H = \min(|H_{target} - H_{guess}|, 360 - |H_{target} - H_{guess}|)$$
$$S_{hue} = \left(1 - \frac{\Delta H}{180}\right) \times 5$$

**2. Saturation Calculation:**
Let $\Delta S$ be the absolute difference in saturation (0 to 100):
$$\Delta S = |S_{target} - S_{guess}|$$
$$S_{sat} = \left(1 - \frac{\Delta S}{100}\right) \times 3$$

**3. Brightness Calculation:**
Let $\Delta B$ be the absolute difference in brightness (0 to 100):
$$\Delta B = |B_{target} - B_{guess}|$$
$$S_{bri} = \left(1 - \frac{\Delta B}{100}\right) \times 2$$

**Total Score:**
$$Score_{round} = S_{hue} + S_{sat} + S_{bri}$$

---

## 🎨 UI/UX Implementation Notes (from DESIGN.md)

When rendering the scoring results in the UI, developers must adhere to the **Flow State Sanctuary** design system:

* **Result Typography:** Display the final score using the `Space Grotesk` font at a large scale (e.g., `display-lg`) to give it an authoritative, e-sports telemetry feel.
* **Card Container:** The result card should be styled with `surface-container-highest` and feature the signature "Glass & Gradient" backdrop blur.
* **No Hard Lines:** Do not use 1px solid borders to divide the Hue, Saturation, and Brightness breakdown. Use vertical spacing (`xl` 1.5rem) or soft background tonal transitions.
* **Progress Indicators:** If showing how close the user was visually, use the horizontal "Segmented Bars" design with the `secondary` color (#50E084) for high accuracy, rather than standard circular progress rings.
 