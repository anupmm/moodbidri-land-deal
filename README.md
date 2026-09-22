# Moodbidri land deal modeler

Open `index.html` directly in a browser. It has no runtime dependencies. Run `node model.test.js` to check the pure functions extracted from its model script.

The default parcel is **1,334 cents (13.34 acres)**. At ₹80,000 per cent, zero debt and the other defaults, total buyer cost is ₹14.976652 crore, profit is ₹5.033348 crore, and annual IRR is 14.156%. At ₹1,00,000 per cent, cost is ₹17.82074 crore, profit is ₹2.18926 crore, and IRR is 5.299%. Plot prices for the 20% hurdle are approximately ₹3.350 lakh and ₹4.029 lakh per cent respectively. The default maximum land price is approximately ₹69,711 per cent.

These replace the brief's older area-based validation amounts. IRRs differ from the brief's rounded examples by less than 0.3 percentage points. Spending is in months 3–14 and sales in months 12–47. The seller at ₹1 lakh per cent has gross proceeds ₹13.34 crore, modeled tax ₹1.99433 crore and net proceeds ₹11.34567 crore.

Monthly interest is capitalized on opening debt; sales net of brokerage repay debt first. Debt remaining at the end is settled by equity. Hurdle solvers use equity NPV at the target annual rate, which avoids repeated IRR solving. IRR is shown only for cash flows with a single sign change. Approval duration produces schedule warnings rather than shifting dates silently. All scenarios and their settings are saved only in browser localStorage.

For hosting, copy index.html into dist/index.html. No compilation is needed. The Sites static manifest points to dist.
