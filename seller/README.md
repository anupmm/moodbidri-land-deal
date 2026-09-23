# Seller's view

Open `seller/index.html` in a browser, or serve the repo and go to `/seller/index.html`. No build step and no runtime dependencies. Run `node seller/seller.test.js` **from the repo root** to check it.

This is the same model as `../index.html`, asked a different question. The root file finds the buyer's maximum affordable land price. This one starts from our asking price and shows what it nets us.

Everything on the page is driven by the assumptions panel on the left and recomputes on every keystroke and slider drag. Nothing is hard-coded.

## Layout

- **Hero** — our ask, gross to us, net after tax, the development cost with its per-sq-ft rate, and the buyer's profit. Underneath, the plot price at which the buyer breaks even.
  - The development rate divides by the **saleable** area only, not the whole parcel. At 50% saleable it is twice the whole-parcel figure. The tile prints its own denominator so this cannot be misread.
  - The buyer's profit carries two percentages. The first is that profit over everything they spend, a plain margin with no timing in it. The second is the compounded annual return on their own cash, which is much lower because the money sits in the ground for about four years. ₹2.14 cr on ₹20.91 cr is 10.2% total, but only 4.6% a year.
- **Price ladder** — one row per asking price (default ₹80k / ₹1L / ₹1.1L / ₹1.2L / ₹1.5L, editable in the text box). Click a row to make it the ask.
- **Matrix** — every ask against plot prices from ₹2.5 L to ₹5 L, coloured by the buyer's return. The outlined column is the plot price currently assumed.
- **Our money** — the tax working, plus net per cent and per acre.
- **Their model, in full** — collapsed. Cost waterfall, cumulative cash chart, sell-out against interest, monthly flows and conventions, unchanged from the root file.

## The two solver columns in the ladder

These answer different questions and only one of them involves a target return.

- **Plots to break even** — the plot price at which the buyer's profit is exactly zero, after land, stamp duty, development, brokerage and interest. It carries no assumption about what return they want. Below this price they lose money outright.
- **Plots for their target** — the plot price at which the discounted value of their equity cash flows is zero at the hurdle rate in the left panel (20% by default). This moves when the hurdle moves. Lower the hurdle and the number drops.

Neither is solved against the ₹80,000 floor or any other asking price. Each row solves for its own ask.

## The two numbers that matter

Our net is linear in the ask and independent of every buyer assumption: at 14.95% on a zero basis, each ₹10,000 per cent is ₹1.334 cr gross and ₹1.134 cr net. Nothing the buyer does changes it.

Their side moves with one number, the plot price. Each ₹1 we add to the land price needs about ₹3.4 more on their plot price — the page computes this lever live rather than hard-coding it.

## The input panel

Rupee amounts and the parcel area are text boxes showing Indian separators (`3,00,00,000`), because `<input type="number">` cannot display grouping. They accept digits with or without commas, reformat on blur so separators never fight the caret while typing, and keep the arrow-key nudge that a number box would give for free. Percentages, months and plot size stay plain number boxes. The ladder's price list is deliberately ungrouped — commas are its separator there.

## Saving

Save writes the assumptions and the ladder rungs to this browser's local storage, and the page picks them up automatically the next time it opens. Load re-reads them if you have since changed things. Reset returns to the defaults and clears the saved copy, so the page opens clean afterwards. It is per-browser and per-machine; nothing leaves the computer.

## Validation

At the defaults (1,334 cents, ask ₹1,00,000, plots ₹3.20 L per layout cent, development ₹3 cr, zero cost basis, 20% hurdle, no debt): gross ₹13.34 cr, tax ₹1.99433 cr, net to us ₹11.34567 cr, buyer profit ₹3.48 cr at 8.3% a year, break-even plot price ₹2,66,162 and ₹4,02,934 for the 20% target, lever 3.40×.

At an ask of ₹85,000: gross ₹11.34 cr, tax ₹1.70 cr, net ₹9.64 cr, buyer profit ₹5.62 cr at 14.9% a year.

The cost basis is fixed at zero and has no input control, so the tax is always 14.95% of the gross. Restore the `basis` field in `fields` if that ever changes.

## Known inconsistency in the brief's defaults

The ₹3 cr development budget works out to ₹103 per saleable sq ft, against the ₹350 the brief states as expected. At ₹350 the budget would be ₹10.17 cr and the buyer's profit at an ₹85,000 ask would fall from ₹5.62 cr to a loss of ₹1.55 cr. The page warns when the implied rate falls outside ₹250–450. Settle this number before trusting any verdict on the ladder.

## Keeping the model in sync

`seller/index.html` carries a byte-identical copy of the `<script id="model">` block from `../index.html`. `seller.test.js` asserts they match, so editing the model in one file without the other fails the test. To re-sync after changing the root model, copy that block across.

## Hosting

`.openai/hosting.json` points at `dist/`, which is gitignored. Copy `seller/index.html` to `dist/seller/index.html` to publish it alongside the root modeler.
