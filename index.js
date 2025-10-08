let line_color = " #ff6347"; // Tomato
let line_stroke_width = 3;
const selected_color = 'black';
let is_auto_ShowPanel = true;

// --- Prevent accidental drawing during pinch ---
// add near your other variables
let touchDrawTimer = null;
const TOUCH_DRAW_DELAY = 50; // ms, small delay to confirm single-touch

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
  // const API_METHOD = "api/sheets/lines"

  const API_METHOD = "api/sheets/line_by_key"
  const API_ALL_METHOD = "api/sheets/line_all"

  const global_const = {
    get PATH_ASSETS_IMG() {
      //   PATH_ASSETS_IMG = "assets/img/";
      return PATH_ROOT + DATA_TYPE + "/img/";
    },
    get PATH_IMG() {
      //  PATH_IMG = "assets/img/X.webp";
      return PATH_ROOT + DATA_TYPE + "/img/";
    },
    get PATH_SOUND() {
      //  PATH_SOUND = "assets/sound/student/";
      return PATH_ROOT + DATA_TYPE + "/sound/";
    },
    get PATH_JSON() {
      //  PATH_JSON = "assets/data/X.json";
      return PATH_ROOT + DATA_TYPE + "/data/X.json";
    },
    get SERVER_API_ALL_METHOD() {
      const hostname = window.location.hostname;
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return RUN_URL_LOCAL + API_ALL_METHOD;
      } else {
        return RUN_URL_SERVER + API_ALL_METHOD;
      }
    },
    get SERVER_URL() {
      const hostname = window.location.hostname;
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return RUN_URL_LOCAL + API_METHOD;
      } else {
        return RUN_URL_SERVER + API_METHOD;
      }
    }

  };

  const backgroundLayer = new Konva.Layer();
  const iconLayer = new Konva.Layer();
  const drawingLayer = new Konva.Layer(); // Layer để vẽ
  stage.add(backgroundLayer);
  stage.add(iconLayer);
  stage.add(drawingLayer);

  // start zoom
  let zoomLevel = 1;
  const zoomStep = 0.2;
  const minZoom = 0.5;
  const maxZoom = 10;

  let isPinching = false;

  function setZoom(scale) {
    stage.scale({ x: scale, y: scale });
    stage.batchDraw();
  }

  // --- Helper: animate stage transform (scale & position) using Konva.Tween ---
  // duration in seconds
  function animateStageTo(newScale, newPos, duration = 0.18) {
    // clamp duration minimum
    duration = Math.max(0.02, duration);
    // stop any existing tween (if any)
    if (stage._activeTween) {
      try { stage._activeTween.destroy(); } catch (e) { }
      stage._activeTween = null;
    }

    // create tween
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
    // ensure draw after tween
    tween.onFinish = function () {
      stage.batchDraw();
      try { tween.destroy(); } catch (e) { }
      stage._activeTween = null;
    };
  }

  // ---------- bounding (clamp) helpers ----------
  // Given desired scale and desired stage position, clamp to keep background image visible
  function clampPositionForScale(desiredX, desiredY, scale) {
    // If no backgroundImage, just return desired
    if (!backgroundImage) {
      return { x: desiredX, y: desiredY };
    }

    const cw = stage.width();
    const ch = stage.height();

    const bw = backgroundImage.x(); // background left in stage coords
    const bh = backgroundImage.y();
    const bwW = backgroundImage.width();
    const bwH = backgroundImage.height();

    // Calculate allowed range for stage.x (sX) so that:
    // left edge: sX + bw * scale <= 0  -> sX <= -bw*scale
    // right edge: sX + (bw + bwW) * scale >= cw -> sX >= cw - (bw + bwW) * scale
    const maxX = -bw * scale;
    const minX = cw - (bw + bwW) * scale;

    // For Y:
    // top: sY + bh * scale <= 0 -> sY <= -bh*scale
    // bottom: sY + (bh + bwH) * scale >= ch -> sY >= ch - (bh + bwH) * scale
    const maxY = -bh * scale;
    const minY = ch - (bh + bwH) * scale;

    let finalX = desiredX;
    let finalY = desiredY;

    if (minX > maxX) {
      // content narrower than container -> center horizontally
      const contentWidth = bwW * scale;
      finalX = (cw - contentWidth) / 2 - bw * scale;
    } else {
      finalX = Math.min(maxX, Math.max(minX, desiredX));
    }

    if (minY > maxY) {
      // content shorter than container -> center vertically
      const contentHeight = bwH * scale;
      finalY = (ch - contentHeight) / 2 - bh * scale;
    } else {
      finalY = Math.min(maxY, Math.max(minY, desiredY));
    }

    return { x: finalX, y: finalY };
  }

  // ---------- end bounding helpers ----------

  // xu ly ve tren canva
  // Biến để lưu trạng thái có đang ở chế độ vẽ hay không
  let isDrawingMode = false;
  // Biến để lưu trạng thái vẽ đang diễn ra
  let isDrawing = false;
  let lastLine;
  let lines = []; // Mảng lưu các đường vẽ
  let selectedLine = null;


  // Hàm chuyển đổi tọa độ từ canvas sang tọa độ của stage (đã được zoom)
  function getRelativePointerPosition() {
    const pos = stage.getPointerPosition();
    if (!pos) return { x: 0, y: 0 }; // hoặc return null và kiểm tra nơi gọi
    const transform = stage.getAbsoluteTransform().copy();
    transform.invert();
    return transform.point(pos);
  }

  // Replace previous 'mousedown touchstart' handler with:
  stage.on('mousedown touchstart', function (e) {
    // If currently pinching, do not start drawing
    if (pinchState.isPinching) {
      // ensure any pending draw timer is cleared
      if (touchDrawTimer) {
        clearTimeout(touchDrawTimer);
        touchDrawTimer = null;
      }
      return;
    }

    const evt = e.evt || {};
    const touches = evt.touches || (evt.targetTouches ? evt.targetTouches : null);

    // If this is a touch event with multiple touches => definitely not drawing
    if (touches && touches.length > 1) {
      return;
    }

    // If this is a touch (single finger), wait a tiny delay to confirm it's not
    // the start of a pinch (a second finger quickly following).
    if (touches && touches.length === 1) {
      // schedule starting drawing after small delay, but cancel if pinch starts
      if (touchDrawTimer) clearTimeout(touchDrawTimer);
      touchDrawTimer = setTimeout(() => {
        touchDrawTimer = null;
        if (pinchState.isPinching) return; // abort if pinch started meanwhile

        // Only start drawing when drawing mode is enabled
        if (!isDrawingMode) {
          // optional: console.log('Chỉ cho phép vẽ khi ở chế độ vẽ');
          return;
        }

        isDrawing = true;
        stage.draggable(false);

        const pos = getRelativePointerPosition();
        lastLine = new Konva.Line({
          stroke: line_color,
          strokeWidth: line_stroke_width,
          globalCompositeOperation: 'source-over',
          points: [pos.x, pos.y],
          lineCap: 'round',
          lineJoin: 'round',
          saved_stroke: line_color
        });

        drawingLayer.add(lastLine);
        lines.push(lastLine);
      }, TOUCH_DRAW_DELAY);

      return;
    }

    // Mouse / pointer (non-touch) path: start immediately
    if (!touches) {
      if (!isDrawingMode) {
        // console.log("Chỉ cho phép vẽ khi ở chế độ vẽ");
        return;
      }
      isDrawing = true;
      stage.draggable(false);

      const pos = getRelativePointerPosition();
      lastLine = new Konva.Line({
        stroke: line_color,
        strokeWidth: line_stroke_width,
        globalCompositeOperation: 'source-over',
        points: [pos.x, pos.y],
        lineCap: 'round',
        lineJoin: 'round',
        saved_stroke: line_color
      });

      drawingLayer.add(lastLine);
      lines.push(lastLine);
    }
  });

  // Replace 'mousemove touchmove' handler with:
  stage.on('mousemove touchmove', function (e) {
    // If currently pinching, abort drawing
    if (pinchState.isPinching) {
      if (isDrawing) {
        isDrawing = false;
        lastLine = null;
      }
      return;
    }

    const evt = e.evt || {};
    const touches = evt.touches || (evt.targetTouches ? evt.targetTouches : null);
    // If multi-touch detected during move, cancel drawing
    if (touches && touches.length > 1) {
      if (touchDrawTimer) { clearTimeout(touchDrawTimer); touchDrawTimer = null; }
      if (isDrawing) {
        isDrawing = false;
        lastLine = null;
      }
      return;
    }

    if (!isDrawing) return;

    const pos = getRelativePointerPosition();
    if (!pos) return;

    let newPoints = lastLine.points().concat([pos.x, pos.y]);
    lastLine.points(newPoints);
    drawingLayer.batchDraw();
    lineAddEvents();
  });

  // Replace 'mouseup touchend' handler with:
  stage.on('mouseup touchend touchcancel', function (e) {
    // clear any scheduled start
    if (touchDrawTimer) {
      clearTimeout(touchDrawTimer);
      touchDrawTimer = null;
    }

    if (isDrawing) {
      isDrawing = false;
      lastLine = null;
      // optionally restore draggable depending on lock state
      if (document.getElementById('lock-icon') && document.getElementById('lock-icon').classList.contains('bi-unlock-fill')) {
        stage.draggable(true);
      } else {
        stage.draggable(false);
      }
    }
  });

  // end of xu ly ve tren canva
  $('#delete-line-btn').on('click', function () {
    deleteSelectedLine();
    // $('#delete-line-btn').prop('disabled', true);
  });

  $('#undo-btn').on('click', function () {
    if (lines.length > 0) {
      const lastLine = lines.pop(); // Lấy đường vẽ cuối cùng
      lastLine.destroy(); // Xóa đường vẽ khỏi canvas
      drawingLayer.batchDraw(); // Cập nhật canvas
    }
  });

  $('#setting').on('click', function () {
    const controls = document.querySelector('.controls');
    if (controls.style.display === 'none') {
      controls.style.display = 'flex';
    } else {
      controls.style.display = 'none';
    }
  });

  // Zoom In button
  $('#zoom-in').on('click', function () {
    // compute new scale and center on canvas center
    const oldScale = stage.scaleX();
    const newScale = Math.min(maxZoom, oldScale + zoomStep);
    const center = { x: stage.width() / 2, y: stage.height() / 2 };
    // compute pointer transform
    const mousePointTo = {
      x: (center.x - stage.x()) / oldScale,
      y: (center.y - stage.y()) / oldScale
    };
    const desiredPos = {
      x: center.x - mousePointTo.x * newScale,
      y: center.y - mousePointTo.y * newScale
    };
    const clamped = clampPositionForScale(desiredPos.x, desiredPos.y, newScale);
    zoomLevel = newScale;
    animateStageTo(newScale, clamped, 0.2);
  });

  // Reset zoom
  $('#reset-zoom').on('click', function () {
    // animate back to identity
    const clamped = clampPositionForScale(0, 0, 1);
    zoomLevel = 1;
    animateStageTo(1, clamped, 0.25);
  });

  // Zoom Out button
  $('#zoom-out').on('click', function () {
    const oldScale = stage.scaleX();
    const newScale = Math.max(minZoom, oldScale - zoomStep);
    const center = { x: stage.width() / 2, y: stage.height() / 2 };
    const mousePointTo = {
      x: (center.x - stage.x()) / oldScale,
      y: (center.y - stage.y()) / oldScale
    };
    const desiredPos = {
      x: center.x - mousePointTo.x * newScale,
      y: center.y - mousePointTo.y * newScale
    };
    const clamped = clampPositionForScale(desiredPos.x, desiredPos.y, newScale);
    zoomLevel = newScale;
    animateStageTo(newScale, clamped, 0.2);
  });

  $('#draw').on('click', function () {
    toggleDrawIcon();
  });

  $('#id_ShowPanel').on('click', function () {
    is_auto_ShowPanel = !is_auto_ShowPanel;
    $(this)
      .toggleClass('btn-success', is_auto_ShowPanel)
      .toggleClass('btn-dark', !is_auto_ShowPanel);

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
      toggleLockIcon(true); // khong cho move trong khi ve
      $btn.removeClass('btn-dark').addClass('btn-danger');
    }
  }

  $('#lock').on('click', function () {
    toggleLockIcon();
  });

  function toggleLockIcon(isLock = false) {
    // Lấy phần tử button
    const button = document.getElementById("lock");

    // Tìm phần tử con bên trong (ở đây là phần tử <i>)
    const icon = button.querySelector("i");

    if (isLock) {
      // sẽ lock
      icon.classList.remove("bi-unlock-fill");
      icon.classList.add("bi-lock-fill");

      // Đổi lại background của nút về màu ban đầu khi ở trạng thái "lock"
      stage.draggable(false);
    } else {
      // Kiểm tra và thay đổi class của phần tử <i>
      if (icon.classList.contains("bi-lock-fill")) {
        icon.classList.remove("bi-lock-fill");
        icon.classList.add("bi-unlock-fill");

        // Đổi background của nút sang màu khác khi ở trạng thái "unlock"
        stage.draggable(true);
        toggleDrawIcon(true); // Không cho vẽ        
      } else {
        icon.classList.remove("bi-unlock-fill");
        icon.classList.add("bi-lock-fill");
        stage.draggable(false);
      }
    }

  }

  // ---- Improved pinch-to-zoom (two-finger) implementation with bounds & tween ----
  // Remove interact(...).gesturable usage. Use touch handlers on stage to compute midpoint,
  // keep the point under fingers stationary while scaling, clamp scale, and disable drag while pinching.

  // Helpers
  function getDistance(t1, t2) {
    const dx = t2.clientX - t1.clientX;
    const dy = t2.clientY - t1.clientY;
    return Math.hypot(dx, dy);
  }
  function getMidpoint(t1, t2) {
    return {
      x: (t1.clientX + t2.clientX) / 2,
      y: (t1.clientY + t2.clientY) / 2
    };
  }

  let pinchState = {
    isPinching: false,
    startDist: 0,
    startScale: 1,
    startCenter: { x: 0, y: 0 } // client coords
  };

  // Combine touchstart logic: support double-tap (single touch) and pinch (two touches)
  let lastTouchTime = 0; // used for double-tap detection
  stage.on('touchstart', (e) => {
    const touches = e.evt.touches || (e.evt.targetTouches ? e.evt.targetTouches : null);

    // If two touches -> start pinch
    if (touches && touches.length === 2) {
      pinchState.isPinching = true;
      pinchState.startDist = getDistance(touches[0], touches[1]);
      pinchState.startScale = stage.scaleX(); // assume uniform scale
      pinchState.startCenter = getMidpoint(touches[0], touches[1]);

      // disable dragging while pinching
      stage.draggable(false);
      // prevent default browser gestures
      e.evt.preventDefault && e.evt.preventDefault();
      return;
    }

    // Single touch -> double-tap detection (existing behavior)
    const now = Date.now();
    const touchInterval = now - lastTouchTime;
    if (touchInterval < 300) { // double-tap threshold
      if (zoomLevel < maxZoom) {
        const oldScale = stage.scaleX();
        const newScale = Math.min(maxZoom, zoomLevel + zoomStep);
        zoomLevel = newScale;

        // zoom around pointer (single touch pointer)
        const pointer = stage.getPointerPosition();
        if (pointer) {
          const mousePointTo = {
            x: (pointer.x - stage.x()) / oldScale,
            y: (pointer.y - stage.y()) / oldScale
          };
          const desiredPos = {
            x: pointer.x - mousePointTo.x * newScale,
            y: pointer.y - mousePointTo.y * newScale
          };
          const clamped = clampPositionForScale(desiredPos.x, desiredPos.y, newScale);
          animateStageTo(newScale, clamped, 0.2);
        } else {
          const center = { x: stage.width() / 2, y: stage.height() / 2 };
          const mousePointTo = {
            x: (center.x - stage.x()) / oldScale,
            y: (center.y - stage.y()) / oldScale
          };
          const desiredPos = {
            x: center.x - mousePointTo.x * newScale,
            y: center.y - mousePointTo.y * newScale
          };
          const clamped = clampPositionForScale(desiredPos.x, desiredPos.y, newScale);
          animateStageTo(newScale, clamped, 0.2);
        }
      }
    }
    lastTouchTime = now;
  });

  stage.on('touchmove', (e) => {
    if (!pinchState.isPinching) return;

    const touches = e.evt.touches || (e.evt.targetTouches ? e.evt.targetTouches : null);
    if (!touches || touches.length < 2) return;

    const curDist = getDistance(touches[0], touches[1]);
    if (pinchState.startDist === 0) return;

    // compute desired scale
    const scaleFactor = curDist / pinchState.startDist;
    let newScale = pinchState.startScale * scaleFactor;
    newScale = Math.max(minZoom, Math.min(maxZoom, newScale));
    zoomLevel = newScale;

    // compute midpoint in client coords
    const mid = getMidpoint(touches[0], touches[1]);

    // Convert client midpoint to stage coords BEFORE scaling
    const oldScale = stage.scaleX();
    const pointer = { x: mid.x, y: mid.y };
    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale
    };

    const desiredPos = {
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale
    };

    // clamp pos
    const clamped = clampPositionForScale(desiredPos.x, desiredPos.y, newScale);

    // animate to clamped transform (short duration for smooth continuous feel)
    // small duration makes it smooth but still responsive
    animateStageTo(newScale, clamped, 0.05);

    // prevent default scrolling
    e.evt.preventDefault && e.evt.preventDefault();
  });

  stage.on('touchend touchcancel', (e) => {
    const touches = e.evt.touches || (e.evt.targetTouches ? e.evt.targetTouches : null);
    if (!touches || touches.length < 2) {
      if (pinchState.isPinching) {
        pinchState.isPinching = false;
        // re-enable dragging depending on lock state
        if (document.getElementById('lock-icon') && document.getElementById('lock-icon').classList.contains('bi-unlock-fill')) {
          stage.draggable(true);
        } else {
          stage.draggable(false);
        }
      }
    }
  });

  // Mouse double-click event (zoom around pointer)
  stage.on('dblclick', (e) => {
    const pointer = stage.getPointerPosition();
    if (!pointer) return;
    const oldScale = stage.scaleX();
    const newScale = Math.min(maxZoom, oldScale + zoomStep);
    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale
    };
    const desiredPos = {
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale
    };
    const clamped = clampPositionForScale(desiredPos.x, desiredPos.y, newScale);
    zoomLevel = newScale;
    animateStageTo(newScale, clamped, 0.2);
  });

  stage.on('wheel', function (event) {
    if ($('#lock-icon').hasClass('bi-unlock-fill')) {
      event.evt.preventDefault();

      const oldScale = stage.scaleX();
      const scaleBy = 1.1;
      let newScale = event.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy;

      newScale = Math.max(minZoom, Math.min(maxZoom, newScale));
      zoomLevel = newScale;

      // center at pointer
      const pointer = stage.getPointerPosition();
      if (pointer) {
        const mousePointTo = {
          x: (pointer.x - stage.x()) / oldScale,
          y: (pointer.y - stage.y()) / oldScale
        };
        const desiredPos = {
          x: pointer.x - mousePointTo.x * newScale,
          y: pointer.y - mousePointTo.y * newScale
        };
        const clamped = clampPositionForScale(desiredPos.x, desiredPos.y, newScale);
        animateStageTo(newScale, clamped, 0.18);
      } else {
        const clamped = clampPositionForScale(stage.x(), stage.y(), newScale);
        animateStageTo(newScale, clamped, 0.18);
      }
    }
  });

  // end zoom

  const iconSoundUrlInput = $('#icon-sound-url');
  const iconXInput = $('#icon-x');
  const iconYInput = $('#icon-y');
  const previous_page = $('#previous_page');
  const next_page = $('#next_page');

  let backgroundImage = null;
  let playIcons = [];
  let currentIcon = null;
  // let audio = null;
  let iconPath_1 = "assets/play_icon.png";
  let iconPath_2 = "assets/music_icon.svg";

  function resetIcons() {
    const imageList = iconLayer.find('Image');
    imageList.forEach(function (icon) {

      //  if (currentIcon.getAttr('sound')  != icon.getAttr('sound') ) {
      if (currentIcon != icon) {
        // Tạo một đối tượng hình ảnh HTML mới
        const newImage = new Image();

        // Đặt callback onload để cập nhật node hình ảnh KonvaJS
        newImage.onload = function () {
          // Cập nhật thuộc tính hình ảnh của node hình ảnh KonvaJS
          icon.image(newImage);

          // Vẽ lại canvas để áp dụng thay đổi
          iconLayer.batchDraw();
        };

        // Đặt nguồn của hình ảnh mới
        newImage.src = iconPath_1;
      }

    });

  }



  function getSoundStartEnd(fileName) {
    var arr = fileName.split("/");
    if (arr.length > 1) {
      return [arr[0], arr[1], arr[2]];
    }

    return arr;
  }

  // Hàm để thay đổi hình ảnh
  function changeImageUrl(newUrl, icon) {
    // Tạo một đối tượng hình ảnh HTML mới
    const newImage = new Image();

    // Đặt callback onload để cập nhật node hình ảnh KonvaJS
    newImage.onload = function () {

      // Cập nhật thuộc tính hình ảnh của node hình ảnh KonvaJS
      icon.image(newImage);

      // Vẽ lại canvas để áp dụng thay đổi
      iconLayer.batchDraw();
    };

    // Đặt nguồn của hình ảnh mới
    newImage.src = newUrl;
  }

  function addPlayIcon(x, y, sound) {

    // don't show sound icon that are x
    if (sound && "x" == sound.trim()) {
      return;
    }

    icon_size = getIconSize(ICON_SIZE);
    Konva.Image.fromURL(iconPath_1, function (icon) {
      icon.setAttrs({
        x: x || Math.random() * (stage.width() - 50),
        y: y || Math.random() * (stage.height() - 50),
        width: icon_size,
        height: icon_size,
      });

      // icon.setAttr('sound', sound.trim() || '');
      icon.setAttr('sound', (sound || '').trim());
      //icon.setAttr('sound', sound?.trim() ?? '');

      function handleInteraction() {
        currentIcon = icon;
        iconSoundUrlInput.val(icon.getAttr('sound') || '');
        iconXInput.val(icon.x());
        iconYInput.val(icon.y());
        if (icon.getAttr('sound')) {

          // playSound(icon.getAttr('sound'), currentIcon);          
          AudioService.setAutoShowPanel(is_auto_ShowPanel);
          AudioService.playSound(icon.getAttr('sound'), currentIcon);
        } else {
          showToast('Not found the sound id!');
        }
      }

      icon.on('click', handleInteraction);
      icon.on('touchend', handleInteraction);

      playIcons.push(icon);

      // Change cursor on hover
      icon.on('mouseover', function () {
        stage.container().style.cursor = 'pointer';
      });
      icon.on('mouseout', function () {

        if (isDrawingMode) {
          stage.container().style.cursor = 'crosshair';
        } else {
          stage.container().style.cursor = 'default';
        }
      });

      iconLayer.add(icon);
      icon.moveToTop();
      //iconLayer.batchDraw();
    });
  }

  $('.add-icon').on('click', function () {
    addPlayIcon();
  });



  function loadLinesByDraw(page) {
    if (page != null) {
      const data_line = getLinesByKey(page);
      if (data_line != null) {
        // $('#delete-line-btn').prop('disabled', true);
        // Xóa các line hiện có
        lines.forEach(line => line.destroy());
        lines = [];

        if (data_line) {
          data_line.forEach(savedLine => {
            const points = savedLine.points.map((point, index) =>
              index % 2 === 0
                ? (point * backgroundImage.width()) + backgroundImage.x()  // Adjusted for X
                : (point * backgroundImage.height()) + backgroundImage.y() // Adjusted for Y
            );

            // Tạo đối tượng Line từ Konva
            const line = new Konva.Line({
              points: points,
              stroke: savedLine.stroke,
              strokeWidth: savedLine.strokeWidth,
              lineCap: savedLine.lineCap,
              lineJoin: savedLine.lineJoin,
              saved_stroke: savedLine.stroke
            });

            // Thêm line vào layer
            drawingLayer.add(line);
            lines.push(line);
          }); // end of forEach
        }
        drawingLayer.batchDraw();
        lineAddEvents();
      }
    }
  }



  function lineAddEvents() {
    drawingLayer.getChildren().forEach((line) => {
      if (line.className === 'Line' && !line._hasLineEvents) {
        line._hasLineEvents = true; // custom flag

        line.on('click', (e) => {
          e.cancelBubble = true;
          resetAllLineColors();
          selectedLine = line;
          // $('#delete-line-btn').prop('disabled', false);
          line.stroke('black');
          drawingLayer.draw();
        });

        line.on('mouseover', () => {
          stage.container().style.cursor = 'pointer';
        });
        line.on('mouseout', () => {
          if (isDrawingMode) stage.container().style.cursor = 'crosshair';
          else stage.container().style.cursor = 'default';
        });
      }
    });
  }

  // Function to reset all line colors to default
  function resetAllLineColors() {
    drawingLayer.getChildren().forEach((shape) => {
      if (shape.className === 'Line') {
        const saved_stroke = shape.getAttr('saved_stroke');
        shape.stroke(saved_stroke); // Reset color to black or your default color
      }
    });
  }



  // Event listener for the 'Delete' key to delete selected line
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Delete' || e.key === 'Backspace') {
      deleteSelectedLine();
    }
  });

  // Function to handle line deletion
  function deleteSelectedLine() {
    if (selectedLine) {
      lines = removeLine(lines, selectedLine);
      selectedLine.remove(); // Remove line from layer
      selectedLine = null; // Reset selected line
      drawingLayer.draw(); // Redraw the layer
    }
  }

  // show page
  function loadPage() {
    AudioService.stopAudio();
    // interact('#canvas').draggable(false);  
    clearCanvas();
    $('#settingsModal').modal('hide');
    CURRENT_PAGE_INDEX = parseInt($('#json-dropdown').val(), 10);

    // Load background, icon from json data file
    loadAssetJson(CURRENT_PAGE_INDEX);
    fitStageIntoParentContainer();
    stage.draggable(false);
  }


  $('#json-dropdown').change(function () {
    loadPage();
  });

  // Chi can load line, con lai thi trong json het roi
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

        // Xóa các icon hiện có
        playIcons.forEach(icon => icon.destroy());
        playIcons = [];

        // Tính toán vị trí mới của các icon dựa trên kích thước hình nền mới
        data.icons.forEach(iconData => {
          const iconX = iconData.x * backgroundImage.width() + backgroundImage.x();
          const iconY = iconData.y * backgroundImage.height() + backgroundImage.y();
          addPlayIcon(iconX, iconY, iconData.sound);
        });

        // load lines, luc nay chi can lay tu APP_DATA ra thoi
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

    let x = 0;
    let y = 0;
    if (isNotMobile()) {
      x = (stageWidth - newWidth) / 2;
      y = (stageHeight - newHeight) / 2;
    }
    backgroundImage = new Konva.Image({
      x: x,
      y: y,
      image: imageObj,
      width: newWidth,
      height: newHeight,
      id: 'backgroundImage' // Đặt ID cho hình ảnh
    });

    backgroundLayer.add(backgroundImage);
    backgroundLayer.batchDraw();
    stage.find('Image').forEach((image) => {
      image.moveToBottom();
    });
    stage.on('resize', function () {
      fitStageIntoParentContainer();
    });
    fitStageIntoParentContainer();
  }

  function fitStageIntoParentContainer() {
    stage.width(window.innerWidth);
    stage.height(window.innerHeight);
    stage.batchDraw();
  }


  window.addEventListener('resize', resizeEvent);
  window.addEventListener('beforeunload', function () {
    AudioService.stopAudio();
  });

  let resizeTimer;
  function resizeEvent() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      fitStageIntoParentContainer();
      // nếu muốn reload assets: loadPage(); // nhưng tốt hơn là chỉ fit
    }, 200);
  }

  // Hàm để xóa tất cả các play icon và làm lại từ đầu, bao gồm cả hình nền
  function clearCanvas() {

    // Stop any playing audio
    AudioService.stopAudio();

    // Xóa tất cả các play icons
    playIcons.forEach(function (icon) {
      icon.destroy();  // Xóa biểu tượng khỏi layer
    });
    playIcons = [];  // Xóa danh sách biểu tượng
    iconLayer.batchDraw();  // Vẽ lại layer để cập nhật sự thay đổi

    // Xóa hình nền
    backgroundLayer.destroyChildren();  // Xóa tất cả các thành phần trên backgroundLayer
    backgroundLayer.draw();  // Vẽ lại để cập nhật sự thay đổi

    drawingLayer.destroyChildren();
    drawingLayer.draw();

    // Thiết lập lại kích thước canvas nếu cần
    fitStageIntoParentContainer();  // Đảm bảo canvas phù hợp với kích thước mới

  }

  // Thêm sự kiện cho nút Clear
  function addClickAndTouchEvents(element, handler) {
    element.on('click', handler);
    element.on('touchend', handler);
  }



  function popDropdown(dropdown, text, start, end, default_index) {
    dropdown.empty();
    // Add options dynamically
    for (var i = start; i <= end; i++) {
      var option = $('<option>', {
        value: i,
        text: text + " " + i
      });

      // Set the default selected option
      if (i === default_index) {
        option.prop('selected', true);
      }

      dropdown.append(option);
    }

  }

  previous_page.on('click', function () {
    processNextPrePage(false);
  });

  next_page.on('click', function () {
    processNextPrePage(true);
  });

  function processNextPrePage(isNext = true) {
    AudioService.stopAudio();

    if (isNext) {
      CURRENT_PAGE_INDEX = CURRENT_PAGE_INDEX + 1;
      if (CURRENT_PAGE_INDEX > MAX_PAGE_NUM) {
        CURRENT_PAGE_INDEX = MIN_PAGE_NUM;
      }
    } else {
      CURRENT_PAGE_INDEX = CURRENT_PAGE_INDEX - 1;
      if (CURRENT_PAGE_INDEX < MIN_PAGE_NUM) {
        CURRENT_PAGE_INDEX = MAX_PAGE_NUM;
      }
    }
    $('#json-dropdown').val(CURRENT_PAGE_INDEX).change();
  }

  $('#id_line_stroke_width').on('change', function () {
    line_stroke_width = $(this).val();
  });


  $('#clearButton').on('click', function () {
    clearCanvas();
  });

  function showSpinner(color = '#007bff') { // Default color if none is provided
    const spinnerIcon = document.querySelector('.spinner-icon');
    spinnerIcon.style.color = color;
    document.getElementById('spinnerOverlay').style.display = 'flex';
  }

  function hideSpinner() {
    document.getElementById('spinnerOverlay').style.display = 'none';
  }


  // Event listener for radio button click/change
  $('input[name="options"]').on('click', function () {

    // Retrieve custom attributes using jQuery .data()
    var selectedValue = $(this).val();
    var currentPageIndex = $(this).data('current-page-index');
    var maxPageNum = $(this).data('max-page-num');
    var minPageNum = $(this).data('min-page-num');

    // Display the attributes in an alert
    // alert(`Current Page Index: ${currentPageIndex}, Max Page Num: ${maxPageNum}, Min Page Num: ${minPageNum}`);    
    if (selectedValue === 'math_page') {
      window.location.href = 'math.html'; // Redirect to newpage.html
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

    if (!backgroundImage) {
      showToast('Không có background, không thể lưu!', 'warning');
      return;
    }

    const backgroundSize = {
      width: backgroundImage.width(),
      height: backgroundImage.height(),
    };

    // const fileName = getFileNameFromUrl(backgroundImage.image().src);

    // Lấy tất cả đường line đã vẽ và chuyển thành dạng JSON
    const drawnLines = lines.map(line => ({
      points: line.points().map((point, index) =>
        index % 2 === 0
          ? (point - backgroundImage.x()) / backgroundSize.width // Tọa độ X
          : (point - backgroundImage.y()) / backgroundSize.height // Tọa độ Y
      ),
      stroke: line.stroke(), // Màu của nét vẽ
      strokeWidth: line.strokeWidth(), // Độ rộng của nét vẽ
      lineCap: line.lineCap(), // Hình dạng đầu nét vẽ
      lineJoin: line.lineJoin() // Hình dạng khi các đoạn thẳng nối nhau
    }));


    const jsonData = {
      lines: drawnLines
    };

    // Tạo đối tượng dữ liệu JSON
    const page = $('#json-dropdown').val();
    const dataToSend = {
      sheet_name: DATA_TYPE,
      page: page,
      json: JSON.stringify(jsonData) // Chuyển đổi đối tượng thành chuỗi JSON
    };

    console.log(dataToSend);
    showSpinner('#F54927');
    fetch(global_const.SERVER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(dataToSend)
    })
      .then(response => response)
      .then(data => {
        console.log('Success:', data);
        showToast('Lưu bài làm thành công!');
        APP_DATA = null;
        listDrawingPagesDetailed(page.toString());
      })
      .catch(error => {
        console.log('Error:', error);
        showToast('Bị lỗi gì rồi không lưu được bạn ơi.!', 'danger');
      })
      .finally(() => {
        hideSpinner();
      });
  }

  // Key is String
  function getLinesByKey(key) {
    console.log('getLinesByKey::', key)
    if (APP_DATA != null) {
      const raw = APP_DATA.get(key);
      // 2. Parse nếu cần (nếu server trả chuỗi JSON)
      let parsed;
      if (typeof raw === 'string') {
        try {
          parsed = JSON.parse(raw);
        } catch (err) {
          console.error('Không parse được JSON cho key :', err);
          parsed = null;
        }
      } else {
        parsed = raw; // đã là object
      }

      // 3. Lấy mảng lines an toàn
      const lines = parsed && Array.isArray(parsed.lines) ? parsed.lines : [];
      return lines;
    }

    return null;
  }

  function listDrawingPagesDetailed(page = null) {
    console.log("listDrawingPagesDetailed::" + page);
    if (APP_DATA == null) {

      // showSpinner('#28a745');
      const dataToSend = { sheet_name: DATA_TYPE };
      // Tạo promise và gắn xử lý lỗi — nhưng KHÔNG await/return
      fetch(global_const.SERVER_API_ALL_METHOD, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSend)
      })
        .then(async response => {
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          return response.json();
        })
        .then(data => {

          APP_DATA = new Map(Object.entries(data || {}));
          console.log('Đã cập nhật APP_DATA');
          loadLinesByDraw(page);
        })
        .catch(err => {
          console.error('Fetch error (fire-and-forget):', err);
        })
        .finally(() => {
          // hideSpinner();
        });
    } else {
      loadLinesByDraw(page);
    }



  }


  // Event listener for the "Send JSON to Server" button
  $('#send-json').click(function () {
    sendJsonToServer();
  });

  popDropdown($('#json-dropdown'), "Page", MIN_PAGE_NUM, MAX_PAGE_NUM, CURRENT_PAGE_INDEX);
  loadPage();
  toggleLockIcon(true);

  // gọi init sau khi bạn đã có global_const, changeImageUrl, resetIcons, getSoundStartEnd
  AudioService.init({
    iconPathPlaying: iconPath_2,          // your global iconPath_2
    iconPathIdle: iconPath_1,             // your global iconPath_1
    resetIcons: resetIcons,               // function hiện có của bạn
    changeImageUrl: changeImageUrl,       // function hiện có của bạn
    getSoundStartEnd: getSoundStartEnd,   // function hiện có của bạn
    global_const: global_const,            // object có PATH_SOUND
    autoShowPanel: is_auto_ShowPanel // nếu bạn muốn KHÔNG tự show panel khi play
  });

});
