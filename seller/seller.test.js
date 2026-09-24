// Run from the repo root: node seller/seller.test.js
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=fs.readFileSync('index.html','utf8'),html=fs.readFileSync('seller/index.html','utf8');
const MODEL=/<script id="model">([\s\S]*?)<\/script>/;
const close=(a,b,t=1e-5)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
const panelOpenCheck=h=>/<details class="group" (?!open)/.test(h);

// The seller view must carry the same model as the root modeler, character for character.
assert.equal(html.match(MODEL)[1],root.match(MODEL)[1],'seller/index.html model block has drifted from index.html');

// Tag counts can balance while the nesting is wrong: a stray </div> once closed div.layout
// early, throwing the chart, the panel and main out of the page grid while 36 opens still
// matched 36 closes. So check the nesting, and that the grid still contains its four children.
{
 const VOID=new Set(['input','br','img','meta','link','hr','source','col','area']);
 const body=html.slice(html.indexOf('<body>'))
  .replace(/<script[\s\S]*?<\/script>/g,'').replace(/<style[\s\S]*?<\/style>/g,'').replace(/<!--[\s\S]*?-->/g,'');
 const stack=[];
 for(const m of body.matchAll(/<(\/?)([a-zA-Z][a-zA-Z0-9-]*)\b([^>]*?)(\/?)>/g)){
  const close=m[1],tag=m[2].toLowerCase();
  if(VOID.has(tag)||m[4])continue;
  if(!close){stack.push(tag);continue}
  if(tag==='html')continue;
  const top=stack.pop();
  assert.equal(top,tag,`</${tag}> closes <${top}> near: ${body.slice(Math.max(0,m.index-70),m.index+12).replace(/\s+/g,' ')}`);
 }
 assert.deepEqual(stack.filter(t=>t!=='html'),[],'unclosed tags: '+stack.join(', '));
 const start=body.indexOf('<div class="layout">');
 assert.ok(start>0,'div.layout is missing');
 let depth=0,end=-1;
 for(const m of body.slice(start).matchAll(/<(\/?)div\b[^>]*>/g)){
  depth+=m[1]?-1:1;
  if(depth===0){end=start+m.index;break}
 }
 assert.ok(end>start,'div.layout never closes');
 for(const child of['curve-panel','class="hero"','<aside>','<main>']){
  const at=body.indexOf(child);
  assert.ok(at>start&&at<end,`${child} escaped div.layout, so the page grid will not lay it out`);
 }
}

// The mobile layout once collapsed to 44% of the screen, with iOS zooming the whole page
// out to fit. Two things combined: .layout carries align-items:start for the desktop grid,
// and the mobile rule switches it to a column flex container without resetting that, so
// every section shrink-wrapped to its content; and the chart is an <svg> with a viewBox and
// a fixed height, which reports an intrinsic width from its aspect ratio, 795pt here. The
// section grew to fit it and the document went wider than the screen.
{
 const css=html.slice(html.indexOf('<style>'),html.indexOf('</style>'));
 const mobile=css.slice(css.indexOf('@media(max-width:820px)'));
 const layout=mobile.match(/\.layout\{([^}]*)\}/);
 assert.ok(layout,'the mobile layout rule went missing');
 assert.ok(/display:flex/.test(layout[1]),'the mobile layout should be a flex column');
 assert.ok(/align-items:stretch/.test(layout[1]),
  'a column flex .layout must reset align-items, or every section shrink-wraps to its content');
 // Belt and braces: out of flow, the chart cannot drive its container whatever the layout does.
 assert.match(css,/\.curve-wrap\{position:relative/,'the chart needs a positioned wrapper');
 assert.match(css,/\.curve\{position:absolute/,'the chart must be out of flow so it cannot size its parent');
 assert.match(html,/<div class="curve-wrap"><svg id="curve"/,'the chart should sit inside its wrapper');
 // A fixed height on an in-flow viewBox svg is the shape of the bug; make sure it is gone.
 assert.ok(!/\.curve\{[^}]*height:\d+px/.test(css),'height belongs on the wrapper, not the in-flow svg');
}

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
const PAGE={...D,landPrice:100000,plotPrice:330000,dev:90000000,share:54,interest:10,salesStart:12,salesMonths:24};
close(calculate({...PAGE,landPrice:breakEvenLand(PAGE)}).profit,0,.1);
close(breakEvenLand({...PAGE,plotPrice:breakEvenPlot(PAGE)}),PAGE.landPrice,1);
close(breakEvenLand(PAGE),98862,1);
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

// The fast secant solvers drive the chart; they must agree with the reference bisection
// everywhere on the plotted range, including with debt switched on.
{
 const ctx={};vm.createContext(ctx);
 vm.runInContext(html.match(MODEL)[1],ctx);
 ctx.document={getElementById(){return{addEventListener(){},setAttribute(){},innerHTML:'',textContent:'',value:'',type:'text',dataset:{},closest(){return null}}},addEventListener(){}};
 ctx.localStorage={setItem(){},getItem(){return null},removeItem(){}};ctx.Intl=Intl;
 ctx.setTimeout=f=>{f();return 0};ctx.clearTimeout=()=>{};ctx.requestAnimationFrame=f=>f();
 vm.runInContext([...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)][1][1],ctx);
 vm.runInContext('this.solvers={fastLand,fastPlot,breakEvenLand,breakEvenPlot,CURVE_LO,CURVE_HI}',ctx);
 const{fastLand,fastPlot,breakEvenLand,breakEvenPlot,CURVE_LO,CURVE_HI}=ctx.solvers;
 let worstLand=0,worstPlot=0;
 for(const debt of[{},{devDebt:60},{landDebt:40,devDebt:70,interest:16}]){
  for(let i=0;i<=12;i++){
   const x=CURVE_LO+(CURVE_HI-CURVE_LO)*i/12,q={...PAGE,...debt,plotPrice:x};
   const ref=breakEvenLand(q),fast=fastLand(q);
   assert.equal(ref==null,fast==null,`fastLand disagreed on feasibility at ${x}`);
   if(ref!=null)worstLand=Math.max(worstLand,Math.abs(ref-fast));
  }
  for(const ask of[60000,80000,100000,130000,180000]){
   const q={...PAGE,...debt,landPrice:ask};
   worstPlot=Math.max(worstPlot,Math.abs(breakEvenPlot(q)-fastPlot(q)));
  }
 }
 assert.ok(worstLand<1,`fastLand drifted from bisect by ${worstLand}`);
 assert.ok(worstPlot<1,`fastPlot drifted from bisect by ${worstPlot}`);
 console.log('Fast solvers agree with bisect: land within '+worstLand.toFixed(4)+', plot within '+worstPlot.toFixed(4)+' rupees.');
}

