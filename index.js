let line_color = " #ff6347"; // Tomato
let line_stroke_width = 3;
const selected_color = 'black';
let is_auto_ShowPanel = true;

$(document).ready(function () {

  let PATH_ROOT = "assets/books/27/";
  let APP_DATA = null;

  let DATA_TYPE = "student37";
  let CURRENT_PAGE_INDEX = 2;
  let MAX_PAGE_NUM = 107;
  let MIN_PAGE_NUM = 1;
  createRadioButtons();

  const stage = new Konva.Stage({
    container: 'canvas',
    width: window.innerWidth,
    height: window.innerHeight,
    draggable: false,
  });

  // Create a new Map
  let ICON_SIZE = 18;
  const RUN_URL_SERVER = "https://zizi-app.onrender.com/";
  const RUN_URL_LOCAL = "http://localhost:8080/";
  const API_METHOD = "api/sheets/line_by_key"
  const API_ALL_METHOD = "api/sheets/line_all"

  const global_const = {
    get PATH_ASSETS_IMG() { return PATH_ROOT + DATA_TYPE + "/img/"; },
    get PATH_IMG() { return PATH_ROOT + DATA_TYPE + "/img/"; },
    get PATH_SOUND() { return PATH_ROOT + DATA_TYPE + "/sound/"; },
    get PATH_JSON() { return PATH_ROOT + DATA_TYPE + "/data/X.json"; },
    get SERVER_API_ALL_METHOD() {
      const hostname = window.location.hostname;
      if (hostname === 'localhost' || hostname === '127.0.0.1') return RUN_URL_LOCAL + API_ALL_METHOD;
      else return RUN_URL_SERVER + API_ALL_METHOD;
    },
    get SERVER_URL() {
      const hostname = window.location.hostname;
      if (hostname === 'localhost' || hostname === '127.0.0.1') return RUN_URL_LOCAL + API_METHOD;
      else return RUN_URL_SERVER + API_METHOD;
    }
  };

  const backgroundLayer = new Konva.Layer();
  const iconLayer = new Konva.Layer();
  const drawingLayer = new Konva.Layer();
  stage.add(backgroundLayer);
  stage.add(iconLayer);
  stage.add(drawingLayer);

  // zoom config
  let zoomLevel = 1;
  const zoomStep = 0.2;
  const minZoom = 0.5;
  const maxZoom = 10;

  // Drawing state
  let isDrawingMode = false;
  let isDrawing = false;
  let lastLine = null;
  let lines = [];
  let selectedLine = null;

  // Helper: get pointer position translated to stage coordinates
  function getRelativePointerPosition() {
    const pos = stage.getPointerPosition();
    if (!pos) return { x: 0, y: 0 };
    const transform = stage.getAbsoluteTransform().copy();
    transform.invert();
    return transform.point(pos);
  }

  // ------------------------- Animation & bounds helpers -------------------------
  function animateStageTo(newScale, newPos, duration = 0.18) {
    duration = Math.max(0.02, duration);
    if (stage._activeTween) {
      try { stage._activeTween.destroy(); } catch (e) { }
      stage._activeTween = null;
    }
    const tween = new Konva.Tween({
      node: stage,
      duration: duration,
      easing: Konva.Easings.EaseInOut,
      x: newPos.x,
      y: newPos.y,
      scaleX: newScale,
      scaleY: newScale
    });
    stage._activeTween = tween;
    tween.play();
    tween.onFinish = function () {
      stage.batchDraw();
      try { tween.destroy(); } catch (e) { }
      stage._activeTween = null;
    };
  }

  // clamp position so backgroundImage stays visible
  function clampPositionForScale(desiredX, desiredY, scale) {
    if (!backgroundImage) return { x: desiredX, y: desiredY };

    const cw = stage.width();
    const ch = stage.height();

    const bgX = backgroundImage.x();
    const bgY = backgroundImage.y();
    const bgW = backgroundImage.width();
    const bgH = backgroundImage.height();

    const maxX = -bgX * scale;
    const minX = cw - (bgX + bgW) * scale;

    const maxY = -bgY * scale;
    const minY = ch - (bgY + bgH) * scale;

    let finalX = desiredX;
    let finalY = desiredY;

    if (minX > maxX) {
      const contentWidth = bgW * scale;
      finalX = (cw - contentWidth) / 2 - bgX * scale;
    } else {
      finalX = Math.min(maxX, Math.max(minX, desiredX));
    }

    if (minY > maxY) {
      const contentHeight = bgH * scale;
      finalY = (ch - contentHeight) / 2 - bgY * scale;
    } else {
      finalY = Math.min(maxY, Math.max(minY, desiredY));
    }

    return { x: finalX, y: finalY };
  }

  // ------------------------- UI controls (zoom buttons, draw, lock, etc.) -------------------------
  $('#zoom-in').on('click', function () {
    const oldScale = stage.scaleX();
    const newScale = Math.min(maxZoom, oldScale + zoomStep);
    const center = { x: stage.width() / 2, y: stage.height() / 2 };
    const mousePointTo = { x: (center.x - stage.x()) / oldScale, y: (center.y - stage.y()) / oldScale };
    const desiredPos = { x: center.x - mousePointTo.x * newScale, y: center.y - mousePointTo.y * newScale };
    const clamped = clampPositionForScale(desiredPos.x, desiredPos.y, newScale);
    zoomLevel = newScale;
    animateStageTo(newScale, clamped, 0.2);
  });

  $('#reset-zoom').on('click', function () {
    const clamped = clampPositionForScale(0, 0, 1);
    zoomLevel = 1;
    animateStageTo(1, clamped, 0.25);
  });

  $('#zoom-out').on('click', function () {
    const oldScale = stage.scaleX();
    const newScale = Math.max(minZoom, oldScale - zoomStep);
    const center = { x: stage.width() / 2, y: stage.height() / 2 };
    const mousePointTo = { x: (center.x - stage.x()) / oldScale, y: (center.y - stage.y()) / oldScale };
    const desiredPos = { x: center.x - mousePointTo.x * newScale, y: center.y - mousePointTo.y * newScale };
    const clamped = clampPositionForScale(desiredPos.x, desiredPos.y, newScale);
    zoomLevel = newScale;
    animateStageTo(newScale, clamped, 0.2);
  });

  $('#draw').on('click', function () { toggleDrawIcon(); });

  $('#id_ShowPanel').on('click', function () {
    is_auto_ShowPanel = !is_auto_ShowPanel;
    $(this).toggleClass('btn-success', is_auto_ShowPanel).toggleClass('btn-dark', !is_auto_ShowPanel);
    $('#audio-control-panel').toggle(is_auto_ShowPanel);
  });

  function toggleDrawIcon(isDraw = false) {
    const $btn = $('#draw');
    if (isDraw || isDrawingMode) {
      isDrawingMode = false;
      stage.container().style.cursor = 'default';
      $btn.removeClass('btn-danger').addClass('btn-dark');
    } else {
      stage.container().style.cursor = 'crosshair';
      isDrawingMode = true;
      toggleLockIcon(true);
      $btn.removeClass('btn-dark').addClass('btn-danger');
    }
  }

  $('#lock').on('click', function () { toggleLockIcon(); });

  function toggleLockIcon(isLock = false) {
    const button = document.getElementById("lock");
    const icon = button.querySelector("i");
    if (isLock) {
      icon.classList.remove("bi-unlock-fill"); icon.classList.add("bi-lock-fill"); stage.draggable(false);
    } else {
      if (icon.classList.contains("bi-lock-fill")) {
        icon.classList.remove("bi-lock-fill"); icon.classList.add("bi-unlock-fill");
        stage.draggable(true); toggleDrawIcon(true);
      } else {
        icon.classList.remove("bi-unlock-fill"); icon.classList.add("bi-lock-fill");
        stage.draggable(false);
      }
    }
  }

  // Wheel zoom (mouse)
  stage.on('wheel', function (event) {
    if ($('#lock-icon').hasClass('bi-unlock-fill')) {
      event.evt.preventDefault();
      const oldScale = stage.scaleX();
      const scaleBy = 1.1;
      let newScale = event.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy;
      newScale = Math.max(minZoom, Math.min(maxZoom, newScale));
      zoomLevel = newScale;
      const pointer = stage.getPointerPosition();
      if (pointer) {
        const mousePointTo = { x: (pointer.x - stage.x()) / oldScale, y: (pointer.y - stage.y()) / oldScale };
        const desiredPos = { x: pointer.x - mousePointTo.x * newScale, y: pointer.y - mousePointTo.y * newScale };
        const clamped = clampPositionForScale(desiredPos.x, desiredPos.y, newScale);
        animateStageTo(newScale, clamped, 0.18);
      } else {
        const clamped = clampPositionForScale(stage.x(), stage.y(), newScale);
        animateStageTo(newScale, clamped, 0.18);
      }
    }
  });

  // Double-click zoom (mouse)
  stage.on('dblclick', (e) => {
    const pointer = stage.getPointerPosition();
    if (!pointer) return;
    const oldScale = stage.scaleX();
    const newScale = Math.min(maxZoom, oldScale + zoomStep);
    const mousePointTo = { x: (pointer.x - stage.x()) / oldScale, y: (pointer.y - stage.y()) / oldScale };
    const desiredPos = { x: pointer.x - mousePointTo.x * newScale, y: pointer.y - mousePointTo.y * newScale };
    const clamped = clampPositionForScale(desiredPos.x, desiredPos.y, newScale);
    zoomLevel = newScale;
    animateStageTo(newScale, clamped, 0.2);
  });

  // ------------------------- Pointer-based input handlers (prevents accidental draw while pinching) -------------------------
  // State for pinch & pointer tracking
  const container = stage.container();
  let activePointers = new Map(); // pointerId -> {x,y,type}
  const TOUCH_DRAW_DELAY = 50; // ms
  let touchDrawTimer = null;
  let pinchState = { isPinching: false, startDist: 0, startScale: 1, startCenter: { x: 0, y: 0 } };

  // Swipe config (tweak nếu cần)
  const SWIPE_THRESHOLD = 80;         // px ngang tối thiểu để kích hoạt chuyển trang
  const SWIPE_MAX_VERTICAL = 70;      // nếu di chuyển dọc lớn hơn giá trị này -> hủy swipe
  const SWIPE_COOLDOWN = 600;         // ms: tránh quẹt liên tiếp quá nhanh

  let swipeState = {
    active: false,
    startX: 0,
    startY: 0,
    startTime: 0,
    fired: false
  };
  let lastSwipeTime = 0;

  // convert client coords to stage coords using transform
  function clientToStage(clientX, clientY) {
    const rect = container.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const transform = stage.getAbsoluteTransform().copy();
    transform.invert();
    return transform.point({ x, y });
  }

  function cancelPendingDraw() {
    if (touchDrawTimer) { clearTimeout(touchDrawTimer); touchDrawTimer = null; }
  }
  function cancelActiveDrawing() {
    if (isDrawing) {
      isDrawing = false;
      lastLine = null;
    }
  }

  // <-- place near other pointer state variables -->
  let lastTapTime = 0;
  let lastTapPos = { x: 0, y: 0 };
  const DOUBLE_TAP_THRESHOLD = 300; // ms
  const DOUBLE_TAP_DISTANCE = 30; // px

  // Replace pointerdown handler with this:
  container.addEventListener('pointerdown', function (evt) {
    try { container.setPointerCapture(evt.pointerId); } catch (e) { }
    if (evt.pointerType === 'touch') evt.preventDefault();

    // --- double-tap detection (touch) ---
    if (evt.pointerType === 'touch') {
      const now = Date.now();
      const dx = evt.clientX - (lastTapPos?.x || 0);
      const dy = evt.clientY - (lastTapPos?.y || 0);
      const dist = Math.hypot(dx, dy);

      if (now - lastTapTime <= DOUBLE_TAP_THRESHOLD && dist <= DOUBLE_TAP_DISTANCE) {
        // double-tap: zoom in
        lastTapTime = 0;
        lastTapPos = { x: 0, y: 0 };
        cancelPendingDraw();
        cancelActiveDrawing();

        const oldScale = stage.scaleX();
        const newScale = Math.min(maxZoom, oldScale + zoomStep);
        zoomLevel = newScale;
        const pointer = { x: evt.clientX, y: evt.clientY };
        const mousePointTo = { x: (pointer.x - stage.x()) / oldScale, y: (pointer.y - stage.y()) / oldScale };
        const desiredPos = { x: pointer.x - mousePointTo.x * newScale, y: pointer.y - mousePointTo.y * newScale };
        const clamped = clampPositionForScale(desiredPos.x, desiredPos.y, newScale);
        animateStageTo(newScale, clamped, 0.2);
        pinchState.isPinching = false;
        return;
      }

      lastTapTime = now;
      lastTapPos = { x: evt.clientX, y: evt.clientY };
    }

    // Register pointer
    activePointers.set(evt.pointerId, { x: evt.clientX, y: evt.clientY, type: evt.pointerType });

    // If multi-pointer -> start pinch immediately
    if (activePointers.size >= 2) {
      pinchState.isPinching = true;
      const pts = Array.from(activePointers.values());
      const p1 = pts[0], p2 = pts[1];
      pinchState.startDist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      pinchState.startScale = stage.scaleX();
      pinchState.startCenter = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
      cancelPendingDraw();
      cancelActiveDrawing();
      stage.draggable(false);
      // Also disable swipe
      swipeState.active = false;
      return;
    }

    // SINGLE pointer: decide whether this is a swipe candidate or a draw candidate
    const pointerInfo = activePointers.values().next().value;

    // Map client->stage coords to check hit
    const stagePt = clientToStage(evt.clientX, evt.clientY);
    const hit = stage.getIntersection(stagePt);

    // Start swipe only when:
    // - touch
    // - only 1 pointer
    // - NOT in drawing mode (to avoid conflict)
    // - NOT starting on an icon (hit && hit.className === 'Image')
    if (evt.pointerType === 'touch' && activePointers.size === 1 && !isDrawingMode && !pinchState.isPinching && !(hit && hit.className === 'Image')) {
      // initialize swipe state
      swipeState.active = true;
      swipeState.startX = evt.clientX;
      swipeState.startY = evt.clientY;
      swipeState.startTime = Date.now();
      swipeState.fired = false;

      // prevent starting draw
      cancelPendingDraw();
      cancelActiveDrawing();
      // no return -> do not start drawing
      return;
    }

    // Otherwise follow normal drawing logic: (touch with small delay or immediate for mouse/pen)
    if (evt.pointerType === 'touch') {
      cancelPendingDraw();
      touchDrawTimer = setTimeout(() => {
        touchDrawTimer = null;
        if (pinchState.isPinching) return;
        if (!isDrawingMode) return;
        isDrawing = true;
        stage.draggable(false);
        const pt = clientToStage(pointerInfo.x, pointerInfo.y);
        lastLine = new Konva.Line({
          stroke: line_color,
          strokeWidth: line_stroke_width,
          globalCompositeOperation: 'source-over',
          points: [pt.x, pt.y],
          lineCap: 'round',
          lineJoin: 'round',
          saved_stroke: line_color
        });
        drawingLayer.add(lastLine);
        lines.push(lastLine);
      }, TOUCH_DRAW_DELAY);
    } else {
      // mouse/pen immediate
      if (!isDrawingMode) return;
      cancelPendingDraw();
      isDrawing = true;
      stage.draggable(false);
      const pt = clientToStage(evt.clientX, evt.clientY);
      lastLine = new Konva.Line({
        stroke: line_color,
        strokeWidth: line_stroke_width,
        globalCompositeOperation: 'source-over',
        points: [pt.x, pt.y],
        lineCap: 'round',
        lineJoin: 'round',
        saved_stroke: line_color
      });
      drawingLayer.add(lastLine);
      lines.push(lastLine);
    }
  }, { passive: false });

  // pointermove
  container.addEventListener('pointermove', function (evt) {
    if (!activePointers.has(evt.pointerId)) return;
    activePointers.set(evt.pointerId, { x: evt.clientX, y: evt.clientY, type: evt.pointerType });

    // If multi-pointer -> pinch behavior
    if (activePointers.size >= 2) {
      if (!pinchState.isPinching) {
        pinchState.isPinching = true;
        const pts0 = Array.from(activePointers.values());
        const a = pts0[0], b = pts0[1];
        pinchState.startDist = Math.hypot(b.x - a.x, b.y - a.y);
        pinchState.startScale = stage.scaleX();
        pinchState.startCenter = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        cancelPendingDraw();
        cancelActiveDrawing();
        swipeState.active = false;
      }

      // compute pinch scale & reposition
      const pts = Array.from(activePointers.values());
      const p1 = pts[0], p2 = pts[1];
      const curDist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      if (pinchState.startDist === 0) pinchState.startDist = curDist;
      const scaleFactor = curDist / pinchState.startDist;
      let newScale = pinchState.startScale * scaleFactor;
      newScale = Math.max(minZoom, Math.min(maxZoom, newScale));
      zoomLevel = newScale;

      const mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
      const oldScale = stage.scaleX();
      const mousePointTo = { x: (mid.x - stage.x()) / oldScale, y: (mid.y - stage.y()) / oldScale };
      const desiredPos = { x: mid.x - mousePointTo.x * newScale, y: mid.y - mousePointTo.y * newScale };
      const clamped = clampPositionForScale(desiredPos.x, desiredPos.y, newScale);
      animateStageTo(newScale, clamped, 0.02);

      if (evt.pointerType === 'touch') evt.preventDefault();
      return;
    }

    // SINGLE pointer: swipe handling (only when swipeState.active)
    if (swipeState.active) {
      const dx = evt.clientX - swipeState.startX;
      const dy = evt.clientY - swipeState.startY;

      // cancel swipe if too vertical
      if (Math.abs(dy) > SWIPE_MAX_VERTICAL) {
        swipeState.active = false;
      } else {
        // if threshold reached and not fired recently, trigger page change
        if (!swipeState.fired && Math.abs(dx) >= SWIPE_THRESHOLD && (Date.now() - lastSwipeTime > SWIPE_COOLDOWN)) {
          swipeState.fired = true;
          lastSwipeTime = Date.now();

          const isNext = dx < 0; // left swipe -> next, right swipe -> previous
          // small UX: cancel any playing audio before changing page
          AudioService.stopAudio();
          processNextPrePage(isNext);

          // optionally: provide small haptic/vibrate on mobile
          if (navigator.vibrate) navigator.vibrate(30);

          // hide swipe state (will be cleared on pointerup)
        }
      }

      // prevent default scroll while swiping
      if (evt.pointerType === 'touch') evt.preventDefault();
      return;
    }

    // If not swiping and not pinching, continue drawing if active
    if (pinchState.isPinching) {
      cancelPendingDraw();
      cancelActiveDrawing();
      return;
    }

    if (!isDrawing) return;
    const pt = clientToStage(evt.clientX, evt.clientY);
    if (!lastLine) return;
    const newPoints = lastLine.points().concat([pt.x, pt.y]);
    lastLine.points(newPoints);
    drawingLayer.batchDraw();
    lineAddEvents();
  }, { passive: false });

  function releasePointer(evt) {
    try { container.releasePointerCapture(evt.pointerId); } catch (e) { }
    activePointers.delete(evt.pointerId);

    // if pointer count drops below 2, exit pinch
    if (activePointers.size < 2 && pinchState.isPinching) {
      pinchState.isPinching = false;
      pinchState.startDist = 0;
    }

    // clear pending draw timer always on pointer up
    cancelPendingDraw();

    // finalize/cleanup swipe state
    if (swipeState.active) {
      // if swipe didn't reach threshold, we can optionally treat short flick as page change by velocity;
      // but for now we simply cancel
      swipeState.active = false;
      swipeState.fired = false;
    }

    // if no more pointers, finish drawing
    if (activePointers.size === 0) {
      if (isDrawing) {
        isDrawing = false;
        lastLine = null;
        if (document.getElementById('lock-icon') && document.getElementById('lock-icon').classList.contains('bi-unlock-fill')) {
          stage.draggable(true);
        } else {
          stage.draggable(false);
        }
      }
    }
  }


  container.addEventListener('pointerup', releasePointer, { passive: false });
  container.addEventListener('pointercancel', releasePointer, { passive: false });

  // ------------------------- Icons, audio, image loading, drawing persistence etc. -------------------------
  const iconSoundUrlInput = $('#icon-sound-url');
  const iconXInput = $('#icon-x');
  const iconYInput = $('#icon-y');
  const previous_page = $('#previous_page');
  const next_page = $('#next_page');

  let backgroundImage = null;
  let playIcons = [];
  let currentIcon = null;
  let iconPath_1 = "assets/play_icon.png";
  let iconPath_2 = "assets/music_icon.svg";

  function resetIcons() {
    const imageList = iconLayer.find('Image');
    imageList.forEach(function (icon) {
      if (currentIcon != icon) {
        const newImage = new Image();
        newImage.onload = function () { icon.image(newImage); iconLayer.batchDraw(); };
        newImage.src = iconPath_1;
      }
    });
  }

  function getSoundStartEnd(fileName) {
    var arr = fileName.split("/");
    if (arr.length > 1) return [arr[0], arr[1], arr[2]];
    return arr;
  }

  function changeImageUrl(newUrl, icon) {
    const newImage = new Image();
    newImage.onload = function () { icon.image(newImage); iconLayer.batchDraw(); };
    newImage.src = newUrl;
  }

  function addPlayIcon(x, y, sound) {
    if (sound && "x" == sound.trim()) return;
    const icon_size = getIconSize(ICON_SIZE);
    Konva.Image.fromURL(iconPath_1, function (icon) {
      icon.setAttrs({ x: x || Math.random() * (stage.width() - 50), y: y || Math.random() * (stage.height() - 50), width: icon_size, height: icon_size });
      icon.setAttr('sound', (sound || '').trim());
      function handleInteraction() {
        currentIcon = icon;
        iconSoundUrlInput.val(icon.getAttr('sound') || '');
        iconXInput.val(icon.x());
        iconYInput.val(icon.y());
        if (icon.getAttr('sound')) {
          AudioService.setAutoShowPanel(is_auto_ShowPanel);
          AudioService.playSound(icon.getAttr('sound'), currentIcon);
        } else {
          showToast('Not found the sound id!');
        }
      }
      icon.on('click', handleInteraction);
      icon.on('touchend', handleInteraction);
      playIcons.push(icon);
      icon.on('mouseover', function () { stage.container().style.cursor = 'pointer'; });
      icon.on('mouseout', function () {
        if (isDrawingMode) stage.container().style.cursor = 'crosshair'; else stage.container().style.cursor = 'default';
      });
      iconLayer.add(icon);
      icon.moveToTop();
    });
  }

  $('.add-icon').on('click', function () { addPlayIcon(); });

  function loadLinesByDraw(page) {
    if (page != null) {
      const data_line = getLinesByKey(page);
      if (data_line != null) {
        lines.forEach(line => line.destroy());
        lines = [];
        if (data_line) {
          data_line.forEach(savedLine => {
            const points = savedLine.points.map((point, index) =>
              index % 2 === 0
                ? (point * backgroundImage.width()) + backgroundImage.x()
                : (point * backgroundImage.height()) + backgroundImage.y()
            );
            const line = new Konva.Line({
              points: points,
              stroke: savedLine.stroke,
              strokeWidth: savedLine.strokeWidth,
              lineCap: savedLine.lineCap,
              lineJoin: savedLine.lineJoin,
              saved_stroke: savedLine.stroke
            });
            drawingLayer.add(line);
            lines.push(line);
          });
        }
        drawingLayer.batchDraw();
        lineAddEvents();
      }
    }
  }

  function lineAddEvents() {
    drawingLayer.getChildren().forEach((line) => {
      if (line.className === 'Line' && !line._hasLineEvents) {
        line._hasLineEvents = true;
        line.on('click', (e) => {
          e.cancelBubble = true;
          resetAllLineColors();
          selectedLine = line;
          line.stroke('black');
          drawingLayer.draw();
        });
        line.on('mouseover', () => { stage.container().style.cursor = 'pointer'; });
        line.on('mouseout', () => { if (isDrawingMode) stage.container().style.cursor = 'crosshair'; else stage.container().style.cursor = 'default'; });
      }
    });
  }

  function resetAllLineColors() {
    drawingLayer.getChildren().forEach((shape) => {
      if (shape.className === 'Line') {
        const saved_stroke = shape.getAttr('saved_stroke');
        shape.stroke(saved_stroke);
      }
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Delete' || e.key === 'Backspace') deleteSelectedLine();
  });

  function deleteSelectedLine() {
    if (selectedLine) {
      lines = removeLine(lines, selectedLine);
      selectedLine.remove();
      selectedLine = null;
      drawingLayer.draw();
    }
  }

  function loadPage() {
    AudioService.stopAudio();
    clearCanvas();
    $('#settingsModal').modal('hide');
    CURRENT_PAGE_INDEX = parseInt($('#json-dropdown').val(), 10);
    loadAssetJson(CURRENT_PAGE_INDEX);
    fitStageIntoParentContainer();
    stage.draggable(false);
  }

  $('#json-dropdown').change(function () { loadPage(); });

  function loadAssetJson(page) {
    const urlJson = global_const.PATH_JSON.replace("X", page);
    fetch(urlJson)
      .then(response => response.json())
      .then(data => {
        backgroundLayer.clear();
        iconLayer.clear();
        loadJsonBackgroundAndIcons(page, data);
      })
      .catch(error => console.error('Error loading JSON:', error));
  }

  function loadJsonBackgroundAndIcons(page, data) {
    if (data.background) {
      const imageObj = new Image();
      imageObj.onload = function () {
        if (backgroundImage) backgroundImage.destroy();
        adjustBackgroundImage(imageObj);
        playIcons.forEach(icon => icon.destroy());
        playIcons = [];
        data.icons.forEach(iconData => {
          const iconX = iconData.x * backgroundImage.width() + backgroundImage.x();
          const iconY = iconData.y * backgroundImage.height() + backgroundImage.y();
          addPlayIcon(iconX, iconY, iconData.sound);
        });
        listDrawingPagesDetailed(page.toString());
      };
      imageObj.src = global_const.PATH_ASSETS_IMG + data.background;
    }
  }

  function adjustBackgroundImage(imageObj) {
    const imageWidth = imageObj.width;
    const imageHeight = imageObj.height;
    const stageWidth = stage.width();
    const stageHeight = stage.height();
    let aspectRatio = imageWidth / imageHeight;
    let newWidth, newHeight;
    if (stageWidth / stageHeight > aspectRatio) {
      newWidth = stageHeight * aspectRatio;
      newHeight = stageHeight;
    } else {
      newWidth = stageWidth;
      newHeight = stageWidth / aspectRatio;
    }
    let x = 0, y = 0;
    if (isNotMobile()) { x = (stageWidth - newWidth) / 2; y = (stageHeight - newHeight) / 2; }
    backgroundImage = new Konva.Image({ x: x, y: y, image: imageObj, width: newWidth, height: newHeight, id: 'backgroundImage' });
    backgroundLayer.add(backgroundImage);
    backgroundLayer.batchDraw();
    stage.find('Image').forEach((image) => { image.moveToBottom(); });
    stage.on('resize', function () { fitStageIntoParentContainer(); });
    fitStageIntoParentContainer();
  }

  function fitStageIntoParentContainer() {
    stage.width(window.innerWidth);
    stage.height(window.innerHeight);
    stage.batchDraw();
  }

  window.addEventListener('resize', resizeEvent);
  window.addEventListener('beforeunload', function () { AudioService.stopAudio(); });

  let resizeTimer;
  function resizeEvent() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      fitStageIntoParentContainer();
    }, 200);
  }

  function clearCanvas() {
    AudioService.stopAudio();
    playIcons.forEach(function (icon) { icon.destroy(); });
    playIcons = [];
    iconLayer.batchDraw();
    backgroundLayer.destroyChildren(); backgroundLayer.draw();
    drawingLayer.destroyChildren(); drawingLayer.draw();
    fitStageIntoParentContainer();
  }

  function addClickAndTouchEvents(element, handler) {
    element.on('click', handler);
    element.on('touchend', handler);
  }

  function popDropdown(dropdown, text, start, end, default_index) {
    dropdown.empty();
    for (var i = start; i <= end; i++) {
      var option = $('<option>', { value: i, text: text + " " + i });
      if (i === default_index) option.prop('selected', true);
      dropdown.append(option);
    }
  }

  // const previous_page = $('#previous_page');
  // const next_page = $('#next_page');
  previous_page.on('click', function () { processNextPrePage(false); });
  next_page.on('click', function () { processNextPrePage(true); });

  function processNextPrePage(isNext = true) {
    AudioService.stopAudio();
    if (isNext) {
      CURRENT_PAGE_INDEX = CURRENT_PAGE_INDEX + 1;
      if (CURRENT_PAGE_INDEX > MAX_PAGE_NUM) CURRENT_PAGE_INDEX = MIN_PAGE_NUM;
    } else {
      CURRENT_PAGE_INDEX = CURRENT_PAGE_INDEX - 1;
      if (CURRENT_PAGE_INDEX < MIN_PAGE_NUM) CURRENT_PAGE_INDEX = MAX_PAGE_NUM;
    }
    $('#json-dropdown').val(CURRENT_PAGE_INDEX).change();
  }

  $('#id_line_stroke_width').on('change', function () { line_stroke_width = $(this).val(); });
  $('#clearButton').on('click', function () { clearCanvas(); });

  function showSpinner(color = '#007bff') { const spinnerIcon = document.querySelector('.spinner-icon'); spinnerIcon.style.color = color; document.getElementById('spinnerOverlay').style.display = 'flex'; }
  function hideSpinner() { document.getElementById('spinnerOverlay').style.display = 'none'; }

  $('input[name="options"]').on('click', function () {
    var selectedValue = $(this).val();
    var currentPageIndex = $(this).data('current-page-index');
    var maxPageNum = $(this).data('max-page-num');
    var minPageNum = $(this).data('min-page-num');
    if (selectedValue === 'math_page') {
      window.location.href = 'math.html';
    } else if (DATA_TYPE !== selectedValue) {
      DATA_TYPE = selectedValue;
      setPageInfo(DATA_TYPE, currentPageIndex, maxPageNum, minPageNum);
      popDropdown($('#json-dropdown'), "Page", MIN_PAGE_NUM, MAX_PAGE_NUM, CURRENT_PAGE_INDEX);
      APP_DATA = null;
      loadPage();
      $('#settingsModal').modal('hide');
    }
  });

  function setPageInfo(dataType, currentPageIndex, maxPageNum, minPageNum) {
    DATA_TYPE = dataType;
    CURRENT_PAGE_INDEX = currentPageIndex;
    MAX_PAGE_NUM = maxPageNum;
    MIN_PAGE_NUM = minPageNum;
  }

  function getFileNameFromUrl(imageSrc) {
    try {
      const url = new URL(imageSrc);
      const pathname = url.pathname;
      const fileName = pathname.substring(pathname.lastIndexOf('/') + 1);
      return fileName;
    } catch (e) {
      console.error('Invalid URL:', e);
      return null;
    }
  }

  function sendJsonToServer() {
    if (!backgroundImage) { showToast('Không có background, không thể lưu!', 'warning'); return; }
    const backgroundSize = { width: backgroundImage.width(), height: backgroundImage.height() };
    const drawnLines = lines.map(line => ({
      points: line.points().map((point, index) =>
        index % 2 === 0 ? (point - backgroundImage.x()) / backgroundSize.width : (point - backgroundImage.y()) / backgroundSize.height
      ),
      stroke: line.stroke(),
      strokeWidth: line.strokeWidth(),
      lineCap: line.lineCap(),
      lineJoin: line.lineJoin()
    }));
    const jsonData = { lines: drawnLines };
    const page = $('#json-dropdown').val();
    const dataToSend = { sheet_name: DATA_TYPE, page: page, json: JSON.stringify(jsonData) };
    console.log(dataToSend);
    showSpinner('#F54927');
    fetch(global_const.SERVER_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dataToSend) })
      .then(response => response)
      .then(data => {
        console.log('Success:', data);
        showToast('Lưu bài làm thành công!');
        APP_DATA = null;
        listDrawingPagesDetailed(page.toString());
      })
      .catch(error => { console.log('Error:', error); showToast('Bị lỗi gì rồi không lưu được bạn ơi.!', 'danger'); })
      .finally(() => { hideSpinner(); });
  }

  function getLinesByKey(key) {
    console.log('getLinesByKey::', key)
    if (APP_DATA != null) {
      const raw = APP_DATA.get(key);
      let parsed;
      if (typeof raw === 'string') {
        try { parsed = JSON.parse(raw); } catch (err) { console.error('Không parse được JSON cho key :', err); parsed = null; }
      } else parsed = raw;
      const lines = parsed && Array.isArray(parsed.lines) ? parsed.lines : [];
      return lines;
    }
    return null;
  }

  function listDrawingPagesDetailed(page = null) {
    console.log("listDrawingPagesDetailed::" + page);
    if (APP_DATA == null) {
      const dataToSend = { sheet_name: DATA_TYPE };
      fetch(global_const.SERVER_API_ALL_METHOD, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dataToSend) })
        .then(async response => { if (!response.ok) throw new Error(`HTTP ${response.status}`); return response.json(); })
        .then(data => { APP_DATA = new Map(Object.entries(data || {})); console.log('Đã cập nhật APP_DATA'); loadLinesByDraw(page); })
        .catch(err => { console.error('Fetch error (fire-and-forget):', err); });
    } else { loadLinesByDraw(page); }
  }

  $('#send-json').click(function () { sendJsonToServer(); });

  popDropdown($('#json-dropdown'), "Page", MIN_PAGE_NUM, MAX_PAGE_NUM, CURRENT_PAGE_INDEX);
  loadPage();
  toggleLockIcon(true);

  // init audio service
  AudioService.init({
    iconPathPlaying: iconPath_2,
    iconPathIdle: iconPath_1,
    resetIcons: resetIcons,
    changeImageUrl: changeImageUrl,
    getSoundStartEnd: getSoundStartEnd,
    global_const: global_const,
    autoShowPanel: is_auto_ShowPanel
  });

});
