// Run from the repo root: node seller/seller.test.js
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=fs.readFileSync('index.html','utf8'),html=fs.readFileSync('seller/index.html','utf8');
const MODEL=/<script id="model">([\s\S]*?)<\/script>/;
const close=(a,b,t=1e-5)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
const panelOpenCheck=h=>/<details class="group" (?!open)/.test(h);

// The seller view must carry the same model as the root modeler, character for character.
assert.equal(html.match(MODEL)[1],root.match(MODEL)[1],'seller/index.html model block has drifted from index.html');

const context={};vm.createContext(context);
vm.runInContext(html.match(MODEL)[1]+'\nthis.api={DEFAULTS,calculate,solve,npv,irr,bisect};',context);
const{DEFAULTS:D,calculate,npv,bisect}=context.api;
const breakEvenPlot=p=>bisect(x=>calculate({...p,plotPrice:x},false).profit,true);
const breakEvenLand=p=>bisect(x=>calculate({...p,landPrice:x},false).profit,false);

// Seller proceeds are linear in the ask and independent of every buyer assumption.
const atFloor=calculate({...D,landPrice:80000});
close(atFloor.land,106720000);close(atFloor.tax,15954640);close(atFloor.net,90765360);
for(const price of[80000,100000,110000,120000,150000]){
  const r=calculate({...D,landPrice:price});
  close(r.land,1334*price);close(r.net,1334*price*(1-D.tax/100),1e-6);
  close(r.net,calculate({...D,landPrice:price,plotPrice:500000,interest:18,salesMonths:60}).net,1e-6);
}
close(calculate({...D,landPrice:90000}).net-atFloor.net,1334*10000*(1-D.tax/100),1e-6);
close(calculate({...D,landPrice:200000000/1334,basis:200000000}).tax,0);

// Every rupee of ask lifts the price they must clear by about 3.4; the ladder's headline claim.
const need=breakEvenPlot({...D,landPrice:100000});
const lever=(breakEvenPlot({...D,landPrice:110000})-need)/10000;
assert.ok(lever>2.0&&lever<2.6,`lever ${lever} outside 2.0-2.6`);

// Break-even carries no target return in it at all.
close(calculate({...D,landPrice:100000,plotPrice:need}).profit,0,.1);
assert.equal(need,breakEvenPlot({...D,landPrice:100000,hurdle:8}),'break-even must not move with the hurdle');
assert.ok(!/state\.hurdle|p\.hurdle/.test(html.split('</script>')[1]),'the UI must not read the hurdle anywhere');
// Pin the denominator: at 50% saleable the rate is twice the whole-parcel figure.
const half=calculate({...D,dev:60000000,share:50}),full=calculate({...D,dev:60000000,share:100});
close(60000000/(half.saleable*435.6),206.51,.01);
close(60000000/(full.saleable*435.6),103.25,.01);
close(calculate({...D,dev:60000000,share:54}).saleable*435.6,313788.8,.1);
// The curve is the ladder's solver read the other way round, so the two must agree.
const PAGE={...D,landPrice:100000,plotPrice:330000,dev:80000000,share:54,interest:10};
close(calculate({...PAGE,landPrice:breakEvenLand(PAGE)}).profit,0,.1);
close(breakEvenLand({...PAGE,plotPrice:breakEvenPlot(PAGE)}),PAGE.landPrice,1);
close(breakEvenLand(PAGE),105895,1);
// Rising plot prices must raise what they can pay, monotonically.
let last=-1;
for(const x of[200000,250000,300000,350000,400000,450000,500000]){
  const y=breakEvenLand({...PAGE,plotPrice:x});
  assert.ok(y>last,`break-even land must rise with plot price, broke at ${x}`);last=y;
}
// With no debt the interest rate cannot move the line.
close(breakEvenLand(PAGE),breakEvenLand({...PAGE,interest:18}),1e-6);
assert.ok(breakEvenLand({...PAGE,devDebt:60,interest:18})<breakEvenLand({...PAGE,devDebt:60,interest:8}),'with debt, dearer money must lower what they can pay');

