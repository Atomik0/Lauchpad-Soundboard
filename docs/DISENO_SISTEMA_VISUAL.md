---
version: alpha
name: Modlab Dark Neon
description: A high-contrast, performance-oriented e-commerce system with an energetic neon accent and dense editorial hero treatment.
colors:
  primary: "#C3EA2B"
  secondary: "#FFFFFF"
  tertiary: "#0A0A0C"
  neutral: "#1A1A1A"
  surface: "#000000"
  on-surface: "#FFFFFF"
  error: "#E5484D"
  primary-60: "#A8C61F"
  primary-70: "#8AA319"
  neutral-90: "#111111"
  neutral-80: "#1A1A1A"
  neutral-70: "#2A2A2A"
  neutral-20: "#E5E7EB"
typography:
  headline-display:
    fontFamily: "Space Grotesk"
    fontSize: "72px"
    fontWeight: 900
    lineHeight: "72px"
    letterSpacing: "-3.6px"
  headline-lg:
    fontFamily: "Space Grotesk"
    fontSize: "52px"
    fontWeight: 900
    lineHeight: "62px"
    letterSpacing: "-1.8px"
  headline-md:
    fontFamily: "Space Grotesk"
    fontSize: "38px"
    fontWeight: 900
    lineHeight: "46px"
    letterSpacing: "-0.4px"
  headline-sm:
    fontFamily: "Space Grotesk"
    fontSize: "28px"
    fontWeight: 900
    lineHeight: "28px"
    letterSpacing: "-0.5px"
  body-lg:
    fontFamily: "Space Grotesk"
    fontSize: "20px"
    fontWeight: 500
    lineHeight: "28px"
    letterSpacing: "0px"
  body-md:
    fontFamily: "Space Grotesk"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: "24px"
    letterSpacing: "0px"
  body-sm:
    fontFamily: "Space Grotesk"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: "20px"
    letterSpacing: "0px"
  label-lg:
    fontFamily: "Space Grotesk"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: "16px"
    letterSpacing: "0.08em"
  label-md:
    fontFamily: "Space Grotesk"
    fontSize: "14px"
    fontWeight: 500
    lineHeight: "14px"
    letterSpacing: "0.08em"
  label-sm:
    fontFamily: "Space Grotesk"
    fontSize: "12px"
    fontWeight: 700
    lineHeight: "12px"
    letterSpacing: "0.12em"
rounded:
  none: "0px"
  sm: "4px"
  md: "8px"
  lg: "16px"
  xl: "24px"
  full: "9999px"
spacing:
  xs: "8px"
  sm: "16px"
  md: "28px"
  lg: "48px"
  xl: "80px"
  gutter: "32px"
  margin: "24px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.tertiary}"
    typography: "{typography.label-md}"
    rounded: "{rounded.sm}"
    padding: "8px 16px"
    size: "120px"
    height: "40px"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.on-surface}"
    typography: "{typography.label-md}"
    rounded: "{rounded.sm}"
    padding: "8px 16px"
    size: "120px"
    height: "40px"
  button-tertiary:
    backgroundColor: "transparent"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-md}"
    rounded: "{rounded.none}"
    padding: "0px"
  button-primary-hover:
    backgroundColor: "{colors.primary-60}"
    textColor: "{colors.tertiary}"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.xl}"
    padding: "40px"
  input:
    backgroundColor: "{colors.neutral-70}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-md}"
    rounded: "{rounded.sm}"
    padding: "12px 16px"
    height: "40px"
  chip:
    backgroundColor: "{colors.neutral-80}"
    textColor: "{colors.on-surface}"
    typography: "{typography.label-sm}"
    rounded: "{rounded.full}"
    padding: "6px 12px"
  navbar:
    backgroundColor: "{colors.neutral-90}"
    textColor: "{colors.on-surface}"
    height: "72px"
---

# Modlab Dark Neon

## Overview
Modlab feels like a specialized enthusiast store for mechanical keyboard builders and gaming/desk-setup shoppers. The tone is dark, technical, and premium, with a bright neon accent that gives the interface energy without losing the seriousness of a pro retail brand. The layout is compact and commercial, but the oversized hero typography keeps it bold and memorable.

