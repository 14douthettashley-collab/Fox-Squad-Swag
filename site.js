
const ORDER_INFO_CSV = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTBI4Te1WGcp3yxE5ouCJ-BrGTUKbqpj_QqP3x6hn6t7_FsFPkKNkTQJVZOPb7PGgdeDa8a9fVKg88J/pub?gid=771234244&single=true&output=csv";
function orderDate(value){
 const v=String(value||"").trim();if(!v)return null;
 const date=/^\d{4}-\d\d-\d\d$/.test(v)?new Date(v+"T00:00:00"):new Date(v);
 return Number.isNaN(date.getTime())?null:date;
}
function orderInfoTable(text){
 // Preserve blank rows: ORDER INFO is addressed by spreadsheet row number.
 const rows=[];let row=[],cell="",quoted=false;
 text=String(text||"").replace(/^\uFEFF/,"");
 for(let i=0;i<text.length;i++){
  const ch=text[i];
  if(ch==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}
  else if(ch===','&&!quoted){row.push(cell);cell="";}
  else if((ch==='\n'||ch==='\r')&&!quoted){
   if(ch==='\r'&&text[i+1]==='\n')i++;
   row.push(cell);rows.push(row);row=[];cell="";
  }else cell+=ch;
 }
 if(cell!==""||row.length){row.push(cell);rows.push(row);}
 return rows;
}
function orderStatusMarkup(status,rows){
 const cell=(r,c)=>rows[r-1]?.[c-1]||"";
 const message=cell(5,2),start=orderDate(cell(3,2)),end=orderDate(cell(4,2)),eta=orderDate(cell(6,2)),contact=cell(7,2);
 const players=rows.slice(3).filter(r=>r[4]&&r[4]!=="ALL ORDERS").map(r=>({name:r[4],paid:/^(true|yes|paid)$/i.test(r[9]||""),items:Number(r[5]||0)}));
 const totalItems=Number(cell(3,6)||0);
 const tags=names=>'<div class="order-name-list">'+names.map(n=>'<span class="order-name-tag">'+escapeHTML(n)+'</span>').join('')+'</div>';
 const dateFmt=d=>d?d.toLocaleDateString("en-US",{month:"short",day:"2-digit"}):"";
 const dates=start&&end?'<p class="order-date-range">'+dateFmt(start)+' – '+dateFmt(end)+'</p>':"";
 if(status==="Now Taking Orders"||status==="Team Orders Open"){
  const target=end?new Date(end.getFullYear(),end.getMonth(),end.getDate()+1):null;
  const received=players.filter(p=>p.items>0);
  return '<div class="open-status">'+dates+
   '<p class="open-countdown-label">ORDER WINDOW CLOSES IN</p>'+
   '<div class="order-clock" data-deadline="'+(target?target.getTime():"")+'"><div><strong data-days>--</strong><small>DAYS</small></div><div><strong data-hours>--</strong><small>HRS</small></div><div><strong data-minutes>--</strong><small>MINS</small></div></div>'+
   '<div class="order-names open-orders"><h2>ORDERS RECEIVED</h2>'+
   (received.length?tags(received.map(p=>p.name)):'<p class="open-empty">Be the first to place your order!</p>')+'</div></div>';
 }
 if(status==="Orders Closed"||status==="Team Orders Closed"){const closedMessage=cell(10,2)||"Team orders are currently closed. Check back for the next round!";const nextOrder=cell(8,2);return '<div class="closed-status"><p class="closed-eyebrow">'+escapeHTML(cell(9,2)||"STILL WANT SWAG?")+'</p><p class="order-message">'+escapeHTML(closedMessage).replace(/\n/g,"<br>")+'</p>'+(nextOrder?'<p class="closed-next-order"><span>NEXT PLANNED TEAM ORDER</span><strong>'+escapeHTML(nextOrder)+'</strong></p>':"")+'</div>';}
 if(status==="Collecting Payments"){
  const unpaid=players.filter(p=>!p.paid).map(p=>p.name);
  return '<p class="order-message">'+escapeHTML(message||"Want your swag faster? Go remind these players!")+'</p><div class="order-names"><h2>AWAITING PAYMENT</h2><p>'+unpaid.length+' PLAYERS</p>'+(unpaid.length?tags(unpaid):'<p>Everyone is paid up!</p>')+'</div>';
 }
 if(status==="Waiting for Invoice")return '<div class="order-symbol">⌛</div><p class="order-message">'+escapeHTML(message||"Order submitted. Waiting for the invoice.")+'</p>';
 if(status==="In Production")return '<div class="order-symbol">⚙</div><p class="order-message">'+escapeHTML(message||"Your gear is being made in Greece!")+'</p>';
 if(status==="In Transit")return '<div class="order-symbol">✈</div><p class="order-message">'+escapeHTML(message||"On its way to OKC!")+'</p>'+(eta?'<p class="order-date-range">ESTIMATED ARRIVAL: '+dateFmt(eta)+'</p>':"");
 if(status==="In OKC!")return '<div class="order-symbol">📦</div><p class="order-message">'+escapeHTML(contact?"Get with "+contact+" to arrange pickup or shipping.":message||"Your gear is in OKC! Arrange pickup or shipping.")+'</p>';
 return '<p class="order-message">'+escapeHTML(message||"Orders are currently closed.")+'</p>';
}
function updateOrderClock(){
 const clock=document.querySelector(".order-clock");if(!clock)return;
 const deadline=Number(clock.dataset.deadline);if(!deadline)return;
 const minutes=Math.max(0,Math.ceil((deadline-Date.now())/60000));
 const days=Math.floor(minutes/1440),hours=Math.floor(minutes%1440/60),mins=minutes%60;
 clock.querySelector("[data-days]").textContent=String(days).padStart(2,"0");
 clock.querySelector("[data-hours]").textContent=String(hours).padStart(2,"0");
 clock.querySelector("[data-minutes]").textContent=String(mins).padStart(2,"0");
}
async function renderOrderStatus(){
 const content=document.getElementById("orderStatusContent"),title=document.getElementById("orderStatusTitle");if(!content||!title)return;
 try{
  const response=await fetch(ORDER_INFO_CSV+"&_="+Date.now(),{cache:"no-store"});
  if(!response.ok)throw new Error("ORDER INFO tab unavailable");
  const rows=orderInfoTable(await response.text()),liveStatus=rows[1]?.[1]||"Orders Closed";
   const preview=new URLSearchParams(window.location.search).get("previewStatus");
   const status=preview==="Now Taking Orders"?"Now Taking Orders":liveStatus;
  const logo=document.getElementById("orderStatusLogo"),logoFile=String(rows[0]?.[1]||"").trim();
  if(logo&&logoFile){const filename=logoFile.split(/[\\/]/).pop();if(/\\.(png|jpe?g|webp|gif|svg)$/i.test(filename))logo.src="Images/"+encodeURIComponent(filename);}
  title.textContent=status.toUpperCase();document.querySelector(".site-hero")?.classList.toggle("orders-open",status==="Now Taking Orders"||status==="Team Orders Open");content.innerHTML=orderStatusMarkup(status,rows);
  updateOrderClock();if(window.orderClockInterval)clearInterval(window.orderClockInterval);
  window.orderClockInterval=setInterval(updateOrderClock,30000);
 }catch(err){console.warn("Order status unavailable",err);title.textContent="FOX SQUAD SWAG";content.innerHTML='<p>Order updates will appear here soon.</p>';}
}

