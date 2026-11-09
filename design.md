# Design: Neo-Brutalist SaaS Landing Page

## Palette

| Name | Hex | Usage |
|---|---|---|
| Yellow | #ffe17c | Primary background |
| Charcoal | #171e19 | Background, footer, social proof |
| Sage | #b7c6c2 | Accent, How It Works glow borders |
| White | #ffffff | Cards, text on dark |
| Black | #000000 | Borders, buttons, primary text |
| Gray card | #f4f4f5 | Problem card fill |
| Dark gray | #272727 | Connectors, footer cards, social icon bg |
| Star yellow | #ffbc2e | Testimonial rating |
| Win red | #ff5f57 | Browser mockup close button |
| Win yellow | #febc2e | Browser mockup close button |
| Win green | #28c840 | Browser mockup close button |

## Typography

- Headings: **Cabinet Grotesk**, Extrabold 800 (track-tighter). Fallback: `Impact, system-ui, sans-serif`.
- Body: **Satoshi**, Medium 500. Fallback: `ui-sans-serif, system-ui, sans-serif`.

## Core visual rules

```css
/* 2px borders everywhere on interactive elements */
border: 2px solid #000;

/* Zero-blur hard shadows */
box-shadow: 4px 4px 0 0 #000;    /* cards, buttons */
box-shadow: 8px 8px 0 0 #000;    /* large containers */
box-shadow: 12px 12px 0 0 #000;  /* browser mockup */

/* Hover press: move into shadow space, shadow shrinks */
button:where(.neobrush) {
  transition: transform .2s cubic-bezier(.175,.885,.32,1.275),
              box-shadow .2s;
}
button:where(.neobrush):hover {
  transform: translate(4px, 4px);
  box-shadow: 4px 4px 0 0 #000;
}

/* 32x32 radial dot pattern, 10% opacity, on yellow backgrounds */
--dot: 32px 32px,
       radial-gradient(farthest-side,#000 96%,#0000) center;
background-image: radial-gradient(#ffe17c 96%,#0000 97%) 0 0/1px 1px,
                  radial-gradient(#ffe17c 96%,#0000 97%) 1px 1px/1px 1px,
                  radial-gradient(#000 96%,#0000 97%) var(--dot);
background-size: 2px 2px, 2px 2px, 32px 32px;

/* Text-stroke hero keyword */
text-stroke: 2px #000;
-webkit-text-stroke: 2px #000;
color: transparent;
-webkit-text-fill-color: transparent;
```

## Sections

### Navigation (fixed, top-0, h-20)

- bg #ffe17c, border-b-2 border-black.
- Left: logo — 10x10 black square containing #ffe17c bolt icon.
- Center: bold Satoshi links.
- Right: **Start Free Trial** — black bg, white text, 2px border, hard shadow, hover press.

### Hero (#ffe17c + dot pattern)

- Left column:
  - Badge: white, pill, 2px border → `NEW: AI Content Assistant 2.0`.
  - Heading: Cabinet Grotesk 8xl; one keyword with text-stroke + transparent fill.
  - CTA group: black primary button (8px hard shadow), white secondary button (4px hard shadow).
- Right column: browser mockup — white, 2px border, 12px hard shadow, black header bar with 3 mini circles (red #ff5f57 / yellow #febc2e / green #28c840), inner grid with sage accent panels + revenue chart.

### Social Proof Marquee (#171e19, border-b-2 border-black)

- Infinite horizontal marquee, Cabinet Grotesk, #b7c6c2, 50% opacity, linear slow loop.

### Problem vs Solution (white)

- Two 3xl-rounded cards side by side.
- Card A (Problem): #f4f4f5, 2px dashed gray border, 70% opacity, × icon.
- Card B (Solution): #ffe17c, 2px solid black border, 8px hard shadow, ✓ icon.

### Feature Grid (#ffe17c, border-y-2 border-black)

- 3-column grid, white cards: 2px border, 4px hard shadow.
- 16x16 icon box #b7c6c2 → turns #ffe17c on hover.
- Headings: Cabinet Grotesk 2xl.

### How It Works (#171e19)

- 3-step horizontal flow. Step markers: 24x24 circles with 4px colored glow borders (sage, yellow, white). Connected by #272727 horizontal line.

### Use Case Personas (white)

- 3-column bento grid.
- Card 1: sage #b7c6c2. Card 2: yellow #ffe17c + 8px hard shadow. Card 3: dark gray #272727, white text.
- White pill badge on each card top (user type).

### Testimonials (#b7c6c2)

- 3 white cards, asymmetric rounding: **TR + BL = 3xl**, TL + BR = 2px. 5-star rating in #ffbc2e.

### Final CTA (#ffe17c)

- Large centered heading.

### Footer (#171e19)

- 4 columns. Social icons: 10x10 squares (#272727) with light gray border → yellow/black on hover.

## Must / must not

**MUST**
- 2px border-width on all interactive elements.
- Only #ffe17c, #171e19, #b7c6c2 for branded sections; #171e19 for internal dark cards.
- All shadows 0 blur radius.

**DO NOT**
- Gradients.
- Soft/blurred shadows.
- Rounded corners > 12px on buttons.

## Font import

```html
<link rel="preconnect" href="https://fonts.cdnfonts.com">
<link href="https://fonts.cdnfonts.com/css/cabinet-grotesk" rel="stylesheet">
<link href="https://fonts.cdnfonts.com/css/satoshi" rel="stylesheet">
```
