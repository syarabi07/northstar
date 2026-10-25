# Northstar Mega Menu Demo

A responsive SaaS navigation and multi-layout mega menu built with plain HTML, CSS, and JavaScript. No build step or framework is required.

## Run it

Open `index.html` in a browser, or serve the folder locally:

```bash
python -m http.server 8000
```

Then visit `http://localhost:8000`.

## Interactions

- Click or hover over **Products**, **Solutions**, **Resources**, or **Company** to open a different mega-menu layout.
- In **Solutions**, select a category in the left column to switch the details on the right.
- Click outside the menu, move focus outside the navigation, or press `Escape` to close it.
- The announcement bar can be dismissed (remembered for the browser session).
- The navigation bar stays available while scrolling.
- On small screens, open the menu with the menu toggle, switch categories with the in-menu tabs, and close it with the toggle again or Escape.
- Page and menu scrollbars stay available with a subtle, narrow thumb for discoverable scrolling.
- Keyboard users can tab through the navigation. Enter, Space or Arrow Down opens a menu; Tab or Arrow Down moves into its panel, Shift+Tab from the first panel control returns to the trigger, Left/Right switch top-level categories, and Escape closes the menu and restores focus.
- Demo links show a small toast so the example remains self-contained. Replace placeholder anchors and handlers with your own routes/actions.

## Lighthouse baseline

The supplied Lighthouse report captured the live page on **October 23, 2026** with Lighthouse **13.5.0**, emulating a **Moto G Power** on **slow 4G** during a single initial page load. Treat these scores as a snapshot of that test run; lab results can vary between runs and devices.

| Category | Score |
| --- | ---: |
| Performance | 95 |
| Accessibility | 100 |
| Best Practices | 100 |
| SEO | 100 |

### Performance measurements

| Metric | Result |
| --- | ---: |
| First Contentful Paint | 1.7 s |
| Largest Contentful Paint | 2.8 s |
| Total Blocking Time | 0 ms |
| Cumulative Layout Shift | 0 |
| Speed Index | 1.7 s |

Lighthouse identified render-blocking requests with an estimated **490 ms** savings opportunity. It also flagged a forced reflow, the network dependency tree, about **2 KiB** of potential CSS minification, one animated element, and four long main-thread tasks for investigation. These are audit leads rather than confirmed user-visible defects. Lighthouse also lists manual review items: automated accessibility checks do not cover every accessibility requirement, and SEO has one additional manual check.

## Files

- `index.html` — page structure and menu content
- `styles.css` — layout, visual styles, breakpoints and reduced-motion support
- `script.js` — opening/closing behavior, responsive navigation, category switching and keyboard support
- `hero-fx.js` — desktop-only hero background: drifting node network and a cursor-reactive grid
- `hero-orbit.js` — the two particles that orbit the hero ellipses
- `social-card.png` — Open Graph and social sharing preview image
- `robots.txt` and `sitemap.xml` — crawler access and the canonical landing-page URL
- `_headers` — Cloudflare Pages security response headers

Before using this demo as a live product site, replace the example links and status figures with verified destinations and current data.