// Smoke-render the UI against a DOM stub so template and id typos fail here, not in the browser.
const nodes=new Map(),store=new Map();
const node=()=>({addEventListener(){},setAttribute(k,v){this[k]=v},getBoundingClientRect(){return{left:0,width:900,height:430}},setPointerCapture(){},querySelector(){return{focus(){}}},classList:{add(){},remove(){}},innerHTML:'',textContent:'',value:'',type:'text',dataset:{},closest(){return null}});
context.document={getElementById(id){if(!nodes.has(id))nodes.set(id,node());return nodes.get(id)},addEventListener(){}};
context.localStorage={setItem:(k,v)=>store.set(k,v),getItem:k=>store.has(k)?store.get(k):null,removeItem:k=>store.delete(k)};
context.setTimeout=setTimeout;context.clearTimeout=clearTimeout;context.Intl=Intl;
context.requestAnimationFrame=f=>f();context.addEventListener=()=>{};
vm.runInContext([...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)][1][1],context);
for(const id of['h-ask','h-gross','h-net','h-dev','h-profit','h-foot','curve','curve-note','ladder','lever','matrix','seller-detail','tds','waterfall','flows','heat2','chart','buyer','returns'])
  assert.ok(nodes.get(id)&&(nodes.get(id).innerHTML||nodes.get(id).textContent),`#${id} rendered empty`);
