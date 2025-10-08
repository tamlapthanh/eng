// audioService.js
// Replace existing with this. Supports audio (.mp3...) and video (.mp4...).
(function (global) {
  const AudioService = (function () {
    // internal state
    let mediaEl = null;                // HTMLMediaElement (audio or video)
    let _timeUpdateHandler = null;
    let _endedHandler = null;
    let currentIcon = null;
    let isLoop = false;

    // config
    const cfg = {
      iconPathPlaying: 'assets/icons/music_icon.svg',
      iconPathIdle: 'assets/icons/music_icon.png',
      resetIcons: null,
      changeImageUrl: null,
      getSoundStartEnd: null,
      global_const: null,
      autoShowPanel: true
    };

    // create panel HTML if not exist (includes video container)
    function ensurePanel() {
      if (document.getElementById('audio-control-panel')) return;

      const html = `
<div id="audio-control-panel" style="display:none; position:fixed; right:18px; bottom:18px; width:360px; max-width:95vw; z-index:9999; box-shadow:0 6px 18px rgba(0,0,0,0.18); border-radius:10px; background:#fff; font-family:Arial, sans-serif; overflow:hidden;">
  <div style="display:flex; align-items:center; justify-content:space-between; padding:8px 10px; border-bottom:1px solid rgba(0,0,0,0.06);">
    <div style="display:flex; align-items:center; gap:8px;">
      <img id="acp-icon" src="${cfg.iconPathIdle}" style="width:28px; height:28px; border-radius:4px;" />
      <div style="font-size:14px; font-weight:600;" id="acp-title">Media</div>
    </div>
    <div style="display:flex; gap:6px; align-items:center;">
      <button id="acp-stop" class="btn btn-sm btn-light" title="Stop">■</button>
      <button id="acp-close" class="btn btn-sm btn-light" title="Close">✕</button>
    </div>
  </div>

  <!-- video container: hidden when playing audio -->
  <div id="acp-video-wrap" style="display:none; padding:8px;">
    <video id="acp-video" style="width:100%; border-radius:6px; background:#000;" playsinline controls></video>
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

    function isVideoFile(fileName) {
      if (!fileName) return false;
      const lower = fileName.toLowerCase();
      return lower.endsWith('.mp4') || lower.endsWith('.webm') || lower.endsWith('.ogg') && lower.indexOf('.mp3') === -1;
    }

    // format time
    function formatTime(sec) {
      if (!isFinite(sec)) return '0:00';
      sec = Math.floor(sec);
      const m = Math.floor(sec / 60);
      const s = sec % 60;
      return `${m}:${s.toString().padStart(2,'0')}`;
    }

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
        loopBtn: document.getElementById('acp-loop'),
        videoWrap: document.getElementById('acp-video-wrap'),
        videoEl: document.getElementById('acp-video')
      };
    }

    // show/hide panel
    function showPanel(iconUrl, titleText) {
      ensurePanel();
      const e = panelEls();
      if (iconUrl) e.iconImg.src = iconUrl;
      e.title.textContent = titleText || 'Media';
      e.panel.style.display = 'block';
    }
    function hidePanel() {
      const e = panelEls();
      if (e && e.panel) e.panel.style.display = 'none';
    }

    // clean up media element & handlers
    function stopAudio() {
      if (mediaEl) {
        try {
          if (_timeUpdateHandler) mediaEl.removeEventListener('timeupdate', _timeUpdateHandler);
          if (_endedHandler) mediaEl.removeEventListener('ended', _endedHandler);
        } catch (err) {}
        try { mediaEl.pause(); } catch (e) {}
        try { mediaEl.currentTime = 0; } catch (e) {}
        // if it's a created video element we remove src for memory
        try {
          if (mediaEl.tagName && mediaEl.tagName.toLowerCase() === 'video') {
            mediaEl.removeAttribute('src');
            // do not remove element node (we reuse panel's videoEl), but if mediaEl isn't the panel's videoEl it's okay
          }
        } catch (e) {}
      }
      mediaEl = null;
      _timeUpdateHandler = null;
      _endedHandler = null;
      currentIcon = null;
      hidePanel();
      if (typeof cfg.resetIcons === 'function') cfg.resetIcons();
      // hide video container
      const e = panelEls();
      if (e && e.videoWrap) e.videoWrap.style.display = 'none';
    }

    // one-time panel UI wiring
    let _panelInitialized = false;
    function setupPanelEvents() {
      if (_panelInitialized) return;
      _panelInitialized = true;
      ensurePanel();
      const e = panelEls();

      e.playpauseBtn.addEventListener('click', function () {
        if (!mediaEl) return;
        if (mediaEl.paused) {
          mediaEl.play().catch(()=>{});
          e.playpauseBtn.textContent = 'Pause';
        } else {
          mediaEl.pause();
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
        if (mediaEl) mediaEl.volume = parseFloat(e.volume.value);
      });

      e.progress.addEventListener('input', function () {
        if (!mediaEl || !mediaEl.duration || isNaN(mediaEl.duration)) return;
        const ratio = parseFloat(e.progress.value) / 1000;
        const target = mediaEl.duration * ratio;
        mediaEl.currentTime = target;
        e.currentTimeEl.textContent = formatTime(target);
      });

      e.loopBtn.addEventListener('click', function () {
        isLoop = !isLoop;
        e.loopBtn.style.opacity = isLoop ? '1' : '0.6';
        if (mediaEl) mediaEl.loop = isLoop;
      });
    }

    // attach handlers to current mediaEl
    function attachMediaUI(iconNode, start, end) {
      if (!mediaEl) return;
      setupPanelEvents();
      const e = panelEls();

      if (_timeUpdateHandler) mediaEl.removeEventListener('timeupdate', _timeUpdateHandler);
      if (_endedHandler) mediaEl.removeEventListener('ended', _endedHandler);

      _timeUpdateHandler = function () {
        let cur = mediaEl.currentTime;
        let dur = mediaEl.duration || 0;
        if (typeof end === 'number' && !isNaN(end)) {
          if (cur >= end) {
            if (!mediaEl.paused) mediaEl.pause();
            mediaEl.currentTime = start || 0;
            if (typeof cfg.changeImageUrl === 'function') cfg.changeImageUrl(cfg.iconPathIdle, iconNode);
            if (!isLoop) e.playpauseBtn.textContent = 'Play';
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

      mediaEl.addEventListener('timeupdate', _timeUpdateHandler);
      mediaEl.addEventListener('ended', _endedHandler);
      mediaEl.loop = isLoop;
      mediaEl.volume = parseFloat(e.volume.value || 1);
    }

    // create media element (audio or video) and attach to panel if video
    function createMediaElement(url, forceVideo = false) {
      ensurePanel();
      const e = panelEls();
      const videoRecommended = forceVideo || isVideoFile(url);

      // If videoRecommended, use the panel's <video> element
      if (videoRecommended) {
        // Use panel video element
        const panelVideo = e.videoEl;
        panelVideo.pause();
        panelVideo.removeAttribute('src');
        panelVideo.src = url;
        // ensure video element is used as mediaEl
        mediaEl = panelVideo;
        // make video container visible
        e.videoWrap.style.display = 'block';
      } else {
        // audio file — create a new Audio object (not attached to DOM)
        mediaEl = new Audio(url);
        // hide video container when playing audio
        e.videoWrap.style.display = 'none';
      }
      return mediaEl;
    }

    // Public init
    function init(options = {}) {
      cfg.iconPathPlaying = options.iconPathPlaying || cfg.iconPathPlaying;
      cfg.iconPathIdle = options.iconPathIdle || cfg.iconPathIdle;
      cfg.resetIcons = typeof options.resetIcons === 'function' ? options.resetIcons : null;
      cfg.changeImageUrl = typeof options.changeImageUrl === 'function' ? options.changeImageUrl : null;
      cfg.getSoundStartEnd = typeof options.getSoundStartEnd === 'function' ? options.getSoundStartEnd : null;
      cfg.global_const = options.global_const || null;
      if (typeof options.autoShowPanel !== 'undefined') cfg.autoShowPanel = !!options.autoShowPanel;

      ensurePanel();
      setupPanelEvents();
    }

    // Public: play one media (audio or video)
    function playSound(soundFileName, iconNode) {
      if (typeof cfg.resetIcons === 'function') cfg.resetIcons();

      if (!soundFileName || soundFileName.trim() === 'x') return;

      const parts = (typeof cfg.getSoundStartEnd === 'function')
        ? cfg.getSoundStartEnd(soundFileName)
        : (function (s) { return s.split('/'); })(soundFileName);

      const fileName = parts[0];
      const start = (parts.length > 1) ? parseFloat(parts[1]) : null;
      const end = (parts.length > 2) ? parseFloat(parts[2]) : null;

      const pathPrefix = (cfg.global_const && cfg.global_const.PATH_SOUND) ? cfg.global_const.PATH_SOUND : '';
      // const url = pathPrefix + fileName + (fileName.endsWith('.mp3') || fileName.endsWith('.mp4') ? '' : '');
      // Append .mp3 if fileName doesn't end with .mp3 or .mp4
      const url = pathPrefix + fileName + (fileName.endsWith('.mp3') || fileName.endsWith('.mp4') ? '' : '.mp3');

      stopAudio();

      currentIcon = iconNode;

      // create media element (video if mp4)
      createMediaElement(url);

      // show panel if allowed
      if (cfg.autoShowPanel) showPanel(cfg.iconPathPlaying, fileName);
      else if (typeof cfg.changeImageUrl === 'function') cfg.changeImageUrl(cfg.iconPathPlaying, iconNode);

      // set start time if provided (some browsers may not allow until metadata loaded)
      if (start && mediaEl) {
        try { mediaEl.currentTime = start; } catch (e) {
          // ignore, will set later when metadata loaded
        }
      }

      attachMediaUI(iconNode, start, end);

      const e = panelEls();
      e.playpauseBtn.textContent = 'Pause';

      // ensure play attempt after metadata if needed
      mediaEl.play().catch(err => {
        // if play is blocked or not yet ready, try to play after loadedmetadata
        if (mediaEl && !mediaEl._loadedHandlerAttached) {
          mediaEl._loadedHandlerAttached = true;
          const onMeta = function () {
            try { mediaEl.play().catch(()=>{}); } catch(e) {}
            mediaEl.removeEventListener('loadedmetadata', onMeta);
            mediaEl._loadedHandlerAttached = false;
          };
          mediaEl.addEventListener('loadedmetadata', onMeta);
        }
      });
    }

    // playAllSounds (sequential) - similar logic but advances index
    function playAllSounds(iconsArr = []) {
      if (!Array.isArray(iconsArr) || iconsArr.length === 0) return;
      let idx = 0;
      function next() {
        if (idx >= iconsArr.length) return;
        const icon = iconsArr[idx];
        const soundFileName = icon.getAttr && icon.getAttr('sound');
        if (!soundFileName || soundFileName.trim() === 'x') {
          idx++;
          next();
          return;
        }

        stopAudio();

        const parts = (typeof cfg.getSoundStartEnd === 'function')
          ? cfg.getSoundStartEnd(soundFileName)
          : (function (s) { return s.split('/'); })(soundFileName);

        const fileName = parts[0];
        const start = (parts.length > 1) ? parseFloat(parts[1]) : null;
        const end = (parts.length > 2) ? parseFloat(parts[2]) : null;

        const pathPrefix = (cfg.global_const && cfg.global_const.PATH_SOUND) ? cfg.global_const.PATH_SOUND : '';
        const url = pathPrefix + fileName + (fileName.endsWith('.mp4') || fileName.endsWith('.mp3') ? '' : '');

        try {
          createMediaElement(url);
        } catch (err) {
          console.error('create media failed', err);
          idx++;
          return next();
        }

        currentIcon = icon;
        if (cfg.autoShowPanel) showPanel(cfg.iconPathPlaying, fileName);
        else if (typeof cfg.changeImageUrl === 'function') cfg.changeImageUrl(cfg.iconPathPlaying, icon);

        if (start) {
          try { mediaEl.currentTime = start; } catch(e) {}
        }

        // override handlers to advance when finished or clip end
        if (_timeUpdateHandler) mediaEl.removeEventListener('timeupdate', _timeUpdateHandler);
        if (_endedHandler) mediaEl.removeEventListener('ended', _endedHandler);

        _timeUpdateHandler = function () {
          let cur = mediaEl.currentTime;
          if (typeof end === 'number' && !isNaN(end)) {
            if (cur >= end) {
              if (!mediaEl.paused) mediaEl.pause();
              if (typeof cfg.changeImageUrl === 'function') cfg.changeImageUrl(cfg.iconPathIdle, icon);
              idx++;
              setTimeout(next, 120);
            }
          }
        };

        _endedHandler = function () {
          if (typeof cfg.changeImageUrl === 'function') cfg.changeImageUrl(cfg.iconPathIdle, icon);
          idx++;
          setTimeout(next, 120);
        };

        mediaEl.addEventListener('timeupdate', _timeUpdateHandler);
        mediaEl.addEventListener('ended', _endedHandler);
        mediaEl.loop = isLoop;
        mediaEl.volume = 1;
        const e = panelEls();
        e.playpauseBtn.textContent = 'Pause';
        setupPanelEvents();

        mediaEl.play().catch(()=>{ idx++; next(); });
      } // end next

      next();
    }

    // public API
    return {
      init: init,
      playSound: playSound,
      // playAllSounds: playAllSounds,
      stopAudio: stopAudio,
      showPanel: showPanel,
      hidePanel: hidePanel,
      setAutoShowPanel: function(flag) { cfg.autoShowPanel = !!flag; },
      getState: function () { return { mediaEl, currentIcon }; }
    };
  })();

  global.AudioService = AudioService;
})(window);