## Colors
- **Primary (#C3EA2B):** A vivid neon yellow-green used for the brand accent, active nav item, promo strip, and primary CTA fill. It creates instant contrast against the black interface and signals action.
- **Secondary (#FFFFFF):** Pure white used for hero headlines, body text on dark surfaces, and outlined button borders. It keeps the UI crisp and highly legible.
- **Tertiary (#0A0A0C):** Near-black ink used as the text color on the primary button and as the deepest background tone. It preserves the brand’s dark, technical mood.
- **Surface (#000000):** The base canvas for the site, especially cards and the hero overlay. This deep black allows imagery and neon accents to stand out strongly.
- **On-surface (#FFFFFF):** The default readable color on dark surfaces, used for nav, labels, and form text.
- **Neutral variants (#111111, #1A1A1A, #2A2A2A, #E5E7EB):** Supporting dark grays and a pale border tone for structure, subtle inputs, and low-emphasis separators.
- **Error (#E5484D):** Reserved for destructive or invalid states; it should stay visually separate from the neon brand accent.

## Typography
The system is built entirely on Space Grotesk, which gives the UI a modern, technical, slightly futuristic feel. Headlines are extremely heavy at 900 weight with tight tracking, making the hero statement feel assertive and condensed. Body text is lighter and more open, while labels and navigation use uppercase or near-uppercase styling with noticeable letter spacing to reinforce an engineered, retail-catalog feel.

- **Headlines:** Use `headline-display`, `headline-lg`, `headline-md`, and `headline-sm` for promotional messaging, section headers, and page hierarchy. The large sizes and negative tracking are key to the brand’s visual identity.
- **Body:** Use `body-lg`, `body-md`, and `body-sm` for supporting copy, product details, and descriptive text. Keep line lengths comfortable but not airy; the site prefers density over spacious editorial layouts.
- **Labels:** Use `label-lg`, `label-md`, and `label-sm` for navigation, buttons, chips, and utility text. Uppercase usage and increased letter spacing make these elements feel precise and product-focused.

## Layout
The layout is wide and full-bleed, with the hero image spanning the viewport and content aligned in a strong left column. Navigation sits in a fixed-height top bar, and the page relies on clear horizontal grouping rather than decorative separators. Spacing follows a tight-to-medium rhythm: 8px and 16px for UI controls, then 28px, 48px, and 80px for major vertical separation between hero copy, CTAs, and section breaks.

Use generous horizontal padding for page edges, but keep product and navigation rows visually compact. Buttons and inputs should maintain consistent minimum heights so the interface feels orderly even in a high-contrast environment.

## Elevation & Depth
The system is mostly flat, with depth coming from photography, overlays, and contrast rather than layered shadows. Shadows are minimal to nonexistent, which keeps the interface sharp and performance-oriented. Thin boundaries, darker tonal shifts, and image overlays do the work of separating regions instead of heavy elevation effects.

Cards, if used, should remain understated and dark with subtle contrast only. Avoid glossy or material-style treatments; the brand depends on clean separation, not decorative depth.

## Shapes
The shape language is restrained and slightly soft. Small radii around 4px are used for buttons and inputs, while larger UI surfaces can use 24px only when a card needs to feel premium or isolated. The overall impression is rectangular and engineered, with roundedness applied sparingly rather than as a dominant style.

Primary interactive elements should look crisp and functional, not pill-shaped. Full rounding is appropriate only for tiny chips or status pills.

## Components
- **Primary button (`button-primary`):** Bright neon fill with dark text, small radius, and compact padding. Use this for the main conversion action. The button should feel assertive and high-contrast, with a minimum height of 40px.
- **Secondary button (`button-secondary`):** Transparent background with a white border and white text. Use this for supportive actions next to the primary CTA. Keep the same compact height and padding so the pair feels balanced.
- **Tertiary button / link (`button-tertiary`):** Text-only, minimal treatment, used for low-emphasis actions and utility links. It should not compete visually with the primary CTA.
- **Hover state (`button-primary-hover`):** Slightly darker neon is preferred on hover to preserve the brand glow while indicating interaction.
- **Cards (`card`):** Dark surfaces with minimal border treatment and optional large radius only when the content is meant to feel featured. Cards should not rely on shadows for prominence.
- **Inputs (`input`):** Dark gray fill, white text, and compact height. Search fields should blend into the header while still remaining discoverable through contrast and icon support.
- **Chips (`chip`):** Small, fully or near-fully rounded pills with muted dark fills and bright or white text. Use them for brands, filters, or status labels.
- **Navbar (`navbar`):** Dark, full-width, fixed-height bar with compact spacing and a high-contrast logo area. Active navigation items can use the neon primary color.

## Do's and Don'ts
- Do use the neon primary color sparingly to highlight conversion points, active states, and promotions.
- Do keep typography bold, condensed, and highly legible against dark surfaces.
- Do preserve the compact button and input heights so the UI feels efficient.
- Do let large photography and overlays provide most of the visual drama.
- Don't introduce soft pastel colors or warm decorative gradients that weaken the brand’s technical edge.
- Don't overuse shadows, glassmorphism, or layered elevation effects.
- Don't make buttons overly rounded or oversized; the interface should stay crisp and retail-focused.
- Don't mix in multiple type families; Space Grotesk should remain the consistent voice.