assert.match(nodes.get('h-ask').textContent,/1,00,000/);
assert.match(nodes.get('h-gross').textContent,/13\.34 cr/);
assert.ok(!panelOpenCheck(nodes.get('inputs').innerHTML),'every assumption group should render open');
assert.match(nodes.get('h-net').textContent,/11\.35 cr/);
assert.match(nodes.get('h-net-sub').textContent,/1.99 cr tax, 14.9% of the sale/);
// The development rate must divide by saleable area only, never the whole parcel.
assert.match(nodes.get('h-dev-sub').textContent,/₹287 per sq ft across the 720 saleable cents/);
assert.match(nodes.get('h-profit-sub').textContent,/on the .* they spend, earned over 3.0 years/);
assert.match(nodes.get('h-foot').textContent,/break even at .* per layout cent/);
assert.match(nodes.get('ladder').innerHTML,/data-price="150000"/);
assert.match(nodes.get('ladder').innerHTML,/floor<\/span>/);
assert.match(nodes.get('lever').innerHTML,/The lever/);
const curve=nodes.get('curve').innerHTML;
assert.match(curve,/<polyline[^>]*stroke="#16704e"/,'the break-even line should be drawn');
// Axes flipped: profit is now the region ABOVE the line, so the shading swaps.
assert.equal((curve.match(/<polygon/g)||[]).length,1,'the loss region should be shaded under the line');
assert.match(curve,/<rect [^>]*fill="#e3f3ea"/,'the profit region should be the background above it');
assert.match(curve,/<polygon [^>]*fill="#fbeaea"/,'under the line they lose money');
assert.match(curve,/id="curve-handle"[^>]*role="slider"/,'the marker should be an accessible slider');
// One draggable marker and nothing else: no ask or floor rules competing with it.
assert.ok(!/our ask|our floor|ask .{0,3}1,00,000|floor .{0,3}80,000/.test(curve),'the chart should carry no ask or floor labels');
assert.equal((curve.match(/stroke-dasharray/g)||[]).length,2,'only the marker crosshair should be dashed');
// Axis titles centred on their axes, with icons big enough to read.
assert.equal((curve.match(/<tspan font-size="21">/g)||[]).length,2,'both axis titles need an enlarged icon');
assert.match(curve,/<\/tspan> What we ask, /);
assert.match(curve,/<\/tspan> Plot price they must achieve/);
const xt=curve.match(/<text x="([\d.]+)" y="[\d.]+" text-anchor="middle"[^>]*><tspan/);
assert.ok(xt,'the x axis title should be middle-anchored');
assert.ok(Math.abs(+xt[1]-(104+(900-26))/2)<1,`x title at ${xt[1]} is not centred on the plot`);
assert.match(curve,/rotate\(-90\)" text-anchor="middle"/,'the y axis title should be middle-anchored too');
assert.match(nodes.get('curve-note').textContent,/they need plots at .* per layout cent/);
assert.match(nodes.get('curve-note').textContent,/50% of the land and 50% of development are borrowed at 10% a year/,'the note should name the borrowings');
assert.equal(nodes.get('warnings'),undefined,'the warning banners were removed; nothing should render into #warnings');
// Rupee and area boxes carry Indian separators; everything else stays a plain number box.
const panel=nodes.get('inputs').innerHTML;
for(const[k,v]of[['landPrice','1,00,000'],['floor','80,000'],['plotPrice','3,30,000'],['area','1,334']])
  assert.ok(panel.includes(`<input id="${k}" type="text" inputmode="numeric" autocomplete="off" value="${v}"`),`${k} should be a grouped text box showing ${v}`);
for(const k of['tax','salesMonths','devDebt'])
  assert.ok(panel.includes(`<input id="${k}" type="number"`),`${k} should stay a plain number box`);
// Exactly one control per assumption: the chart's three must not also appear in the panel.
for(const k of['dev','share','interest'])
  assert.ok(!panel.includes(`id="${k}"`),`${k} is duplicated in the left panel; it belongs only above the chart`);
assert.equal(nodes.get('f-dev').value,'9,00,00,000','the chart filter should show the 9 cr default');
assert.equal(nodes.get('f-share').value,'54');
assert.equal(nodes.get('f-interest').value,'10');
// Each chart control spells out the number behind it, and the hints are live, not build-time.
assert.match(nodes.get('f-dev-hint').textContent,/₹287 per sq ft of layout land/);
assert.match(nodes.get('f-share-hint').textContent,/720 saleable cents of 1,334 · 3,13,789 sq ft/);
assert.match(nodes.get('f-interest-hint').textContent,/On 50% of land and 50% of development/);
vm.runInContext('state.dev=120000000;state.share=45;state.devDebt=60;render()',context);
assert.match(nodes.get('f-dev-hint').textContent,/₹459 per sq ft/,'the development hint must follow the input');
assert.match(nodes.get('f-share-hint').textContent,/600 saleable cents/,'the saleable hint must follow the input');
assert.match(nodes.get('f-interest-hint').textContent,/60% of development/,'the interest hint must notice debt');
vm.runInContext('state.dev=90000000;state.share=54;state.devDebt=50;render()',context);
// The chart matches its viewBox to the measured pixel box, or phone labels shrink to ~5px.
assert.equal(nodes.get('curve').viewBox,'0 0 900 430','the viewBox must track the measured size');
// A snapshot saved under different defaults must not silently mask the shipped ones.
nodes.get('save').onclick();assert.ok(store.get('moodbidri-seller-v1'),'save wrote nothing');
const snap=JSON.parse(store.get('moodbidri-seller-v1'));
assert.ok(snap.stamp,'a save must carry the defaults stamp');
assert.equal(snap.state.dev,90000000);
assert.equal(snap.state.salesStart,12);
assert.equal(snap.state.salesMonths,24);
assert.equal(snap.state.landDebt,50);
assert.equal(snap.state.devDebt,50);
nodes.get('load').onclick();assert.match(nodes.get('status').textContent,/reloaded/);
nodes.get('reset').onclick();assert.match(nodes.get('status').textContent,/cleared/);
assert.equal(store.get('moodbidri-seller-v1'),undefined,'reset must clear the saved entry');
store.set('moodbidri-seller-v1',JSON.stringify({...snap,stamp:'older defaults',state:{...snap.state,dev:30000000,salesMonths:36}}));
nodes.get('load').onclick();
assert.match(nodes.get('status').textContent,/saved before the defaults changed/,'a stale snapshot must say so when loaded');

console.log('UI render, ladder, hero and storage smoke checks passed.');
