/* header-loader.js — fetch and inject `assets/components/header.html` into pages
  This enables a single header component maintained separately from static pages.
*/
(async function(){
  try{
    console.log('header-loader: fetching /assets/components/header.html');
    const resp = await fetch('/assets/components/header.html', {cache: 'no-cache'});
    if(!resp.ok){ console.warn('header-loader: fetch failed', resp.status); return; }
    const html = await resp.text();
    console.log('header-loader: fetched header, size', html.length);

    function inject(){
      // replace existing <header> if present, otherwise prepend to .wrap
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const newHeader = doc.querySelector('header');
      if(!newHeader) return;

      const existing = document.querySelector('header');
      if(existing){
        existing.replaceWith(newHeader.cloneNode(true));
      } else {
        const wrap = document.querySelector('.wrap');
        if(wrap){ wrap.prepend(newHeader.cloneNode(true)); }
      }

      // execute any scripts contained in the fetched fragment
      const scripts = doc.querySelectorAll('script');
      scripts.forEach(s => {
        try{
          if(s.src){
            const injected = document.createElement('script');
            injected.src = s.src;
            injected.async = false;
            document.head.appendChild(injected);
          } else if(s.textContent){
            const injected = document.createElement('script');
            injected.textContent = s.textContent;
            document.head.appendChild(injected);
          }
        }catch(e){ console.warn('failed to run header script', e); }
      });
        // if a theme manager is present, re-run its init to bind handlers to injected elements
        try{
          if(window.theme && typeof window.theme.init === 'function'){
            window.theme.init();
            console.log('header-loader: re-ran window.theme.init()');
          }
        }catch(e){ console.warn('header-loader: theme.init() failed', e); }

      
    }

    if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', inject); else inject();
    console.log('header-loader: scheduled inject');
    // Attempt to load a site-wide notice component and, if marked active,
    // insert it immediately after the injected header so it appears on every page.
    async function loadSiteNotice(){
      try{
        // Fetch the component first so we can compute a fingerprint. If the
        // component changed since last visit we will clear any dismissal state
        // so updated notices re-present to the user.
        const resp = await fetch('/assets/components/site-notice.html', {cache: 'no-cache'});
        if(!resp.ok){ console.log('site-notice: not present', resp.status); return; }
        const html = await resp.text();
        const parser2 = new DOMParser();
        const doc2 = parser2.parseFromString(html, 'text/html');
        const notice = doc2.querySelector('.site-notice');
        if(!notice) return;
        const active = (notice.getAttribute('data-active') || '').toLowerCase();
        if(!(active === 'true' || active === '1' || notice.classList.contains('active'))) return;

        // compute a stable hash of the component content. Prefer SHA-256 via
        // Web Crypto; fall back to a lightweight checksum if unavailable.
        function fallbackHash(s){
          let a = 0x9e3779b1;
          for(let i=0;i<s.length;i++){ a = (a ^ s.charCodeAt(i)) + 0x9e3779b1 + (a<<6) + (a>>2); a = a >>> 0; }
          return a.toString(16);
        }

        async function computeComponentHash(nodeHtml){
          const payload = (nodeHtml || '').trim();
          try{
            if(window.crypto && crypto.subtle){
              const enc = new TextEncoder();
              const data = enc.encode(payload);
              const buf = await crypto.subtle.digest('SHA-256', data);
              const arr = Array.from(new Uint8Array(buf));
              return arr.map(b => b.toString(16).padStart(2,'0')).join('');
            }
          }catch(e){ /* fall through */ }
          return fallbackHash(payload);
        }

        // Build a normalized string representing the notice: include active flag
        // and the innerHTML so cosmetic differences elsewhere in the file don't
        // affect the fingerprint as much.
        const noticePayload = ((notice.getAttribute('data-active')||'') + '|' + (notice.innerHTML || '')).trim();
        const compHash = await computeComponentHash(noticePayload);
        console.log('site-notice: compHash', compHash);

        // If component changed since last stored hash, reset dismissal state
        try{
          if(window.localStorage){
            const prev = localStorage.getItem('siteNoticeComponentHash') || '';
            const until = parseInt(localStorage.getItem('siteNoticeDismissedUntil') || '0', 10) || 0;
            console.log('site-notice: prevHash=', prev, 'dismissUntil=', until);
            if(prev !== compHash){
              console.log('site-notice: component changed, clearing dismissal');
              localStorage.removeItem('siteNoticeDismissedUntil');
              localStorage.setItem('siteNoticeComponentHash', compHash);
            }
            // Do not show if the user has previously dismissed the notice and the
            // dismissal has not yet expired.
            if(until && Date.now() < until) return;
          }
        }catch(e){ console.warn('site-notice: localStorage error', e); }

        // Insert after header if present, otherwise place at top of .wrap
        const existingHeader = document.querySelector('header');
        const wrap = document.querySelector('.wrap');
        const toInsert = notice.cloneNode(true);
        if(existingHeader && existingHeader.parentNode){
          existingHeader.parentNode.insertBefore(toInsert, existingHeader.nextSibling);
        }else if(wrap){
          const firstChild = wrap.firstElementChild;
          wrap.insertBefore(toInsert, firstChild ? firstChild : wrap.firstChild);
        }else{
          document.body.insertBefore(toInsert, document.body.firstChild);
        }

        // Wire up dismiss button (per-user dismissal persisted to localStorage)
        try{
          const dismiss = toInsert.querySelector('.site-notice-dismiss');
          if(dismiss){
            // capture any existing title text for the custom tooltip,
            // then remove the native title to avoid the browser tooltip.
            const titleText = dismiss.getAttribute('title') || 'Dismiss for 24 hours';
            dismiss.removeAttribute('title');

            // Create tooltip element but don't attach yet.
            const tip = document.createElement('div');
            tip.className = 'site-notice-tooltip';
            tip.textContent = titleText;

            let attached = false;
            function attachTip(){ if(!attached){ document.body.appendChild(tip); attached = true; } }
            function detachTip(){ if(attached && tip.parentNode){ tip.parentNode.removeChild(tip); attached = false; } }

            // Position tooltip so its bottom-left is aligned near the cursor,
            // and clamp to viewport so it stays visible.
            function positionTipAtCursor(ev){
              const padding = 8; // small offset from cursor
              // ensure element is attached so we can measure it
              attachTip();
              const tw = tip.offsetWidth;
              const th = tip.offsetHeight;
              let left = ev.clientX - tw + 12; // bottom-left => shift left by tooltip width
              let top = ev.clientY + 12; // below the cursor
              // clamp to viewport
              const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
              const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
              if(left < padding) left = padding;
              if(left + tw > vw - padding) left = vw - tw - padding;
              if(top + th > vh - padding) top = ev.clientY - th - 12; // try above cursor if would overflow
              tip.style.left = left + 'px';
              tip.style.top = top + 'px';
            }

            // For keyboard focus (no cursor), position near the button's bottom-left.
            function positionTipAtElement(){
              attachTip();
              const rect = dismiss.getBoundingClientRect();
              const tw = tip.offsetWidth;
              const th = tip.offsetHeight;
              const padding = 8;
              let left = rect.left - tw + rect.width + 6; // align bottom-left near cursor equivalent
              let top = rect.bottom + 6;
              const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
              const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
              if(left < padding) left = padding;
              if(left + tw > vw - padding) left = vw - tw - padding;
              if(top + th > vh - padding) top = rect.top - th - 6;
              tip.style.left = left + 'px';
              tip.style.top = top + 'px';
            }

            // Show tooltip on hover and follow cursor; hide on leave.
            const onMove = (ev) => positionTipAtCursor(ev);
            const onEnter = (ev) => { attachTip(); positionTipAtCursor(ev); document.addEventListener('mousemove', onMove, {passive:true}); };
            const onLeave = () => { document.removeEventListener('mousemove', onMove); detachTip(); };

            dismiss.addEventListener('mouseenter', onEnter, {passive:true});
            dismiss.addEventListener('mouseleave', onLeave, {passive:true});

            // keyboard accessibility: show tooltip on focus, hide on blur
            dismiss.addEventListener('focus', function(){ positionTipAtElement(); }, {passive:true});
            dismiss.addEventListener('blur', function(){ detachTip(); }, {passive:true});

            // click behavior: persist dismissal for 24 hours
            dismiss.addEventListener('click', function(){
              try{
                if(window.localStorage){
                  const until = Date.now() + (24 * 60 * 60 * 1000);
                  localStorage.setItem('siteNoticeDismissedUntil', String(until));
                  if(compHash) localStorage.setItem('siteNoticeComponentHash', compHash);
                }
              }catch(e){}
              try{ toInsert.setAttribute('aria-hidden','true'); }catch(e){}
              // remove any tooltip immediately
              detachTip();
              setTimeout(() => { try{ if(toInsert.parentNode) toInsert.parentNode.removeChild(toInsert); }catch(e){} }, 180);
            }, {passive:true});
          }
        }catch(e){ /* ignore */ }
      }catch(e){ console.warn('site-notice load failed', e); }
    }
    // run now and also when DOMContentLoaded in case inject runs later
    try{ loadSiteNotice(); }catch(e){}
  }catch(e){ console.warn('header-loader failed:', e); }
})();
