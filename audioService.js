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

    // ✅ Biến lưu trữ subtitle
    let subtitleData = {};
    let subtitleTimeout = null;
    let currentFileName = '';
    let isFirstSubtitleLoad = true; // ✅ THÊM BIẾN NÀY
  
    // config
    const cfg = {
      iconPathPlaying: ICON_PLAYING, //'assets/music_icon.svg'
      iconPathIdle: ICON_AUDIO, // 'assets/audio_play_icon.png'
      resetIcons: null,
      changeImageUrl: null,
      getSoundStartEnd: null,
      global_const: null,
      autoShowPanel: true,
      onClose: null,
      defaultPlaybackRate: 1, 
    };

    // create panel HTML if not exist
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
     <button id="acp-loop" class="btn btn-sm btn-primary" title="Toggle loop" aria-pressed="true"><i class="bi bi-arrow-repeat" style="font-size:14px;"></i></button>
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
</div>

<!-- ✅ OVERLAY SUBTITLE CUTE CHO TRẺ EM -->
<div id="subtitle-overlay" style="
  display: none;
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 100000;
  background: linear-gradient(135deg, #FFB6C1 0%, #FF69B4 100%);
  color: white;
  padding: 20px 40px;
  border-radius: 20px;
  font-size: 24px;
  font-weight: 600;
  text-align: center;
  backdrop-filter: blur(15px);
  max-width: 80vw;
  word-wrap: break-word;
  box-shadow: 0 8px 25px rgba(255, 105, 180, 0.3);
  border: 3px solid #FF1493;
  font-family: 'Comic Sans MS', 'Arial Rounded MT Bold', 'Arial', sans-serif;
  text-shadow: 1px 1px 2px rgba(0,0,0,0.2);
">
  <div id="subtitle-text" style="text-shadow: 1px 1px 3px rgba(0,0,0,0.3); line-height: 1.4;"></div>
</div>

<style>
  @keyframes subtitleFadeIn {
    from { 
      opacity: 0; 
      transform: translate(-50%, -40%); 
    }
    to { 
      opacity: 1; 
      transform: translate(-50%, -50%); 
    }
  }
  
  @keyframes subtitleFadeOut {
    from { 
      opacity: 1; 
      transform: translate(-50%, -50%); 
    }
    to { 
      opacity: 0; 
      transform: translate(-50%, -60%); 
    }
  }
  
  .subtitle-visible {
    animation: subtitleFadeIn 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards !important;
  }
  
  .subtitle-hidden {
    animation: subtitleFadeOut 0.3s cubic-bezier(0.55, 0.085, 0.68, 0.53) forwards !important;
  }
  
  #subtitle-overlay {
    transition: all 0.3s ease !important;
  }
