// Plant Manager (installable app): connects this device to your Plant Manager API and sends the app's
// requests there. Loaded before the main app script, which uses window.PM_TRANSPORT instead of google.script.run.
(function(){
  'use strict';
  const CFG = window.PM_CONFIG || {};
  const KEY = 'pm.deviceKey';
  const PATH = location.pathname.replace(/[^/]*$/, '');
  const KEY_RE = /([0-9a-f]{64})/;

  function getKey(){
    try{ const k = localStorage.getItem(KEY); if(k) return k; }catch(e){}
    const m = document.cookie.match(/(?:^|;\s*)pmkey=([0-9a-f]{64})/);   // iPhone copies cookies into home-screen apps
    return m ? m[1] : '';
  }
  function setKey(k){
    try{ localStorage.setItem(KEY, k); }catch(e){}
    document.cookie = `pmkey=${k}; Max-Age=31536000; Path=${PATH}; Secure; SameSite=Strict`;
  }
  function clearKey(){
    try{ localStorage.removeItem(KEY); localStorage.removeItem('pm.cache2'); }catch(e){}
    document.cookie = `pmkey=; Max-Age=0; Path=${PATH}; Secure; SameSite=Strict`;
  }

  // A connection link looks like …/#connect=<key>. Save the key, then take it out of the address bar.
  const fromLink = location.hash.match(/connect=([0-9a-f]{64})/);
  if(fromLink){ setKey(fromLink[1]); history.replaceState(null, '', location.pathname + location.search); }
  // The link can also arrive while the app is already open (only the part after # changes, so nothing reloads).
  window.addEventListener('hashchange', () => {
    const m = location.hash.match(/connect=([0-9a-f]{64})/);
    if(m){ setKey(m[1]); history.replaceState(null, '', location.pathname + location.search); location.reload(); }
  });

  let shown = false;
  function showConnect(message){
    if(shown) return; shown = true;
    const build = () => {
      const wrap = document.createElement('div'); wrap.className = 'pm-connect'; wrap.setAttribute('role','dialog'); wrap.setAttribute('aria-modal','true'); wrap.setAttribute('aria-labelledby','pm-connect-h');
      const card = document.createElement('div'); card.className = 'pm-card';
      const mark = document.createElement('img'); mark.src = 'icons/icon-192.png'; mark.alt = ''; mark.width = 56; mark.height = 56; mark.className = 'pm-mark';
      const h = document.createElement('h1'); h.id = 'pm-connect-h'; h.textContent = 'Connect this device';
      const p = document.createElement('p'); p.textContent = message || 'Open your Plant Manager on Google, go to Money › Payment info, tap “Connect a device”, then open or paste the link here.';
      const label = document.createElement('label'); label.textContent = 'Connection link or code'; label.htmlFor = 'pm-connect-code';
      const ta = document.createElement('textarea'); ta.id = 'pm-connect-code'; ta.rows = 3; ta.autocapitalize = 'off'; ta.spellcheck = false; ta.placeholder = 'https://…#connect=…';
      const err = document.createElement('p'); err.className = 'pm-err'; err.setAttribute('role','alert'); err.hidden = true;
      const btn = document.createElement('button'); btn.type = 'button'; btn.textContent = 'Connect';
      ta.addEventListener('input', () => { err.hidden = true; });
      btn.onclick = () => {
        const m = ta.value.trim().match(KEY_RE);
        if(!m){ err.textContent = 'Paste the whole link or code from “Connect a device”.'; err.hidden = false; ta.focus(); return; }
        setKey(m[1]); location.reload();
      };
      card.append(mark, h, p, label, ta, err, btn);
      wrap.append(card); document.body.append(wrap);
      ta.focus({preventScroll:true});
    };
    if(document.body) build(); else document.addEventListener('DOMContentLoaded', build);
  }

  window.PM_TRANSPORT = async function(fn, args){
    const key = getKey();
    if(!key){ showConnect(); throw new Error('This device isn’t connected yet.'); }
    if(!CFG.apiUrl) throw new Error('The app isn’t linked to your Plant Manager API yet.');
    let res;
    try{
      res = await fetch(CFG.apiUrl, {method:'POST', headers:{'Content-Type':'text/plain;charset=utf-8'}, body: JSON.stringify({key, fn, args: args || []}), redirect:'follow'});
    }catch(e){ throw new Error('Couldn’t reach Google. Check your connection and try again.'); }
    let out;
    try{ out = await res.json(); }catch(e){ throw new Error('Google sent an unexpected reply (' + res.status + '). Try again in a minute.'); }
    if(out.ok) return out.result;
    if(out.error === 'auth'){ clearKey(); showConnect('This device isn’t connected (it may have been disconnected). Connect it again from your Plant Manager on Google.'); throw new Error('This device isn’t connected.'); }
    throw new Error(out.message || 'That didn’t work (' + out.error + ').');
  };

  if(!getKey()) showConnect();

  if('serviceWorker' in navigator) window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => {}); });
})();
