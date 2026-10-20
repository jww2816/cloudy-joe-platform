(() => {
  'use strict';
  // Calibration is opt-in. Normal visitors never see the controls.
  if (new URLSearchParams(location.search).get('calibrate') !== '1') return;
  const stage = document.getElementById('map-stage');
  const layer = stage?.querySelector('.map-points');
  const pins = [...(layer?.querySelectorAll('.map-pin') || [])];
  if (!stage || !layer || !pins.length) return;
  document.body.classList.add('arch-calibrating');
  const key = 'cloudy-joe-architecture-hotspots-v4';
  const clamp = (v,lo,hi) => Math.max(lo,Math.min(hi,v));
  const number = (s) => parseFloat(s) || 0;
  const round = n => Math.round(n*100)/100;
  const get = pin => ['x','y','w','h'].map(k=>number(pin.style.getPropertyValue('--'+k)));
  const set = (pin,vals) => ['x','y','w','h'].forEach((k,i)=>pin.style.setProperty('--'+k,round(vals[i])+'%'));
  try { const stored=JSON.parse(localStorage.getItem(key)||'{}'); pins.forEach(pin=>{if(Array.isArray(stored[pin.dataset.service]))set(pin,stored[pin.dataset.service]);}); }catch(_e){}
  const bar=document.createElement('section');bar.className='arch-cal-toolbar';bar.setAttribute('aria-label','Map hotspot calibration');
  bar.innerHTML='<strong>Map hotspot calibration</strong><p>Drag a gold rectangle to move it. Drag its bottom-right square to resize.</p><label for="arch-cal-service">Selected sign</label> <select id="arch-cal-service"></select><output id="arch-cal-values"></output><div class="arch-cal-actions"><button type="button" id="arch-cal-copy">Copy all coordinates</button><button type="button" id="arch-cal-reset">Reset positions</button><button type="button" id="arch-cal-done">Exit calibration</button></div><div class="arch-cal-tip">Adjustments are saved in this browser while calibrating. Copy coordinates and send them back to make the changes permanent for everyone.</div>';
  document.body.append(bar);
  const select=bar.querySelector('select'), out=bar.querySelector('output');
  pins.forEach(pin=>{const opt=document.createElement('option');opt.value=pin.dataset.service;opt.textContent=pin.dataset.service;select.append(opt);});
  let selected=pins[0];
  function focusPin(pin){selected=pin;select.value=pin.dataset.service;pins.forEach(p=>p.classList.toggle('is-cal-selected',p===pin));refresh();}
  function refresh(){const [x,y,w,h]=get(selected);out.textContent=`${selected.dataset.service}: x ${x.toFixed(2)}%, y ${y.toFixed(2)}%, width ${w.toFixed(2)}%, height ${h.toFixed(2)}%`;}
  function save(){const data={};pins.forEach(p=>data[p.dataset.service]=get(p));try{localStorage.setItem(key,JSON.stringify(data));}catch(_e){}refresh();}
  select.addEventListener('change',()=>focusPin(pins.find(p=>p.dataset.service===select.value)));
  let dragging=null;
  pins.forEach(pin=>{
    pin.addEventListener('pointerdown',e=>{
      if(e.button!==0)return;
      e.preventDefault();e.stopImmediatePropagation();focusPin(pin);
      const rect=pin.getBoundingClientRect();
      const mode=(e.clientX>=rect.right-19 && e.clientY>=rect.bottom-19)?'resize':'move';
      dragging={pin,mode,startX:e.clientX,startY:e.clientY,values:get(pin),moved:false};
      pin.setPointerCapture(e.pointerId);
    },true);
    pin.addEventListener('pointermove',e=>{
      if(!dragging||dragging.pin!==pin)return;
      const bounds=layer.getBoundingClientRect();if(!bounds.width||!bounds.height)return;
      const dx=(e.clientX-dragging.startX)/bounds.width*100;
      const dy=(e.clientY-dragging.startY)/bounds.height*100;
      if(Math.abs(dx)+Math.abs(dy)>.05)dragging.moved=true;
      const [x,y,w,h]=dragging.values;
      if(dragging.mode==='move')set(pin,[clamp(x+dx,w/2,100-w/2),clamp(y+dy,h/2,100-h/2),w,h]);
      else {const nw=clamp(w+2*dx,2,Math.min(40,2*Math.min(x,100-x)));const nh=clamp(h+2*dy,2,Math.min(30,2*Math.min(y,100-y)));set(pin,[x,y,nw,nh]);}
      refresh();
    });
    pin.addEventListener('pointerup',e=>{if(dragging?.pin===pin){save();dragging=null;}});
    pin.addEventListener('pointercancel',()=>{if(dragging?.pin===pin){save();dragging=null;}});
    pin.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();},true);
    pin.addEventListener('keydown',e=>{
      if(!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key))return;
      e.preventDefault();e.stopImmediatePropagation();focusPin(pin);
      const vals=get(pin), step=e.shiftKey?.1:.3;
      if(e.key==='ArrowUp')vals[1]-=step;if(e.key==='ArrowDown')vals[1]+=step;
      if(e.key==='ArrowLeft')vals[0]-=step;if(e.key==='ArrowRight')vals[0]+=step;
      set(pin,vals);save();
    },true);
  });
  bar.querySelector('#arch-cal-copy').addEventListener('click',async()=>{
    const lines=pins.map(p=>{const [x,y,w,h]=get(p);return `${p.dataset.service}: --x:${x}%; --y:${y}%; --w:${w}%; --h:${h}%`;});
    const content=lines.join('\n');
    try{await navigator.clipboard.writeText(content);bar.querySelector('#arch-cal-copy').textContent='Copied!';}catch(_e){const ta=document.createElement('textarea');ta.value=content;ta.style.width='100%';ta.rows=9;bar.append(ta);ta.select();}
  });
  bar.querySelector('#arch-cal-reset').addEventListener('click',()=>{if(!confirm('Reset all hotspot positions to V3 defaults?'))return;localStorage.removeItem(key);location.reload();});
  bar.querySelector('#arch-cal-done').addEventListener('click',()=>{location.href=location.pathname;});
  focusPin(pins[0]);
})();
