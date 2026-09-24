# Seller's view

Open `seller/index.html` in a browser, or serve the repo and go to `/seller/index.html`. No build step and no runtime dependencies. Run `node seller/seller.test.js` **from the repo root** to check it.

This is the same model as `../index.html`, asked a different question. The root file finds the buyer's maximum affordable land price. This one starts from our asking price and shows what it nets us.

Everything on the page is driven by the assumptions panel on the left and recomputes on every keystroke and slider drag. Nothing is hard-coded.

## Layout

- **Hero** (below the chart) — our ask, gross to us, net after tax, the development cost with its per-sq-ft rate, and the buyer's profit. Underneath, the plot price at which the buyer breaks even.
  - The development rate divides by the **saleable** area only, not the whole parcel. At 50% saleable it is twice the whole-parcel figure. The tile prints its own denominator so this cannot be misread.
  - The buyer's profit carries two percentages. The first is that profit over everything they spend, a plain margin with no timing in it. The second is the compounded annual return on their own cash, which is much lower because the money sits in the ground for about four years.
- **Break-even curve** (top of the page) — the most the buyer can pay us per cent, plotted against the plot price they achieve. Below the line they make money, above it they lose it. **The dot is draggable**: pull it along the line to set the assumed plot price, or focus it and use the arrow keys (Shift for a bigger step). On a mouse you can also click anywhere in the plot to jump it; on touch you must grab the dot, so the page can still be scrolled. Our ask and our floor sit as labelled tags on opposite edges to keep them apart. Three controls sit below the chart: development budget, saleable layout land and their loan interest. Each prints the number behind it as a live hint — the budget as rupees per sq ft of layout land against the brief's ₹350, the share as saleable cents, sq ft and plot count, the rate as which borrowings it applies to (or that it is inert at zero debt). Those three live **only** there and deliberately do not appear in the left panel, so there is exactly one box per assumption. `seller.test.js` asserts no id appears in both places and that every key in `META` has a control somewhere.
- **Price ladder** — one row per asking price (default ₹80k / ₹1L / ₹1.1L / ₹1.2L / ₹1.5L, editable in the text box). Click a row to make it the ask.
- **Matrix** — every ask against plot prices from ₹2.5 L to ₹5 L, coloured by the buyer's margin. The outlined column is the plot price currently assumed.
- **Our money** — the tax working, plus net per cent and per acre.
- **Their model, in full** — collapsed. Cost waterfall, cumulative cash chart, sell-out against interest, monthly flows and conventions, unchanged from the root file.

## No assumed target return

Nothing on this page assumes what return the buyer wants. There is no hurdle input and no IRR target. Two things replace it:

- **Plots to break even** — the plot price at which their profit is exactly zero, after land, stamp duty, development, brokerage and interest. Each row solves for its own ask. The curve section inverts the same solver: land price for a given plot price. Below this price they lose money outright; the cell's tooltip says how far our assumed plot price sits above it.
- **Their margin** — profit over everything they spend. The verdict chip and both heatmaps band on this: above 25% comfortable, above 12% workable, positive but below that thin, otherwise a loss. Those bands are a judgement about what a developer will tolerate, not a solved number — change `BANDS` in the page source to move them.

## The two numbers that matter

Our net is linear in the ask and independent of every buyer assumption: at 14.95% on a zero basis, each ₹10,000 per cent is ₹1.334 cr gross and ₹1.134 cr net. Nothing the buyer does changes it.

Their side moves with one number, the plot price. Each ₹1 we add to the land price lifts the plot price they must clear by about ₹2.04 — roughly one over the saleable share, grossed up for stamp duty and brokerage. The page computes this lever live rather than hard-coding it.

## The input panel

Rupee amounts and the parcel area are text boxes showing Indian separators (`3,00,00,000`), because `<input type="number">` cannot display grouping. They accept digits with or without commas, reformat on blur so separators never fight the caret while typing, and keep the arrow-key nudge that a number box would give for free. Percentages, months and plot size stay plain number boxes. The ladder's price list is deliberately ungrouped — commas are its separator there.

## Keeping the drag smooth

A naive redraw cost 482 ms a frame, almost all of it the 37 break-even solves behind the line. Two things fixed it:

- **The curve does not depend on the plot price**, so dragging the marker must not rebuild it. `curvePoints` caches on a signature of exactly the inputs that move the line, and `evenPlot` caches the break-even plot price per ask. Change any of those inputs and both drop.
- **`fastLand` and `fastPlot` replace the bisection with a secant.** Profit is very nearly linear in either price, so the root falls out in a handful of model calls where `bisect` needs eighty-odd. They fall back to `bisect` if they fail to converge, and the tests assert they agree with it to under a rupee across the whole plotted range, with debt on and off.

That leaves about 24 ms a frame while dragging and 45 ms when a filter changes the line. The x-axis is deliberately fixed at ₹1.5 L to ₹6 L so the ground does not move under the marker.

## Interest and debt

