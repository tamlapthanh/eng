// audioService.js
// Replace existing with this. Supports audio (.mp3...) and video (.mp4...).
(function (global) {
  const AudioService = (function () {
    // internal state
    let mediaEl = null;                // HTMLMediaElement (audio or video)
    let _timeUpdateHandler = null;
    let _endedHandler = null;
    let currentIcon = null;
    let isLoop = true;                 // default: loop enabled
  
    // config
    const cfg = {
      iconPathPlaying: ICON_PLAYING, //'assets/music_icon.svg'
      iconPathIdle: ICON_AUDIO, // 'assets/audio_play_icon.png'
      resetIcons: null,
      changeImageUrl: null,
      getSoundStartEnd: null,
      global_const: null,
      autoShowPanel: true,      // NEW: nếu false thì không tự show panel khi play
      onClose: null,             // ✅ callback được gọi khi user nhấn nút close panel
      defaultPlaybackRate: 1, 
    };

    // create panel HTML if not exist (includes video container and speed control as range)
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
     <button  id="acp-loop"  class="btn btn-sm btn-primary" title="Toggle loop" aria-pressed="true"><i class="bi bi-arrow-repeat" style="font-size:14px;"></i></button>
      <button id="acp-close" class="btn btn-sm btn-danger" title="Close"><i class="bi bi-x-lg" style="font-size:14px;"></i></button>
    </div>
  </div>

  <!-- video container -->
  <div id="acp-video-wrap" style="display:none; padding:8px;">
    <video id="acp-video" style="width:100%; border-radius:6px; background:#000;" playsinline controls></video>
  </div>

  <div style="padding:10px;">
    <div style="display:flex; align-items:center; gap:8px; margin-bottom:6px; height:40px;">
      <!-- Play/Pause button -->
      <button id="acp-playpause" class="btn btn-sm btn-primary d-flex align-items-center justify-content-center"
              style="width:34px; height:34px; padding:0;">
        <i class="bi bi-play-fill" style="font-size:14px;"></i>
      </button>

      <!-- Progress + time -->
      <div style="flex:1; display:flex; flex-direction:column; justify-content:center;">
        <input id="acp-progress" type="range" min="0" max="1000" value="0" step="1" style="width:100%;">
        <div style="display:flex; justify-content:space-between; font-size:12px; color:#666;">
          <span id="acp-current">0:00</span>
          <span id="acp-duration">0:00</span>
        </div>
      </div>
    </div>

    <div style="display:flex; gap:8px; align-items:center;">
      <i class="bi bi-volume-up" style="font-size:24px; color:#666;"></i>
      <input id="acp-volume" type="range" min="0" max="1" step="0.01" value="1" style="flex:1;">
     
      <i class="bi bi-speedometer" style="font-size:18px; color:#666;"></i>
      <input id="acp-speed" type="range" min="0.5" max="2" step="0.25" value="${cfg.defaultPlaybackRate}" style="width:70px;">
      <span id="speedValue" style="min-width:44px; text-align:right; display:inline-block;">${cfg.defaultPlaybackRate.toFixed(2)}x</span>
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
      return lower.endsWith('.mp4') || lower.endsWith('.webm') || lower.endsWith('.ogg') || lower.endsWith('.mkv');
    }

    // format time
    function formatTime(sec) {
      if (!isFinite(sec)) return '0:00';
      sec = Math.floor(sec);
      const m = Math.floor(sec / 60);
      const s = sec % 60;
      return `${m}:${s.toString().padStart(2, '0')}`;
    }

    function panelEls() {
      return {
        panel: document.getElementById('audio-control-panel'),
        iconImg: document.getElementById('acp-icon'),
        title: document.getElementById('acp-title'),
        playpauseBtn: document.getElementById('acp-playpause'),
        // stopBtn: document.getElementById('acp-stop'),
        closeBtn: document.getElementById('acp-close'),
        progress: document.getElementById('acp-progress'),
        currentTimeEl: document.getElementById('acp-current'),
        durationEl: document.getElementById('acp-duration'),
        volume: document.getElementById('acp-volume'),
        loopBtn: document.getElementById('acp-loop'),
        videoWrap: document.getElementById('acp-video-wrap'),
        videoEl: document.getElementById('acp-video'),
        speed: document.getElementById('acp-speed'),
        speedLabel: document.getElementById('speedValue')
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
        } catch (err) { }
        try { mediaEl.pause(); } catch (e) { }
        try { mediaEl.currentTime = 0; } catch (e) { }
        try {
          if (mediaEl.tagName && mediaEl.tagName.toLowerCase() === 'video') {
            mediaEl.removeAttribute('src');
          }
        } catch (e) { }
      }
      mediaEl = null;
      _timeUpdateHandler = null;
      _endedHandler = null;
      currentIcon = null;
      hidePanel();
      if (typeof cfg.resetIcons === 'function') cfg.resetIcons();
      const e = panelEls();
      if (e && e.videoWrap) e.videoWrap.style.display = 'none';
    }

    // Update loop button UI
    function updateLoopUI() {
      const e = panelEls();
      if (!e || !e.loopBtn) return;
      e.loopBtn.style.opacity = isLoop ? '1' : '0.6';
      e.loopBtn.setAttribute('aria-pressed', !!isLoop);
      e.loopBtn.classList.toggle('active', !!isLoop);
    }

    // one-time panel UI wiring
    let _panelInitialized = false;
    function setupPanelEvents() {
      if (_panelInitialized) return;
      _panelInitialized = true;
      ensurePanel();
      const e = panelEls();

      // Play/pause toggle: change icon instead of text
      e.playpauseBtn.addEventListener('click', function () {
        if (!mediaEl) return;
        const icon = e.playpauseBtn.querySelector('i');
        if (mediaEl.paused) {
          mediaEl.play().catch(() => { });
          if (icon) { icon.className = 'bi bi-pause-fill'; }
        } else {
          mediaEl.pause();
          if (icon) { icon.className = 'bi bi-play-fill'; }
        }
      });

      // e.stopBtn.addEventListener('click', function () { stopAudio(); });
      e.closeBtn.addEventListener('click', function () { 
        stopAudio(); 
        if (typeof cfg.onClose === 'function') {
          cfg.onClose();
        }
      });

      e.volume.addEventListener('input', function () {
        if (mediaEl) mediaEl.volume = parseFloat(e.volume.value);
      });

      e.progress.addEventListener('input', function () {
        if (!mediaEl || !mediaEl.duration || isNaN(mediaEl.duration)) return;
        const ratio = parseFloat(e.progress.value) / 1000;
        const target = mediaEl.duration * ratio;
        mediaEl.currentTime = target;
        if (e.currentTimeEl) e.currentTimeEl.textContent = formatTime(target);
      });

      // loop button
      e.loopBtn.addEventListener('click', function () {
        isLoop = !isLoop;
        updateLoopUI();
        if (mediaEl) {
          try {
            mediaEl.loop = !!isLoop;
            if (mediaEl.tagName && mediaEl.tagName.toLowerCase() === 'video') {
              if (isLoop) mediaEl.setAttribute('loop', ''); else mediaEl.removeAttribute('loop');
            }
          } catch (err) { /* ignore */ }
        }
      });

      // speed slider handler
      if (e.speed) {
        e.speed.addEventListener('input', function () {
          const rate = parseFloat(e.speed.value) || 1;
          if (mediaEl) {
            try { mediaEl.playbackRate = rate; } catch (err) { }
          }
          if (e.speedLabel) e.speedLabel.textContent = rate.toFixed(2) + 'x';
        });
      }

      // initial UI states
      updateLoopUI();
      if (e.speed && e.speedLabel) {
        e.speed.value = (cfg.defaultPlaybackRate || 1).toString();
        e.speedLabel.textContent = (cfg.defaultPlaybackRate || 1).toFixed(2) + 'x';
      }
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
          // We're playing a clipped segment [start .. end]
          if (cur >= end) {
            if (isLoop) {
              try { mediaEl.currentTime = start || 0; } catch (e) { }
              if (mediaEl.paused) mediaEl.play().catch(() => { });
              if (typeof cfg.changeImageUrl === 'function') cfg.changeImageUrl(cfg.iconPathPlaying, iconNode);
              const icon = e.playpauseBtn && e.playpauseBtn.querySelector('i'); if (icon) icon.className = 'bi bi-pause-fill';
            } else {
              if (!mediaEl.paused) mediaEl.pause();
              try { mediaEl.currentTime = start || 0; } catch (e) { }
              if (typeof cfg.changeImageUrl === 'function') cfg.changeImageUrl(cfg.iconPathIdle, iconNode);
              const icon = e.playpauseBtn && e.playpauseBtn.querySelector('i'); if (icon) icon.className = 'bi bi-play-fill';
            }
          }

          dur = Math.max(0.01, end - (start || 0));
          const relCur = Math.max(0, cur - (start || 0));
          if (e.progress) e.progress.value = Math.floor((relCur / dur) * 1000);
          if (e.currentTimeEl) e.currentTimeEl.textContent = formatTime(relCur);
          if (e.durationEl) e.durationEl.textContent = formatTime(dur);
        } else {
          // full file progress
          if (dur && isFinite(dur)) {
            if (e.progress) e.progress.value = Math.floor((cur / dur) * 1000);
            if (e.currentTimeEl) e.currentTimeEl.textContent = formatTime(cur);
            if (e.durationEl) e.durationEl.textContent = formatTime(dur);
          }
        }
      };

      _endedHandler = function () {
        if (typeof cfg.changeImageUrl === 'function') cfg.changeImageUrl(cfg.iconPathIdle, iconNode);

        if (isLoop) {
          try { mediaEl.currentTime = start || 0; } catch (e) { }
          mediaEl.play().catch(() => { });
          const icon = e.playpauseBtn && e.playpauseBtn.querySelector('i'); if (icon) icon.className = 'bi bi-pause-fill';
        } else {
          const icon = e.playpauseBtn && e.playpauseBtn.querySelector('i'); if (icon) icon.className = 'bi bi-play-fill';
          if (e.progress) e.progress.value = 0;
        }
      };

      mediaEl.addEventListener('timeupdate', _timeUpdateHandler);
      mediaEl.addEventListener('ended', _endedHandler);

      // ensure loop property and attribute are applied (for full media)
      try {
        mediaEl.loop = !!isLoop;
        if (mediaEl.tagName && mediaEl.tagName.toLowerCase() === 'video') {
          if (isLoop) mediaEl.setAttribute('loop', ''); else mediaEl.removeAttribute('loop');
        }
      } catch (err) { /* ignore */ }

      mediaEl.volume = parseFloat(e.volume.value || 1);

      // set playbackRate from UI / config
      const uiRate = parseFloat(e.speed && e.speed.value) || cfg.defaultPlaybackRate || 1;
      try { mediaEl.playbackRate = uiRate; } catch (err) { }

      // set start time safely when metadata available (for clips)
      if (start) {
        const setStartWhenMeta = function () {
          try { mediaEl.currentTime = start; } catch (e) { }
          mediaEl.removeEventListener('loadedmetadata', setStartWhenMeta);
        };
        if (mediaEl.readyState >= 1) {
          try { mediaEl.currentTime = start; } catch (e) { }
        } else {
          mediaEl.addEventListener('loadedmetadata', setStartWhenMeta);
        }
      }
    }

    // create media element (audio or video) and attach to panel if video
    function createMediaElement(url, forceVideo = false) {
      ensurePanel();
      const e = panelEls();
      const videoRecommended = forceVideo || isVideoFile(url);

      if (videoRecommended) {
        const panelVideo = e.videoEl;
        try { panelVideo.pause(); } catch (e) { }
        try { panelVideo.removeAttribute('src'); } catch (e) { }
        panelVideo.src = url;
        try {
          if (isLoop) panelVideo.setAttribute('loop', ''); else panelVideo.removeAttribute('loop');
          panelVideo.loop = !!isLoop;
        } catch (err) { }
        mediaEl = panelVideo;
        e.videoWrap.style.display = 'block';
      } else {
        mediaEl = new Audio(url);
        try { mediaEl.loop = !!isLoop; } catch (e) { }
        e.videoWrap.style.display = 'none';
      }
      return mediaEl;
    }

    // Public init
    function init(options = {}) {
      cfg.iconPathPlaying = options.iconPathPlaying || cfg.iconPathPlaying;
      cfg.iconPathIdle = options.iconPathIdle || cfg.iconPathIdle;
      cfg.resetIcons =
        typeof options.resetIcons === "function" ? options.resetIcons : null;
      cfg.changeImageUrl =
        typeof options.changeImageUrl === "function"
          ? options.changeImageUrl
          : null;
      cfg.getSoundStartEnd =
        typeof options.getSoundStartEnd === "function"
          ? options.getSoundStartEnd
          : null;
      cfg.global_const = options.global_const || null;
      if (typeof options.autoShowPanel !== "undefined")
        cfg.autoShowPanel = !!options.autoShowPanel;
      if (typeof options.defaultPlaybackRate !== "undefined")
        cfg.defaultPlaybackRate = parseFloat(options.defaultPlaybackRate) || 1;

      // <-- add this line:
      cfg.onClose =
        typeof options.onClose === "function" ? options.onClose : null;

      ensurePanel();
      setupPanelEvents();

      // ensure UI speed control reflects default
      const e = panelEls();
      if (e && e.speed) {
        e.speed.value = (cfg.defaultPlaybackRate || 1).toString();
        if (e.speedLabel)
          e.speedLabel.textContent =
            (cfg.defaultPlaybackRate || 1).toFixed(2) + "x";
      }

      // ensure loop UI reflects default
      updateLoopUI();
    }

    // Public: play one media (audio or video)
    // Public: play one media (audio or video)
    function playSound(soundFileName, iconNode) {
      if (typeof cfg.resetIcons === "function") cfg.resetIcons();

      if (!soundFileName || soundFileName.trim() === "x") return;

      const parts =
        typeof cfg.getSoundStartEnd === "function"
          ? cfg.getSoundStartEnd(soundFileName)
          : (function (s) {
              return s.split("/");
            })(soundFileName);

      const fileName = parts[0];
      const start = parts.length > 1 ? parseFloat(parts[1]) : null;
      const end = parts.length > 2 ? parseFloat(parts[2]) : null;

      // ✅ Xác định xem có phải video không
      const isVideo =
        fileName.endsWith(".mp4") ||
        fileName.endsWith(".mov") ||
        fileName.endsWith(".mkv") ||
        fileName.endsWith(".webm");

      // ✅ Chọn đúng đường dẫn theo loại file
      const basePath = cfg.global_const
        ? isVideo
          ? cfg.global_const.PATH_VIDEO
          : cfg.global_const.PATH_SOUND
        : "";

      // ✅ Nếu không có đuôi file → luôn mặc định thêm .mp3
      let url = basePath + fileName;
      if (!/\.(mp3|mp4|mov|mkv|webm)$/i.test(fileName)) {
        url += ".mp3";
      }

      stopAudio();

      currentIcon = iconNode;

      // tạo media element (video nếu là mp4,…)
      createMediaElement(url);

      cfg.changeImageUrl(cfg.iconPathPlaying, iconNode);

      // hiển thị panel nếu bật auto
      if (cfg.autoShowPanel) {
        showPanel(cfg.iconPathPlaying, fileName);
      }

      // đặt thời điểm bắt đầu nếu có
      if (start && mediaEl) {
        try {
          mediaEl.currentTime = start;
        } catch (e) {
          // ignore, set sau khi metadata load
        }
      }

      attachMediaUI(iconNode, start, end);

      const e = panelEls();
      const icon = e.playpauseBtn && e.playpauseBtn.querySelector("i");
      if (icon) icon.className = "bi bi-pause-fill";

      // đảm bảo play sau khi metadata load
      mediaEl.play().catch((err) => {
        if (mediaEl && !mediaEl._loadedHandlerAttached) {
          mediaEl._loadedHandlerAttached = true;
          const onMeta = function () {
            try {
              mediaEl.play().catch(() => {});
            } catch (e) {}
            mediaEl.removeEventListener("loadedmetadata", onMeta);
            mediaEl._loadedHandlerAttached = false;
          };
          mediaEl.addEventListener("loadedmetadata", onMeta);
        }
      });
    }

    

    // Public API additions for playback rate
    function setPlaybackRate(rate) {
      try {
        const r = parseFloat(rate);
        if (!isFinite(r) || r <= 0) return;
        const e = panelEls();
        if (e && e.speed) e.speed.value = r.toString();
        if (e && e.speedLabel) e.speedLabel.textContent = r.toFixed(2) + 'x';
        if (mediaEl) mediaEl.playbackRate = r;
        cfg.defaultPlaybackRate = r;
      } catch (err) { }
    }
    function getPlaybackRate() {
      try {
        if (mediaEl) return mediaEl.playbackRate || cfg.defaultPlaybackRate || 1;
        const e = panelEls();
        return (e && parseFloat(e.speed.value)) || cfg.defaultPlaybackRate || 1;
      } catch (err) { return cfg.defaultPlaybackRate || 1; }
    }

    // public API
    return {
      init: init,
      playSound: playSound,
      stopAudio: stopAudio,
      showPanel: showPanel,
      hidePanel: hidePanel,
      setAutoShowPanel: function (flag) { cfg.autoShowPanel = !!flag; },
      setPlaybackRate: setPlaybackRate,
      getPlaybackRate: getPlaybackRate,
      getState: function () { return { mediaEl, currentIcon }; }
    };
  })();

  global.AudioService = AudioService;
})(window);
