# Seller's view

Open `seller/index.html` in a browser, or serve the repo and go to `/seller/index.html`. No build step and no runtime dependencies. Run `node seller/seller.test.js` **from the repo root** to check it.

This is the same model as `../index.html`, asked a different question. The root file finds the buyer's maximum affordable land price. This one starts from our asking price and shows what it nets us.

Everything on the page is driven by the assumptions panel on the left and recomputes on every keystroke and slider drag. Nothing is hard-coded.

## Layout

- **Hero** — our ask, gross to us, net after tax, the development cost with its per-sq-ft rate, and the buyer's profit. Underneath, the plot price at which the buyer breaks even.
  - The development rate divides by the **saleable** area only, not the whole parcel. At 50% saleable it is twice the whole-parcel figure. The tile prints its own denominator so this cannot be misread.
  - The buyer's profit carries two percentages. The first is that profit over everything they spend, a plain margin with no timing in it. The second is the compounded annual return on their own cash, which is much lower because the money sits in the ground for about four years.
- **Price ladder** — one row per asking price (default ₹80k / ₹1L / ₹1.1L / ₹1.2L / ₹1.5L, editable in the text box). Click a row to make it the ask.
- **Matrix** — every ask against plot prices from ₹2.5 L to ₹5 L, coloured by the buyer's margin. The outlined column is the plot price currently assumed.
- **Our money** — the tax working, plus net per cent and per acre.
- **Their model, in full** — collapsed. Cost waterfall, cumulative cash chart, sell-out against interest, monthly flows and conventions, unchanged from the root file.

## No assumed target return

Nothing on this page assumes what return the buyer wants. There is no hurdle input and no IRR target. Two things replace it:

- **Plots to break even** — the plot price at which their profit is exactly zero, after land, stamp duty, development, brokerage and interest. Each row solves for its own ask. Below this price they lose money outright; the cell's tooltip says how far our assumed plot price sits above it.
- **Their margin** — profit over everything they spend. The verdict chip and both heatmaps band on this: above 25% comfortable, above 12% workable, positive but below that thin, otherwise a loss. Those bands are a judgement about what a developer will tolerate, not a solved number — change `BANDS` in the page source to move them.

## The two numbers that matter

Our net is linear in the ask and independent of every buyer assumption: at 14.95% on a zero basis, each ₹10,000 per cent is ₹1.334 cr gross and ₹1.134 cr net. Nothing the buyer does changes it.

Their side moves with one number, the plot price. Each ₹1 we add to the land price lifts the plot price they must clear by about ₹2.04 — roughly one over the saleable share, grossed up for stamp duty and brokerage. The page computes this lever live rather than hard-coding it.

## The input panel

Rupee amounts and the parcel area are text boxes showing Indian separators (`3,00,00,000`), because `<input type="number">` cannot display grouping. They accept digits with or without commas, reformat on blur so separators never fight the caret while typing, and keep the arrow-key nudge that a number box would give for free. Percentages, months and plot size stay plain number boxes. The ladder's price list is deliberately ungrouped — commas are its separator there.

## Saving

Save writes the assumptions and the ladder rungs to this browser's local storage, and the page picks them up automatically the next time it opens. Load re-reads them if you have since changed things. Reset returns to the defaults and clears the saved copy, so the page opens clean afterwards. It is per-browser and per-machine; nothing leaves the computer.

## Validation

Defaults: 1,334 cents, ask ₹1,00,000, floor ₹80,000, plots ₹3,30,000 per layout cent, development ₹8 cr, 54% saleable, zero cost basis, no debt.

At those defaults: gross ₹13.34 cr, tax ₹1.99433 cr, net to us ₹11.34567 cr. Saleable area 720.36 cents (3,13,789 sq ft), development ₹255 per saleable sq ft. Buyer profit ₹83.83 L, a 3.7% margin and 1.7% a year. Break-even plot price ₹3,18,003. Lever 2.04×.

At an ask of ₹80,000: buyer profit ₹3.68 cr, an 18.3% margin, break-even ₹2,77,301.

The cost basis is fixed at zero and has no input control, so the tax is always 14.95% of the gross. Restore the `basis` field in `fields` if that ever changes.

## Known inconsistency in the brief's defaults

The default ₹8 cr budget is ₹255 per saleable sq ft, against the ₹350 the brief states as expected. At ₹350 the budget would be ₹10.98 cr, about ₹3 cr more cost, which lands directly on what the buyer can pay us. The hero tile prints the implied rate against its own denominator so it is visible at a glance. Settle this number before trusting any verdict on the ladder.

## Keeping the model in sync

`seller/index.html` carries a byte-identical copy of the `<script id="model">` block from `../index.html`. `seller.test.js` asserts they match, so editing the model in one file without the other fails the test. To re-sync after changing the root model, copy that block across.

## On mobile

The layout stacks below 820px in the order hero, assumptions, then everything else, so the numbers and the knobs that move them sit together. The hero is a grid sibling of the panel rather than a child of `main`, which is what makes that reordering possible. Wide tables scroll sideways with the asking-price column pinned in place. All three assumption groups are open by default.

## Hosting

Published by GitHub Pages from `main` at the repository root:

- <https://anupmm.github.io/moodbidri-land-deal/> — the buyer-side modeler
- <https://anupmm.github.io/moodbidri-land-deal/seller/> — this page

Pushing to `main` redeploys; the build takes a minute or two. There is no build step, so the files are served exactly as committed. `prompt.md` is gitignored because it carries the current offer and target prices.

`.openai/hosting.json` still points at `dist/`, which is gitignored and unused by Pages.