The loan rate defaults to 10% a year, but **debt shares default to 0%, so the rate changes nothing** until `landDebt` or `devDebt` is set. The curve note says so on the page rather than letting the input look live when it is not. For scale: funding 60% of development at 10% moves the break-even land price by about ₹1,900 per cent, roughly ₹25 L across the parcel. Financing is a rounding error next to the plot price.

## Saving, and why it once hid new defaults

Save writes the assumptions and the ladder rungs to this browser's local storage, and the page picks them up automatically next time it opens. Reset returns to the defaults and clears the saved copy.

That auto-load had a trap, and it bit once: a snapshot saved under the old defaults kept loading over newly shipped ones, so the page looked like the defaults had never been changed. Every save now carries `STAMP`, a serialisation of `SELLER_DEFAULTS`. If the shipped defaults have moved on, the snapshot is **not** auto-loaded; the status line offers it and the Load button still restores it, saying it predates the change. Change a default and stale snapshots stand down on their own, with no key to bump by hand.

## Validation

Defaults: 1,334 cents, ask ₹1,00,000, floor ₹80,000, plots ₹3,30,000 per layout cent, development ₹9 cr, 54% saleable, sales from month 12 over 24 months, 10% loan rate, zero cost basis, no debt.

At those defaults: gross ₹13.34 cr, tax ₹1.99433 cr, net to us ₹11.34567 cr. Saleable area 720.36 cents (3,13,789 sq ft), development ₹287 per saleable sq ft. Break-even land price ₹98,863 per cent, so our ₹1,00,000 ask sits just above the line and the buyer is marginally under water. Our ask needs plots at ₹3,32,314; our ₹80,000 floor needs ₹2,91,612.

Break-even land price along the curve, at 54% saleable, ₹9 cr development, a 24-month sell-out and no debt:

| Plot price per layout cent | They can pay | Gross to us | Net after tax |
| --- | --- | --- | --- |
| ₹2.50 L | ₹59,553 | ₹7.94 cr | ₹6.76 cr |
| ₹3.00 L | ₹84,122 | ₹11.22 cr | ₹9.54 cr |
| ₹3.30 L | ₹98,863 | ₹13.19 cr | ₹11.22 cr |
| ₹3.50 L | ₹1,08,690 | ₹14.50 cr | ₹12.33 cr |
| ₹4.00 L | ₹1,33,259 | ₹17.78 cr | ₹15.12 cr |

The line is almost straight because with no debt the model is linear: break-even land price is `(saleable x plot price x 0.97 - development) / (area x 1.066)`. It bends only once financing is switched on.

The cost basis is fixed at zero and has no input control, so the tax is always 14.95% of the gross. Restore the `basis` field in `fields` if that ever changes.

## Known inconsistency in the brief's defaults

The default ₹9 cr budget is ₹287 per saleable sq ft, against the ₹350 the brief states as expected. At ₹350 the budget would be ₹10.98 cr, about ₹2 cr more cost, which lands directly on what the buyer can pay us. The hero tile prints the implied rate against its own denominator so it is visible at a glance. Settle this number before trusting any verdict on the ladder.

## Keeping the model in sync

`seller/index.html` carries a byte-identical copy of the `<script id="model">` block from `../index.html`. `seller.test.js` asserts they match, so editing the model in one file without the other fails the test. To re-sync after changing the root model, copy that block across.

## On mobile

The layout stacks below 820px in the order chart, hero, assumptions, then everything else. The chart and the hero are grid siblings of the panel rather than children of `main`, which is what makes that reordering possible. Wide tables scroll sideways with the asking-price column pinned in place.

**The chart measures itself.** A fixed 900-unit viewBox scaled into a 360px phone shrinks every label to about 5px, so `curveBox()` reads the element's real pixel box each draw and sets the viewBox to match: one user unit is one CSS pixel, and 13px means 13px. Below 560px it also narrows the gutters, drops to four x ticks, shortens the axis titles and tags, abbreviates the y axis to `69k` rather than a full figure, moves the marker's read-off just inside the plot where there is room for it, and grows the dot's hit area to a 30px radius. A debounced `resize` and `orientationchange` listener redraws it, because the geometry is measured rather than fixed.

**Touch, on both Android and iOS.** Pointer events drive the drag. A finger landing away from the dot does **not** start one, so the page still scrolls past the chart; if it lifts without travelling 10px it is treated as a tap and sets the price. A drag from the dot adds a non-passive `touchmove` that calls `preventDefault`, because iOS Safari does not reliably honour `touch-action` on SVG children and would otherwise scroll the page out from under the finger. That guard is released the moment the drag ends. All six of those behaviours are checked in `seller.test.js`.

## Hosting

Published by GitHub Pages from `main` at the repository root:

- <https://anupmm.github.io/moodbidri-land-deal/> — the buyer-side modeler
- <https://anupmm.github.io/moodbidri-land-deal/seller/> — this page

Pushing to `main` redeploys; the build takes a minute or two. There is no build step, so the files are served exactly as committed. `prompt.md` is gitignored because it carries the current offer and target prices.

`.openai/hosting.json` still points at `dist/`, which is gitignored and unused by Pages.
