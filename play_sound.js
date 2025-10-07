// audioService.js
// Đặt file này trong project và include trước file JS chính (hoặc cùng lúc).
// Module pattern: gắn vào window.AudioService

(function (global) {
  const AudioService = (function () {
    // internal state
    let audio = null;
    let _timeUpdateHandler = null;
    let _endedHandler = null;
    let currentIcon = null;
    let isLoop = false;

    // config - sẽ được set khi init
    const cfg = {
      iconPathPlaying: 'assets/icons/music_icon.svg',
      iconPathIdle: 'assets/icons/music_icon.png',
      resetIcons: null,         // function to reset icon images
      changeImageUrl: null,     // function(iconPath, iconNode)
      getSoundStartEnd: null,   // function(fileName) => [file, start, end]
      global_const: null,       // object with PATH_SOUND
      autoShowPanel: true       // NEW: nếu false thì không tự show panel khi play
    };

    // create panel HTML if not exist
    function ensurePanel() {
      if (document.getElementById('audio-control-panel')) return;

      const html = `
<div id="audio-control-panel" style="display:none; position:fixed; right:18px; bottom:18px; width:320px; z-index:9999; box-shadow:0 6px 18px rgba(0,0,0,0.18); border-radius:10px; background:#fff; font-family:Arial, sans-serif; overflow:hidden;">
  <div style="display:flex; align-items:center; justify-content:space-between; padding:8px 10px; border-bottom:1px solid rgba(0,0,0,0.06);">
    <div style="display:flex; align-items:center; gap:8px;">
      <img id="acp-icon" src="${cfg.iconPathIdle}" style="width:28px; height:28px; border-radius:4px;" />
      <div style="font-size:14px; font-weight:600;" id="acp-title">Audio</div>
    </div>
    <div style="display:flex; gap:6px; align-items:center;">
      <button id="acp-stop" class="btn btn-sm btn-light" title="Stop">■</button>
      <button id="acp-close" class="btn btn-sm btn-light" title="Close">✕</button>
    </div>
  </div>

  <div style="padding:10px;">
    <div style="display:flex; gap:8px; align-items:center; margin-bottom:6px;">
      <button id="acp-playpause" class="btn btn-primary" style="min-width:56px;">Play</button>
      <div style="flex:1;">
        <input id="acp-progress" type="range" min="0" max="1000" value="0" step="1" style="width:100%;">
        <div style="display:flex; justify-content:space-between; font-size:12px; color:#666; margin-top:4px;">
          <span id="acp-current">0:00</span>
          <span id="acp-duration">0:00</span>
        </div>
      </div>
    </div>

    <div style="display:flex; gap:8px; align-items:center;">
      <label style="font-size:12px; color:#666;">Vol</label>
      <input id="acp-volume" type="range" min="0" max="1" step="0.01" value="1" style="flex:1;">
      <button id="acp-loop" class="btn btn-sm btn-light" title="Toggle loop">🔁</button>
    </div>
  </div>
</div>`;
      const div = document.createElement('div');
      div.innerHTML = html;
      document.body.appendChild(div);
    }

    // helper format
    function formatTime(sec) {
      if (!isFinite(sec)) return '0:00';
      sec = Math.floor(sec);
      const m = Math.floor(sec / 60);
      const s = sec % 60;
      return `${m}:${s.toString().padStart(2,'0')}`;
    }

    // cache panel elements
    function panelEls() {
      return {
        panel: document.getElementById('audio-control-panel'),
        iconImg: document.getElementById('acp-icon'),
        title: document.getElementById('acp-title'),
        playpauseBtn: document.getElementById('acp-playpause'),
        stopBtn: document.getElementById('acp-stop'),
        closeBtn: document.getElementById('acp-close'),
        progress: document.getElementById('acp-progress'),
        currentTimeEl: document.getElementById('acp-current'),
        durationEl: document.getElementById('acp-duration'),
        volume: document.getElementById('acp-volume'),
        loopBtn: document.getElementById('acp-loop')
      };
    }

    // show/hide panel (public usage possible)
    function showPanel(iconUrl, titleText) {
      ensurePanel();
      const e = panelEls();
      if (iconUrl) e.iconImg.src = iconUrl;
      e.title.textContent = titleText || 'Audio';
      e.panel.style.display = 'block';
    }
    function hidePanel() {
      const e = panelEls();
      if (e && e.panel) e.panel.style.display = 'none';
    }

    // cleanup previous audio & handlers
    function stopAudio() {
      if (audio) {
        try {
          if (_timeUpdateHandler) audio.removeEventListener('timeupdate', _timeUpdateHandler);
          if (_endedHandler) audio.removeEventListener('ended', _endedHandler);
        } catch (err) { /* ignore */ }
        try { audio.pause(); } catch (e) {}
        try { audio.currentTime = 0; } catch (e) {}
      }
      audio = null;
      _timeUpdateHandler = null;
      _endedHandler = null;
      currentIcon = null;
      hidePanel();
      // restore icons if provided
      if (typeof cfg.resetIcons === 'function') cfg.resetIcons();
    }

    // attach panel events (only once)
    let _panelInitialized = false;
    function setupPanelEvents() {
      if (_panelInitialized) return;
      _panelInitialized = true;
      ensurePanel();
      const e = panelEls();

      e.playpauseBtn.addEventListener('click', function () {
        if (!audio) return;
        if (audio.paused) {
          audio.play().catch(()=>{});
          e.playpauseBtn.textContent = 'Pause';
        } else {
          audio.pause();
          e.playpauseBtn.textContent = 'Play';
        }
      });

      e.stopBtn.addEventListener('click', function () {
        stopAudio();
      });

      e.closeBtn.addEventListener('click', function () {
        stopAudio();
      });

      e.volume.addEventListener('input', function () {
        if (audio) audio.volume = parseFloat(e.volume.value);
      });

      e.progress.addEventListener('input', function () {
        if (!audio || !audio.duration || isNaN(audio.duration)) return;
        const ratio = parseFloat(e.progress.value) / 1000;
        const target = audio.duration * ratio;
        audio.currentTime = target;
        e.currentTimeEl.textContent = formatTime(target);
      });

      e.loopBtn.addEventListener('click', function () {
        isLoop = !isLoop;
        e.loopBtn.style.opacity = isLoop ? '1' : '0.6';
        if (audio) audio.loop = isLoop;
      });
    }

    // attach UI handlers to audio instance (timeupdate/ended)
    function attachAudioUI(iconNode, start, end) {
      if (!audio) return;
      setupPanelEvents();
      const e = panelEls();

      // remove old handlers
      if (_timeUpdateHandler) audio.removeEventListener('timeupdate', _timeUpdateHandler);
      if (_endedHandler) audio.removeEventListener('ended', _endedHandler);
      _timeUpdateHandler = function () {
        let cur = audio.currentTime;
        let dur = audio.duration || 0;
        if (typeof end === 'number' && !isNaN(end)) {
          if (cur >= end) {
            if (!audio.paused) audio.pause();
            audio.currentTime = start || 0;
            // change icon back
            if (typeof cfg.changeImageUrl === 'function') cfg.changeImageUrl(cfg.iconPathIdle, iconNode);
            if (!isLoop) e.playpauseBtn.textContent = 'Play';
            if (!isLoop) audio.currentTime = start || 0;
            if (!isLoop) { /* don't auto-play next in this service */ }
          }
          dur = Math.max(0.01, end - (start || 0));
          const relCur = Math.max(0, cur - (start || 0));
          e.progress.value = Math.floor((relCur / dur) * 1000);
          e.currentTimeEl.textContent = formatTime(relCur);
          e.durationEl.textContent = formatTime(dur);
        } else {
          if (dur && isFinite(dur)) {
            e.progress.value = Math.floor((cur / dur) * 1000);
            e.currentTimeEl.textContent = formatTime(cur);
            e.durationEl.textContent = formatTime(dur);
          }
        }
      };

      _endedHandler = function () {
        if (typeof cfg.changeImageUrl === 'function') cfg.changeImageUrl(cfg.iconPathIdle, iconNode);
        e.playpauseBtn.textContent = 'Play';
        e.progress.value = 0;
      };

      audio.addEventListener('timeupdate', _timeUpdateHandler);
      audio.addEventListener('ended', _endedHandler);
      audio.loop = isLoop;
      audio.volume = parseFloat(e.volume.value || 1);
    }

    // Public: initialize config
    function init(options = {}) {
      cfg.iconPathPlaying = options.iconPathPlaying || cfg.iconPathPlaying;
      cfg.iconPathIdle = options.iconPathIdle || cfg.iconPathIdle;
      cfg.resetIcons = typeof options.resetIcons === 'function' ? options.resetIcons : null;
      cfg.changeImageUrl = typeof options.changeImageUrl === 'function' ? options.changeImageUrl : null;
      cfg.getSoundStartEnd = typeof options.getSoundStartEnd === 'function' ? options.getSoundStartEnd : null;
      cfg.global_const = options.global_const || null;
      if (typeof options.autoShowPanel !== 'undefined') {
        cfg.autoShowPanel = !!options.autoShowPanel;
      }

      ensurePanel();
      setupPanelEvents();
    }

    // Public: play a single sound and show panel
    function playSound(soundFileName, iconNode) {
      // reset icons in UI
      if (typeof cfg.resetIcons === 'function') cfg.resetIcons();

      if (!soundFileName || soundFileName.trim() === 'x') {
        return;
      }

      const parts = (typeof cfg.getSoundStartEnd === 'function')
        ? cfg.getSoundStartEnd(soundFileName)
        : (function (s) { const arr = s.split('/'); return arr; })(soundFileName);

      const fileName = parts[0];
      const start = (parts.length > 1) ? parseFloat(parts[1]) : null;
      const end = (parts.length > 2) ? parseFloat(parts[2]) : null;

      const pathPrefix = (cfg.global_const && cfg.global_const.PATH_SOUND) ? cfg.global_const.PATH_SOUND : '';
      const url = pathPrefix + fileName + (fileName.endsWith('.mp3') ? '' : '.mp3');

      // stop any existing audio
      stopAudio();

      try {
        audio = new Audio(url);
      } catch (err) {
        console.error('Audio create failed', err);
        return;
      }

      currentIcon = iconNode;
      // set panel and icon — only auto show if cfg.autoShowPanel true
      if (cfg.autoShowPanel) {
        showPanel(cfg.iconPathPlaying, fileName);
      } else {
        // still update icon if caller wants visual change
        if (typeof cfg.changeImageUrl === 'function') cfg.changeImageUrl(cfg.iconPathPlaying, iconNode);
      }

      if (start) {
        try { audio.currentTime = start; } catch(e) {}
      }

      attachAudioUI(iconNode, start, end);

      const e = panelEls();
      e.playpauseBtn.textContent = 'Pause';
      audio.play().catch(err => {
        console.warn('play failed', err);
        e.playpauseBtn.textContent = 'Play';
      });
    }

    // Public: play all sounds sequentially (array of Konva Image nodes)
    function playAllSounds(iconsArr = []) {
      if (!Array.isArray(iconsArr) || iconsArr.length === 0) return;
      let index = 0;
      function next() {
        if (index >= iconsArr.length) return;
        const icon = iconsArr[index];
        const soundFileName = icon.getAttr && icon.getAttr('sound');
        if (!soundFileName || soundFileName.trim() === 'x') {
          index++;
          next();
          return;
        }
        // Stop previous audio then start new
        stopAudio();
        // Reuse playSound flow but we want to auto-advance when ended/timeupdate passes end
        const parts = (typeof cfg.getSoundStartEnd === 'function')
          ? cfg.getSoundStartEnd(soundFileName)
          : (function (s) { const arr = s.split('/'); return arr; })(soundFileName);
        const fileName = parts[0];
        const start = (parts.length > 1) ? parseFloat(parts[1]) : null;
        const end = (parts.length > 2) ? parseFloat(parts[2]) : null;
        const pathPrefix = (cfg.global_const && cfg.global_const.PATH_SOUND) ? cfg.global_const.PATH_SOUND : '';
        const url = pathPrefix + fileName + (fileName.endsWith('.mp3') ? '' : '.mp3');

        try {
          audio = new Audio(url);
        } catch (err) {
          console.error('Audio create failed', err);
          index++;
          next();
          return;
        }

        currentIcon = icon;
        // show panel only if autoShowPanel true
        if (cfg.autoShowPanel) {
          showPanel(cfg.iconPathPlaying, fileName);
        } else {
          if (typeof cfg.changeImageUrl === 'function') cfg.changeImageUrl(cfg.iconPathPlaying, icon);
        }

        if (start) {
          try { audio.currentTime = start; } catch(e) {}
        }

        // attach UI for this audio
        // override attachAudioUI behavior to advance when finished / clip end
        if (_timeUpdateHandler) audio.removeEventListener('timeupdate', _timeUpdateHandler);
        if (_endedHandler) audio.removeEventListener('ended', _endedHandler);
        _timeUpdateHandler = function () {
          let cur = audio.currentTime;
          if (typeof end === 'number' && !isNaN(end)) {
            if (cur >= end) {
              if (!audio.paused) audio.pause();
              // reset icon
              if (typeof cfg.changeImageUrl === 'function') cfg.changeImageUrl(cfg.iconPathIdle, icon);
              // advance
              index++;
              setTimeout(next, 100); // small delay
            }
          }
        };
        _endedHandler = function () {
          if (typeof cfg.changeImageUrl === 'function') cfg.changeImageUrl(cfg.iconPathIdle, icon);
          index++;
          setTimeout(next, 100);
        };

        audio.addEventListener('timeupdate', _timeUpdateHandler);
        audio.addEventListener('ended', _endedHandler);
        audio.loop = isLoop;
        audio.volume = 1;
        const e = panelEls();
        e.playpauseBtn.textContent = 'Pause';
        setupPanelEvents();
        audio.play().catch(() => { index++; next(); });
      } // end next

      // kick off
      next();
    }

    // expose public API
    return {
      init: init,
      playSound: playSound,
      playAllSounds: playAllSounds,
      stopAudio: stopAudio,
      // new public controls:
      showPanel: showPanel,
      hidePanel: hidePanel,
      setAutoShowPanel: function(flag) { cfg.autoShowPanel = !!flag; },
      getState: function () { return { audio, currentIcon }; }
    };
  })();

  // attach
  global.AudioService = AudioService;
})(window);