const CATEGORY_ORDER = ["All Products", "Packs", "Jerseys & Pants", "Pants & Shorts", "Shirts & Tops", "Hoodies & Jackets", "Women's Wear", "Youth Wear", "Misc"];
function normalizeCategory(value){
 const label=String(value).trim();
 const key=label.toLowerCase().replace(/[’']/g,"'");
 const aliases={"pack":"Packs","packs":"Packs","jerseys":"Jerseys & Pants","jersey & pants":"Jerseys & Pants","jerseys & pants":"Jerseys & Pants","pants & jerseys":"Jerseys & Pants","women's apparel":"Women's Wear","womens apparel":"Women's Wear","women's wear":"Women's Wear","womens wear":"Women's Wear","youth apparel":"Youth Wear","youth wear":"Youth Wear","head gear":"Misc","headwear":"Misc","bags & accessories":"Misc","team items":"Misc","game gear":"Misc"};
 return aliases[key] || CATEGORY_ORDER.find(c=>c.toLowerCase()===key) || label;
}
function catalogLink(category){return category && category!=="All Products" ? "products.html?group="+encodeURIComponent(category):"products.html";}
function installSiteNavigation(){
 const header=document.createElement("header");header.className="site-header";
 header.innerHTML='<button class="site-menu-button" aria-label="Open menu" aria-expanded="false" aria-controls="sideMenu">☰</button><a class="site-brand" href="index.html">FOX SQUAD SWAG</a><a class="site-cart" href="cart.html" aria-label="View cart">🛒<span id="cartCount" class="cart-count"></span></a>';
 document.body.prepend(header);
 const overlay=document.createElement("div");overlay.className="site-overlay";overlay.hidden=true;
 const menu=document.createElement("nav");menu.id="sideMenu";menu.className="site-menu";menu.hidden=true;menu.setAttribute("aria-label","Main navigation");
 menu.innerHTML='<button class="menu-close" aria-label="Close menu">×</button><a href="index.html">Home</a><button class="catalog-toggle" aria-expanded="false" aria-controls="catalogDropdown">Catalog <span>▼</span></button><div id="catalogDropdown" hidden>'+CATEGORY_ORDER.map(c=>'<a class="category-link" href="'+escapeHTML(catalogLink(c))+'">'+escapeHTML(c)+'</a>').join('')+'</div><a href="cart.html">Cart</a>';
 document.body.append(overlay,menu);
 const footer=document.createElement("footer");footer.className="site-footer";footer.innerHTML='<a href="index.html">Home</a><a href="products.html">Catalog</a><a href="cart.html">Cart</a>';document.body.append(footer);
 const opener=header.querySelector('button');let previousOverflow='';
 function setMenu(open){menu.hidden=!open;overlay.hidden=!open;opener.setAttribute('aria-expanded',String(open));if(open){previousOverflow=document.body.style.overflow;document.body.style.overflow='hidden';menu.querySelector('button').focus();}else{document.body.style.overflow=previousOverflow;opener.focus();}}
 opener.onclick=()=>setMenu(true);overlay.onclick=()=>setMenu(false);menu.querySelector('.menu-close').onclick=()=>setMenu(false);
 menu.querySelector('.catalog-toggle').onclick=function(){const dropdown=menu.querySelector('#catalogDropdown');dropdown.hidden=!dropdown.hidden;this.setAttribute('aria-expanded',String(!dropdown.hidden));this.querySelector('span').textContent=dropdown.hidden?'▼':'▲';};
 document.addEventListener('keydown',e=>{if(menu.hidden)return;if(e.key==='Escape'){setMenu(false);return;}if(e.key==='Tab'){const focusable=[...menu.querySelectorAll('a,button')].filter(x=>x.getClientRects().length);const first=focusable[0],last=focusable[focusable.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}});
 updateCartCount();
}
function siteCard(product){const href='product.html?id='+encodeURIComponent(makeProductId(product.name));const price=product.pricePending||product.price==null?'Price pending':new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(product.price);return `<article class="site-card"><a href="${escapeHTML(href)}"><img src="${escapeHTML(productImage(product))}" alt="${escapeHTML(product.name)}" loading="lazy" onerror="this.onerror=null;this.src=NO_IMAGE"></a><h3>${escapeHTML(product.name)}</h3><p>${escapeHTML(price)}</p><a class="site-button" href="${escapeHTML(href)}">Add to Order</a></article>`;}
async function siteProducts(){const [products,imageRows]=await Promise.all([loadProducts(),loadImageRows()]);return products.map(p=>{applyImagesToProduct(p,imageRows);return {...p,categories:[...new Set((p.categories||[]).flatMap(c=>c.toLowerCase()==='tracksuits'?['Hoodies & Jackets','Pants & Shorts']:[normalizeCategory(c)]))]};});}
function categoryProducts(products,category){return category==='All Products'?products:products.filter(p=>p.categories.includes(category));}
function makeProductRow(title,products,id){if(!products.length)return '';return `<section class="site-section"><div class="row-heading"><h2>${escapeHTML(title)}</h2><div class="row-controls"><button data-row="${id}" data-direction="-1" aria-label="Previous ${escapeHTML(title)}">‹</button><button data-row="${id}" data-direction="1" aria-label="Next ${escapeHTML(title)}">›</button></div></div><div class="product-row" id="${id}">${products.map(siteCard).join('')}</div></section>`;}
async function renderHomepage(){renderOrderStatus();const message=document.getElementById('catalogMessage');try{const products=await siteProducts();document.getElementById('homeRows').innerHTML=makeProductRow('Featured',products.filter(p=>p.featured),'featuredRow')+CATEGORY_ORDER.slice(1).map((c,i)=>makeProductRow(c,categoryProducts(products,c),'categoryRow'+i)).join('');document.querySelectorAll('[data-row]').forEach(button=>button.onclick=()=>{const row=document.getElementById(button.dataset.row);const card=row.querySelector('.site-card');row.scrollBy({left:(card.getBoundingClientRect().width+18)*Number(button.dataset.direction),behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});});message.hidden=products.length>0;message.textContent='No available products.';}catch(e){console.error(e);message.textContent='The catalog could not load. Please refresh or try again later.';}}
async function renderCatalog(){const message=document.getElementById('catalogMessage');try{const products=await siteProducts();const raw=new URLSearchParams(location.search).get('group')||'All Products';const selected=normalizeCategory(raw);document.getElementById('categoryFilters').innerHTML=CATEGORY_ORDER.map(c=>'<a href="'+escapeHTML(catalogLink(c))+'" '+(c===selected?'aria-current="page"':'')+'>'+escapeHTML(c)+'</a>').join('');document.getElementById('catalogHeading').textContent=selected;const shown=categoryProducts(products,selected);document.getElementById('productGrid').innerHTML=shown.map(siteCard).join('');message.hidden=shown.length>0;message.textContent='No available products in this category.';}catch(e){console.error(e);message.textContent='The catalog could not load. Please refresh or try again later.';}}
try{installSiteNavigation();}catch(error){console.error("Navigation failed:",error);}
