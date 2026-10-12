const I={nw:'<svg viewBox="0 0 16 16"><path d="M2 12.5 6 8l3 2.5L14 4"/><path d="M10.5 4H14v3.5"/></svg>',cf:'<svg viewBox="0 0 16 16"><path d="M3 5h10M3 5l2.5-2.5M3 5l2.5 2.5M13 11H3m10 0-2.5-2.5M13 11l-2.5 2.5"/></svg>',set:'<svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="2.2"/><path d="M8 1.8v1.6M8 12.6v1.6M1.8 8h1.6M12.6 8h1.6M3.6 3.6l1.1 1.1M11.3 11.3l1.1 1.1M3.6 12.4l1.1-1.1M11.3 4.7l1.1-1.1"/></svg>',eye:'<svg viewBox="0 0 16 16"><path d="M1.5 8S4 3.5 8 3.5 14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8Z"/><circle cx="8" cy="8" r="2"/></svg>',home:'<svg viewBox="0 0 16 16"><path d="M2.5 7 8 2.5 13.5 7v6.5h-11Z"/></svg>',plot:'<svg viewBox="0 0 16 16"><path d="M2 12 6 4l4 8M8 9h6"/></svg>',bank:'<svg viewBox="0 0 16 16"><path d="M2 6h12L8 2.5Zm1.5 1v5m3-5v5m3-5v5m3-5v5M2 13.5h12"/></svg>'};
function rail(active){document.body.insertAdjacentHTML('afterbegin',`<nav class="rail"><div class="lights"><i></i><i></i><i></i></div>
<div class="search"><span>Search, jump, add…</span><kbd>⌘K</kbd></div>
<div class="item ${active=='nw'?'on':''}">${I.nw}Net worth<span class="r num">⌘1</span></div>
<div class="item ${active=='cf'?'on':''}">${I.cf}Cashflow<span class="r num">⌘2</span></div>
<div class="group">Largest holdings</div>
<div class="item ${active=='fw'?'on':''}">${I.home}Fort Wola 12B/23</div>
<div class="item">${I.bank}ING Otwarte Konto</div>
<div class="item ${active=='nef'?'on':''}">${I.plot}Działka Nefrytowa</div>
<div class="foot"><div class="item ${active=='set'?'on':''}">${I.set}Settings<span class="r num">⌘,</span></div></div></nav>`)}
window.ICONS=I;
