/* Minimal theme manager
   - Reads `theme` from localStorage ("dark" or "light").
   - Applies it by setting `data-theme` on <html>.
   - Exposes `toggleTheme()` to switch and persist.
*/
(function(){
  function setButtonState(theme){
    const btns = document.querySelectorAll('[data-theme-toggle]');
    btns.forEach(btn => {
      const isDark = theme === 'dark';
      // data-state keeps the current theme name
      btn.setAttribute('data-state', theme);
      // aria-pressed reflects whether dark mode is active (pressed = dark)
      btn.setAttribute('aria-pressed', String(isDark));
      // set accessible label and title
      btn.setAttribute('aria-label', isDark ? 'Switch to light theme' : 'Switch to dark theme');
      btn.title = isDark ? 'Switch to light theme' : 'Switch to dark theme';

      // SVG icons (sun for light, moon for dark). Button shows the action (what will happen when clicked)
      const sunSVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>';
      const moonSVG = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>';

      // Show the action icon: if currently dark, show sun (action: switch to light); if currently light, show moon
      btn.innerHTML = isDark ? sunSVG : moonSVG;
    });
  }

  function apply(theme){
    if(theme === 'light') document.documentElement.setAttribute('data-theme','light');
    else document.documentElement.removeAttribute('data-theme');
    setButtonState(theme);
  }

  function init(){
    try{
      const stored = localStorage.getItem('theme');
      const prefers = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
      const chosen = stored || prefers || 'dark';
      apply(chosen);
    }catch(e){ apply('dark'); }

    // attach click handlers to any present toggle buttons
    document.addEventListener('click', function(e){
      const btn = e.target.closest && e.target.closest('[data-theme-toggle]');
      if(btn){ toggleTheme(); return; }

      // close avatar popups if clicking outside
      const open = document.querySelectorAll('.avatar-popup.open');
      if(open.length){
        // if click inside an avatar-wrap, ignore
        const inWrap = e.target.closest && e.target.closest('.avatar-wrap');
        if(!inWrap){
          open.forEach(p => p.classList.remove('open'));
        }
      }
    });

    // Avatar popup behavior: toggle on click, close on mouseleave or outside click
    document.querySelectorAll('.avatar-wrap').forEach(wrap => {
      const img = wrap.querySelector('img.avatar');
      if(!img) return;

      function openPopup(){
        let p = wrap.querySelector('.avatar-popup');
        if(!p){
          p = document.createElement('img');
          p.className = 'avatar-popup';
          p.src = img.src;
          p.alt = img.alt || 'Avatar (large)';
          wrap.appendChild(p);
          // clicking popup toggles (close)
          p.addEventListener('click', e => { e.stopPropagation(); p.classList.remove('open'); });
        }
        p.classList.add('open');
      }

      function closePopup(){
        const p = wrap.querySelector('.avatar-popup');
        if(p) p.classList.remove('open');
      }

      wrap.addEventListener('click', function(e){
        e.stopPropagation();
        const p = wrap.querySelector('.avatar-popup');
        if(p && p.classList.contains('open')) closePopup(); else openPopup();
      });

      wrap.addEventListener('mouseleave', function(){ closePopup(); });
    });
  }

  function toggleTheme(){
    const current = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
    const next = current === 'light' ? 'dark' : 'light';
    try{ localStorage.setItem('theme', next); }catch(e){}
    apply(next);
  }

  window.theme = { init, toggleTheme };
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