console.log('Seller model checks passed. Lever = '+lever.toFixed(2)+'x, break-even at a 1L ask = '+Math.round(need));

// Smoke-render the UI against a DOM stub so template and id typos fail here, not in the browser.
const nodes=new Map(),store=new Map();
const node=()=>({addEventListener(){},innerHTML:'',textContent:'',value:'',dataset:{},closest(){return null}});
context.document={getElementById(id){if(!nodes.has(id))nodes.set(id,node());return nodes.get(id)},addEventListener(){}};
context.localStorage={setItem:(k,v)=>store.set(k,v),getItem:k=>store.has(k)?store.get(k):null,removeItem:k=>store.delete(k)};
context.setTimeout=setTimeout;context.clearTimeout=clearTimeout;context.Intl=Intl;
vm.runInContext([...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)][1][1],context);
for(const id of['h-ask','h-gross','h-net','h-dev','h-profit','h-foot','curve','curve-note','ladder','lever','matrix','seller-detail','tds','waterfall','flows','heat2','chart','buyer','returns'])
  assert.ok(nodes.get(id)&&(nodes.get(id).innerHTML||nodes.get(id).textContent),`#${id} rendered empty`);
assert.match(nodes.get('h-ask').textContent,/1,00,000/);
assert.match(nodes.get('h-gross').textContent,/13\.34 cr/);
assert.ok(!panelOpenCheck(nodes.get('inputs').innerHTML),'every assumption group should render open');
assert.match(nodes.get('h-net').textContent,/11\.35 cr/);
assert.match(nodes.get('h-net-sub').textContent,/1.99 cr tax, 14.9% of the sale/);
// The development rate must divide by saleable area only, never the whole parcel.
assert.match(nodes.get('h-dev-sub').textContent,/₹255 per sq ft across the 720 saleable cents/);
assert.match(nodes.get('h-profit-sub').textContent,/on the .* they spend, earned over 4\.0 years/);
assert.match(nodes.get('h-foot').textContent,/break even at .* per layout cent/);
assert.match(nodes.get('ladder').innerHTML,/data-price="150000"/);
assert.match(nodes.get('ladder').innerHTML,/floor<\/span>/);
assert.match(nodes.get('lever').innerHTML,/The lever/);
const curve=nodes.get('curve').innerHTML;
assert.match(curve,/<polyline[^>]*stroke="#16704e"/,'the break-even line should be drawn');
assert.equal((curve.match(/<polygon/g)||[]).length,2,'profit and loss regions should both be shaded');
assert.match(nodes.get('curve-note').textContent,/they break even at .*per cent/);
assert.match(nodes.get('curve-note').textContent,/Debt is set to 0%/,'the note must say the interest rate is inert at zero debt');
assert.equal(nodes.get('warnings'),undefined,'the warning banners were removed; nothing should render into #warnings');
// Rupee and area boxes carry Indian separators; everything else stays a plain number box.
const panel=nodes.get('inputs').innerHTML;
for(const[k,v]of[['landPrice','1,00,000'],['floor','80,000'],['plotPrice','3,30,000'],['dev','8,00,00,000'],['area','1,334']])
  assert.ok(panel.includes(`<input id="${k}" type="text" inputmode="numeric" autocomplete="off" value="${v}"`),`${k} should be a grouped text box showing ${v}`);
for(const k of['tax','share','salesMonths','interest'])
  assert.ok(panel.includes(`<input id="${k}" type="number"`),`${k} should stay a plain number box`);
nodes.get('save').onclick();assert.ok(store.get('moodbidri-seller-v1'),'save wrote nothing');
nodes.get('load').onclick();assert.match(nodes.get('status').textContent,/reloaded/);
nodes.get('reset').onclick();assert.match(nodes.get('status').textContent,/cleared/);
assert.equal(store.get('moodbidri-seller-v1'),undefined,'reset must clear the saved entry');
console.log('UI render, ladder, hero and storage smoke checks passed.');
