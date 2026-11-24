# Design File — "Beyond Arrival" Registration Page

**Sources:** `FINAL Landing page (2).pdf` (desktop, 1440 × 810) and `Mobile.pdf` (mobile). All measurements below are in design pixels at 1440 wide.

## How sizing works

On desktop (1024 px and wider), every size is written as `calc(N * var(--u))`, where `--u` is 1/1440 of the page width. **N is the number of pixels in the PDF**, so to match a new design measurement you copy the number straight from the PDF. Small text has a minimum size so it stays readable on narrower screens. Below 1024 px, `--u` becomes `1px` and the single-column mobile layout takes over.

## Colours

| Name | Hex | Use |
|---|---|---|
| Olive | `#7d806e` | Hero background (an 86% olive tint over a faint crowd photo) |
| Lime | `#f7ff99` | "You're invited", the dot on the date pill, icons |
| Lime text | `#f8ffa5` | Themes line, SUBMIT text |
| Ink | `#23251f` / `#24261f` | Headings in the card, date pill, SUBMIT button |
| Label grey | `#4a4c40` | Form labels, footer brand text |
| Input border | `#8a8c7a` | 1.5 px input borders |
| White | `#ffffff` | Headline text, card, footer |

## Type (Montserrat)

| Element | Size (design px) | Weight |
|---|---|---|
| BEYOND / ARRIVAL | 87.3, italic, uppercase, line-height 0.916 | ExtraBold 800 |
| You're invited | 24.6 | Bold |
| HR & Global Mobility… | 15.4, uppercase | Bold |
| Tagline | 18.2 | Bold |
| Date pill, venue, themes | 16.5 | Bold |
| Intro paragraph | 15.4 (key words bold) | Regular / Bold |
| Card title | 29.1 | Bold |
| Form labels | 10.5, uppercase, letter-spaced | Bold |
| Consent text | 11.3 | Regular |
| SUBMIT | 12, letter-spaced | Bold |
| Privacy line | 10.5 | Regular / Bold link |

## Layout (desktop)

- **Hero:** 0–699; the photo band ends at 177. Left text column starts at x 126 ("You're invited" block at 140). Height comes from the content.
- **Form card:** x 1027–1350 (323 wide), y 55–657, white, rounded. Inputs 252 × 42.
- **Date pill:** 257 × 71 at (121, 440). Lime dot 25 px centred on its left edge. The white curve runs from the dot down to the bottom of the hero.
- **Venue list:** icons at x 417, text at 444, rows 33 apart.
- **Footer:** 111 tall, white. Leaf logo 50 × 65 at x 48. Members block (EuRA 135 wide, WERC 70 wide) ends at x 1359.

## Photo layers (the walkers effect)

The design's people "walk over" the headline. The photo is split into two images taken from the PDF's own layers, so the clipping matches the design exactly:

| File | Painted | Contents |
|---|---|---|
| `assets/hero-band.webp` | Behind the text | The left end of the dark photo band |
| `assets/hero-walkers.webp` | **Over** the headline (`.hero::after`) | The main photo band plus the walkers stepping out of it |

Both are 2880 × 760 (the 1440 × 380 design frame at 2×) and must keep the **same size and position**. "You're invited" and the form card are layered above the walkers.

On mobile both layers are shown 300 px tall, with the walkers centred on the screen.

## Components

- **Date pill:** dark pill, lime dot, two centred lines.
- **Form card:** title, five required fields, optional consent tick box, a centred SUBMIT pill and the privacy line.
- **Preview ribbon:** a lime bar at the top. It shows only while no RSVP inbox is set.

---

*Developed by AI and IT Team*

<sub>Author: Prashad Madushanka (AI and IT Team)</sub>