</style>`;

      const div = document.createElement('div');
      div.innerHTML = html;
      document.body.appendChild(div);
      
      console.log('Subtitle overlay created in DOM');
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

      // ✅ ẨN SUBTITLE KHI DỪNG
      hideSubtitle();

      mediaEl = null;
      _timeUpdateHandler = null;
      _endedHandler = null;
      currentIcon = null;
      currentFileName = '';
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

      // Play/pause toggle
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

    // ✅ HÀM LOAD SUBTITLE
    async function loadSubtitleFile(audioFileName) {
      try {
        const subtitleFileName = audioFileName.replace('.mp3', '.txt').replace('.mp4', '.txt');
        
        // Tạo đường dẫn subtitle
        let subtitlePath;
        if (cfg.global_const && cfg.global_const.PATH_SOUND) {
          subtitlePath = cfg.global_const.PATH_SOUND + 'txt/' + subtitleFileName;
        } else {
          subtitlePath = subtitleFileName;
        }
        
        console.log('Loading subtitle from:', subtitlePath);
        
        const response = await fetch(subtitlePath);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        const text = await response.text();
        console.log('Subtitle content loaded, first 100 chars:', text.substring(0, 100));
        
        // Parse data
        const lines = text.split('\n').filter(line => line.trim());
        subtitleData[audioFileName] = [];
        
        lines.forEach(line => {
          const parts = line.split('/');
          if (parts.length >= 4) {
            const file = parts[0];
            const start = parseFloat(parts[1]);
            const end = parseFloat(parts[2]);
            const text = parts.slice(3).join('/').replace(/;$/, '');
            
            subtitleData[audioFileName].push({ start, end, text });
          }
        });
        
        console.log(`Loaded ${subtitleData[audioFileName].length} subtitles for ${audioFileName}`);

        // ✅ ĐÁNH DẤU ĐÃ LOAD XONG LẦN ĐẦU
        if (isFirstSubtitleLoad) {
          isFirstSubtitleLoad = false;
        }

        return subtitleData[audioFileName];
        
      } catch (error) {
        console.log('Error loading subtitle file:', error.message);
        return [];
      }
    }

    // ✅ HÀM LẤY SUBTITLE THEO THỜI GIAN
    function getCurrentSubtitle(audioFileName, currentTime) {
      const subtitles = subtitleData[audioFileName];
      if (!subtitles) return null;
      
      const activeSub = subtitles.find(sub => 
        currentTime >= sub.start && currentTime <= sub.end
      );
      
      return activeSub ? activeSub.text : null;
    }

  function showSubtitle(text) {
    const overlay = document.getElementById('subtitle-overlay');
    const textEl = document.getElementById('subtitle-text');
    
    console.log('🎬 showSubtitle called:', { 
        text: text,
        overlayExists: !!overlay,
        textElExists: !!textEl
    });
    
    if (overlay && textEl) {
        try {
            // Clear timeout cũ nếu có
            if (subtitleTimeout) {
                clearTimeout(subtitleTimeout);
                subtitleTimeout = null;
            }
            
            // Remove classes cũ
            overlay.classList.remove('subtitle-hidden', 'subtitle-visible');
            
            // Set text mới
            textEl.textContent = text;
            
            // Hiển thị với hiệu ứng
            setTimeout(() => {
                overlay.style.display = 'block';
                
                // ✅ MÀU SẮC CUTE CHO TRẺ EM
                // overlay.style.background = 'linear-gradient(135deg, #FFB6C1 0%, #FF69B4 100%)'; // Hồng pastel
                // overlay.style.color = 'white'; // Chữ trắng cho dễ đọc
                // overlay.style.border = '3px solid #FF1493'; // Viền hồng đậm
                // overlay.style.fontSize = '24px';
                // overlay.style.fontWeight = 'bold';
                // overlay.style.boxShadow = '0 8px 25px rgba(255, 105, 180, 0.3)'; // Shadow hồng nhẹ
                // overlay.style.zIndex = '100000';
                // overlay.style.textShadow = '1px 1px 2px rgba(0,0,0,0.2)'; // Shadow chữ
                
                // Force reflow
                void overlay.offsetWidth;
                overlay.classList.add('subtitle-visible');
                
                console.log('✅ Subtitle VISIBLE with cute pink colors!');
                
                // ✅ XÓA INDICATOR NẾU CÓ
                const existingIndicator = document.getElementById('subtitle-indicator');
                if (existingIndicator) {
                    existingIndicator.remove();
                }
                
            }, 10);
            
            return true;
        } catch (error) {
            console.error('❌ Error in showSubtitle:', error);
            return false;
        }
    }
    console.error('❌ showSubtitle failed - elements not found');
    return false;
}

// ✅ ĐẢM BẢO HÀM NÀY TỒN TẠI
function checkOverlayInDOM() {
    try {
        const overlay = document.getElementById('subtitle-overlay');
        if (!overlay) {
            console.error('❌ Overlay not found in DOM');
            return;
        }
        
        console.log('🔍 Overlay DOM check:', {
            parent: overlay.parentNode ? overlay.parentNode.tagName : 'no parent',
            inBody: document.body.contains(overlay),
            computedStyle: {
                display: window.getComputedStyle(overlay).display,
                visibility: window.getComputedStyle(overlay).visibility,
                opacity: window.getComputedStyle(overlay).opacity,
                zIndex: window.getComputedStyle(overlay).zIndex,
                position: window.getComputedStyle(overlay).position
            }
        });
        
        // Kiểm tra xem có element nào che overlay không
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        const elementsAtPoint = document.elementsFromPoint(centerX, centerY);
        
        console.log('🎯 Elements at center point:', elementsAtPoint.map(el => 
            `${el.tagName}${el.id ? '#' + el.id : ''}${el.className ? '.' + el.className : ''}`
        ));
        
        // Kiểm tra xem overlay có trong danh sách không
        const isOverlayVisible = elementsAtPoint.some(el => el === overlay);
        console.log('👀 Is overlay visible at center?', isOverlayVisible);
        
    } catch (error) {
        console.error('❌ Error in checkOverlayInDOM:', error);
    }
}


    // ✅ HÀM ẨN SUBTITLE
function hideSubtitle() {
  const overlay = document.getElementById('subtitle-overlay');
  if (overlay) {
    // ✅ CHỈ ẨN NẾU ĐANG HIỂN THỊ
    if (overlay.style.display !== 'block') return;
    
    // Clear timeout
    if (subtitleTimeout) {
      clearTimeout(subtitleTimeout);
      subtitleTimeout = null;
    }
    
    console.log('🔻 Hiding subtitle with animation');
    
    // Hiệu ứng ẩn
    overlay.classList.remove('subtitle-visible');
    overlay.classList.add('subtitle-hidden');
    
    // Ẩn hoàn toàn sau khi animation kết thúc
    setTimeout(() => {
      overlay.style.display = 'none';
      overlay.classList.remove('subtitle-hidden');
    }, 300);
  }
}

// ✅ HÀM CHUYỂN SUBTITLE - ĐẢM BẢO LUÔN HIỂN THỊ
function switchSubtitle(text) {
    const overlay = document.getElementById('subtitle-overlay');
    const textEl = document.getElementById('subtitle-text');
    
    console.log('=== switchSubtitle CALLED ===', {
        text: text,
        hasOverlay: !!overlay,
        hasTextEl: !!textEl,
        overlayDisplay: overlay ? overlay.style.display : 'no overlay',
        currentText: textEl ? textEl.textContent : 'no textEl'
    });
    
    if (!overlay || !textEl) {
        console.error('❌ Subtitle elements not found!');
        return;
    }
    
    const currentText = textEl.textContent;
    
    // ✅ LUÔN HIỂN THỊ SUBTITLE MỚI, KHÔNG BAO GIỜ TỰ ẨN
    if (currentText !== text) {
        console.log('🔄 Switching to new subtitle:', text);
        
        if (overlay.style.display === 'block' && currentText) {
            // Đang có subtitle cũ -> chuyển mượt mà
            overlay.classList.remove('subtitle-visible');
            overlay.classList.add('subtitle-hidden');
            
            // setTimeout(() => {
            //     textEl.textContent = text;
            //     overlay.classList.remove('subtitle-hidden');
            //     overlay.classList.add('subtitle-visible');
            //     console.log('✅ New subtitle displayed:', text);
            // }, 150);

            showSubtitle(text);
        } else {
            // Chưa có subtitle hoặc đang ẩn -> hiển thị trực tiếp
            showSubtitle(text);
        }
    }
    // Nếu subtitle giống nhau thì không làm gì cả - giữ nguyên hiển thị
}


    // attach handlers to current mediaEl
    function attachMediaUI(iconNode, start, end) {
      if (!mediaEl) return;
      setupPanelEvents();
      const e = panelEls();

      // LẤY FILENAME ĐỂ LOAD SUBTITLE
      let rawSound = currentIcon ? currentIcon.getAttr("sound") : iconNode ? iconNode.getAttr("sound") : "Unknown";
      let fileName = String(rawSound || 'Unknown').split('/')[0];      
      currentFileName = fileName;
      
      console.log('Attach media UI - File name:', fileName);

      if (_timeUpdateHandler) mediaEl.removeEventListener('timeupdate', _timeUpdateHandler);
      if (_endedHandler) mediaEl.removeEventListener('ended', _endedHandler);

    _timeUpdateHandler = function () {
  let cur = mediaEl.currentTime;
  let dur = mediaEl.duration || 0;

  console.log('⏰ TimeUpdate - Current time:', cur.toFixed(2), 'File:', currentFileName);

  // ✅ HIỂN THỊ SUBTITLE THEO THỜI GIAN - FIX LẦN ĐẦU
  const currentSubtitle = getCurrentSubtitle(currentFileName, cur);
  console.log('🔍 Subtitle search result:', currentSubtitle);
  
  if (currentSubtitle) {
    const currentDisplay = document.getElementById('subtitle-text').textContent;
    console.log('📊 Current display vs new:', {
      current: currentDisplay,
      new: currentSubtitle,
      isDifferent: currentSubtitle !== currentDisplay
    });
    
    if (currentSubtitle !== currentDisplay) {
      console.log('🔄 Calling switchSubtitle...');
      
      // ✅ QUAN TRỌNG: Clear timeout trước khi hiển thị subtitle mới
      if (subtitleTimeout) {
        clearTimeout(subtitleTimeout);
        subtitleTimeout = null;
      }
      
      switchSubtitle(currentSubtitle);
    }
  } else {
    // ✅ ẨN SUBTITLE SAU 0.5 GIÂY - CHỈ KHI ĐANG CÓ SUBTITLE HIỂN THỊ
    const currentDisplay = document.getElementById('subtitle-text').textContent;
    if (currentDisplay && currentDisplay.trim() !== '') {
      console.log('🚫 No subtitle found, will hide after 0.5s delay');
      
      // Clear timeout cũ nếu có
      if (subtitleTimeout) {
        clearTimeout(subtitleTimeout);
      }
      
      // ✅ THÊM ĐIỀU KIỆN: Chỉ ẩn nếu vẫn không có subtitle sau 0.5s
      subtitleTimeout = setTimeout(() => {
        const currentTimeCheck = mediaEl.currentTime;
        const currentSubtitleCheck = getCurrentSubtitle(currentFileName, currentTimeCheck);
        
        // Chỉ ẩn nếu vẫn không có subtitle phù hợp và media vẫn đang chạy
        if (!currentSubtitleCheck && !mediaEl.paused) {
          console.log('⏰ 0.5s passed, still no subtitle - HIDING');
          hideSubtitle();
        } else if (currentSubtitleCheck) {
          console.log('🎯 Found subtitle during delay - KEEPING');
        }
      }, 500);
    }
  }


        if (typeof end === 'number' && !isNaN(end)) {
          // We're playing a clipped segment [start .. end]
          if (cur >= end) {
            if (isLoop) {
              try { mediaEl.currentTime = start || 0; } catch (e) { }
              if (mediaEl.paused) mediaEl.play().catch(() => { });
              if (typeof cfg.changeImageUrl === 'function') cfg.changeImageUrl(cfg.iconPathPlaying, iconNode);
              const icon = e.playpauseBtn && e.playpauseBtn.querySelector('i'); 
              if (icon) icon.className = 'bi bi-pause-fill';
            } else {
              if (!mediaEl.paused) mediaEl.pause();
              try { mediaEl.currentTime = start || 0; } catch (e) { }
              if (typeof cfg.changeImageUrl === 'function') cfg.changeImageUrl(cfg.iconPathIdle, iconNode);
              const icon = e.playpauseBtn && e.playpauseBtn.querySelector('i'); 
              if (icon) icon.className = 'bi bi-play-fill';
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

        // ✅ ẨN SUBTITLE KHI KẾT THÚC (nếu không loop)
        if (!isLoop) {
          setTimeout(() => {
            hideSubtitle();
          }, 1000);
        }

        if (isLoop) {
          try { mediaEl.currentTime = start || 0; } catch (e) { }
          mediaEl.play().catch(() => { });
          const icon = e.playpauseBtn && e.playpauseBtn.querySelector('i'); 
          if (icon) icon.className = 'bi bi-pause-fill';
        } else {
          const icon = e.playpauseBtn && e.playpauseBtn.querySelector('i'); 
          if (icon) icon.className = 'bi bi-play-fill';
          if (e.progress) e.progress.value = 0;
        }
      };

      mediaEl.addEventListener('timeupdate', _timeUpdateHandler);
      mediaEl.addEventListener('ended', _endedHandler);

      // ensure loop property and attribute are applied
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

      // set start time safely when metadata available
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

    // create media element (audio or video)
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
      cfg.resetIcons = typeof options.resetIcons === "function" ? options.resetIcons : null;
      cfg.changeImageUrl = typeof options.changeImageUrl === "function" ? options.changeImageUrl : null;
      cfg.getSoundStartEnd = typeof options.getSoundStartEnd === "function" ? options.getSoundStartEnd : null;
      cfg.global_const = options.global_const || null;
      
      if (typeof options.autoShowPanel !== "undefined")
        cfg.autoShowPanel = !!options.autoShowPanel;
      if (typeof options.defaultPlaybackRate !== "undefined")
        cfg.defaultPlaybackRate = parseFloat(options.defaultPlaybackRate) || 1;

      cfg.onClose = typeof options.onClose === "function" ? options.onClose : null;

      ensurePanel();
      setupPanelEvents();

      // ensure UI speed control reflects default
      const e = panelEls();
      if (e && e.speed) {
        e.speed.value = (cfg.defaultPlaybackRate || 1).toString();
        if (e.speedLabel)
          e.speedLabel.textContent = (cfg.defaultPlaybackRate || 1).toFixed(2) + "x";
      }

      // ensure loop UI reflects default
      updateLoopUI();
    }

    // Public: play one media (audio or video)
    async function playSound(soundFileName, iconNode) {
      if (typeof cfg.resetIcons === "function") cfg.resetIcons();

      if (!soundFileName || soundFileName.trim() === "x") return;

      const parts = typeof cfg.getSoundStartEnd === "function" ? cfg.getSoundStartEnd(soundFileName) : soundFileName.split("/");

      const fileName = parts[0];
      const start = parts.length > 1 ? Math.floor(parseFloat(parts[1])) : null;
      var end = parts.length > 2 ? Math.ceil(parseFloat(parts[2]))  : null;
      if (start && end) {
        const duration = end - start;
        if (duration <= 2) {
          end =  end + 0.5;
        } else {
          end =  end + 1;
        }
        console.log(duration);        
      }

      console.log('Playing:', fileName, start, end);

      // Xử lý icon_type
      var icon_type = iconNode.getAttr("icon_type") || "1";
      if ("1" == icon_type) { // Play Icon (audio)
        // Continue
      } else if ("2" == icon_type) { // Play Icon (video)
        // Continue  
      } else if ("3" == icon_type) { // Play Icon (text)
        VocabModal.load(fileName); 
        const modal = new bootstrap.Modal(document.getElementById('vocabModal'));
        modal.show();      
        return;
      } else if ("4" == icon_type) { // Play Icon (Image)
        // Continue
      } else if ("5" == icon_type) { // Play Icon (Next Pre page)
        $("#json-dropdown").val(fileName).change();
        return;
      }

      // Xác định xem có phải video không
      const isVideo = fileName.endsWith(".mp4") ||
                      fileName.endsWith(".mov") ||
                      fileName.endsWith(".mkv") ||
                      fileName.endsWith(".webm");

      // Chọn đúng đường dẫn theo loại file
      const basePath = cfg.global_const ? (isVideo ? cfg.global_const.PATH_VIDEO : cfg.global_const.PATH_SOUND) : "";

      // Nếu không có đuôi file → luôn mặc định thêm .mp3
      let url = basePath + fileName;
      if (!/\.(mp3|mp4|mov|mkv|webm)$/i.test(fileName)) {
        url += ".mp3";
      }

      // ✅ LOAD SUBTITLE FILE
      await loadSubtitleFile(fileName);

      stopAudio();

      currentIcon = iconNode;
      currentFileName = fileName;

      // tạo media element
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
      setLoop: function(flag) {
        isLoop = !!flag;
        try {
          updateLoopUI();
          if (mediaEl) {
            try { mediaEl.loop = !!isLoop; } catch(e) {}
            if (mediaEl.tagName && mediaEl.tagName.toLowerCase() === 'video') {
              if (isLoop) mediaEl.setAttribute('loop','');
              else mediaEl.removeAttribute('loop');
            }
          }
        } catch (e) {}
      },
      getLoop: function() { return !!isLoop; },
      getState: function () { return { mediaEl, currentIcon }; },
      showSubtitle: showSubtitle,
      hideSubtitle: hideSubtitle,
      switchSubtitle: switchSubtitle
    };
  })();

  global.AudioService = AudioService;
})(window);