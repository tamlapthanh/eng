// canvas.js
// Responsible for all Konva / canvas related logic: stage, layers, drawing, zoom, pinch, swipe, icon handling, load/save lines.
// Exposes window.CanvasManager with init(options) and a small public API.

(function (global) {
  const CanvasManager = (function () {
    let line_color = " #ff6347"; // Tomato
    let line_stroke_width = 3;
    // const selected_color = "black";
    let is_auto_ShowPanel = true;

    // drawing state
    let isDrawingMode = false;
    let isDrawing = false;
    let lastLine = null;
    let lines = [];
    let selectedLine = null;

    // icon/audio state
    let playIcons = [];
    let currentIcon = null;
    let ICON_SIZE = 18;
    let iconPathIdle = ICON_AUDIO; // "assets/play_icon.png";
    let iconPathPlaying = ICON_PLAYING; //"assets/music_icon.svg";

    // // 🔹 Cache ảnh idle để tránh tạo nhiều lần
    let _idleImageCache = null;
    function preloadIdleIcon() {
      if (_idleImageCache) return; // đã cache rồi thì bỏ qua
      _idleImageCache = new Image();
      _idleImageCache.src = iconPathIdle;
    }

    // zoom/pinch state
    let zoomLevel = 1;
    const zoomStep = 0.2;
    let minZoom = 0.5;
    let maxZoom = 10;

    // pinch/swipe helpers
    let activePointers = new Map();
    let pinchState = {
      isPinching: false,
      startDist: 0,
      startScale: 1,
      startCenter: { x: 0, y: 0 },
    };
    const TOUCH_DRAW_DELAY = 50;
    let touchDrawTimer = null;

    const SWIPE_THRESHOLD = 80;
    const SWIPE_MAX_VERTICAL = 70;
    const SWIPE_COOLDOWN = 600;
    let swipeState = {
      active: false,
      startX: 0,
      startY: 0,
      startTime: 0,
      fired: false,
    };
    let lastSwipeTime = 0;

    // dependencies/pass-ins
    let cfg = {
      containerId: "canvas",
      stageConfig: { width: window.innerWidth, height: window.innerHeight },
      global_const: null,
      resetIcons: null,
      changeImageUrl: null,
      getSoundStartEnd: null,
      getIconSize: null,
      showToast: null,
      AudioService: null,
      onToggleLock: null,
      onPageChangeRequest: null, // callback(isNext) => boolean/void
    };

    // util
    function clientToStage(clientX, clientY) {
      const rect = stage.container().getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      const transform = stage.getAbsoluteTransform().copy();
      transform.invert();
      return transform.point({ x, y });
    }

    // Stage animation tween helper (smooth zoom / pan)
    function animateStageTo(newScale, newPos, duration = 0.18) {
      duration = Math.max(0.02, duration);
      if (stage._activeTween) {
        try {
          stage._activeTween.destroy();
        } catch (e) {}
        stage._activeTween = null;
      }

      // ensure we inform app that zoom is in-progress
      cfg.onToggleLock(true);

      const tween = new Konva.Tween({
        node: stage,
        duration: duration,
        easing: Konva.Easings.EaseInOut,
        x: newPos.x,
        y: newPos.y,
        scaleX: newScale,
        scaleY: newScale,
      });
      stage._activeTween = tween;
      tween.play();
      tween.onFinish = function () {
        stage.batchDraw();
        try {
          tween.destroy();
        } catch (e) {}
        stage._activeTween = null;
      };
    }

    // clamp position so backgroundImage stays visible (prevents panning too far)
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

      // Horizontal: nếu content hẹp hơn viewport → giữ center horizontally
      if (minX > maxX) {
        const contentWidth = bgW * scale;
        finalX = (cw - contentWidth) / 2 - bgX * scale;
      } else {
        finalX = Math.min(maxX, Math.max(minX, desiredX));
      }

      // Vertical: nếu content ngắn hơn viewport → align TOP (không center)
      if (minY > maxY) {
        // align top: đặt y sao cho top của background trùng với top viewport (tính theo transform)
        finalY = -bgY * scale;
      } else {
        finalY = Math.min(maxY, Math.max(minY, desiredY));
      }

      return { x: finalX, y: finalY };
    }

    // --- chung: zoom tại vị trí client (mouse/touch double) ---
    function zoomAtClient(clientX, clientY, delta = zoomStep) {
      if (!stage) return;

      // thông báo bắt đầu zoom (dự phòng)
      cfg.onToggleLock(true);

      const oldScale = stage.scaleX();
      const newScale = Math.min(
        maxZoom,
        Math.max(minZoom, oldScale + (delta > 0 ? +delta : -Math.abs(delta)))
      );
      zoomLevel = newScale;

      // compute pointer in stage coords relative to stage transform
      const pointer = { x: clientX, y: clientY };
      // Note: stage.x()/y() are stage position in client coordinates already
      const mousePointTo = {
        x: (pointer.x - stage.x()) / oldScale,
        y: (pointer.y - stage.y()) / oldScale,
      };
      const desiredPos = {
        x: pointer.x - mousePointTo.x * newScale,
        y: pointer.y - mousePointTo.y * newScale,
      };
      const clamped = clampPositionForScale(
        desiredPos.x,
        desiredPos.y,
        newScale
      );
      animateStageTo(newScale, clamped, 0.2);
    }

    // --- support: zoom by stage pointer if available (convenience) ---
    function zoomAtStagePointer(delta = zoomStep) {
      const p = stage.getPointerPosition();
      if (p) {
        // convert stage pointer (which is in container coords) to client coords for reuse
        // get bounding rect then clientX = rect.left + p.x etc.
        const rect = stage.container().getBoundingClientRect();
        const clientX = rect.left + p.x;
        const clientY = rect.top + p.y;
        zoomAtClient(clientX, clientY, delta);
      } else {
        // fallback: zoom centered
        const center = { x: stage.width() / 2, y: stage.height() / 2 };
        const rect = stage.container().getBoundingClientRect();
        zoomAtClient(rect.left + center.x, rect.top + center.y, delta);
      }
    }

    // -- drawing helpers --
    function resetAllLineColors() {
      drawingLayer.getChildren().forEach((shape) => {
        if (shape.className === "Line") {
          const saved_stroke = shape.getAttr("saved_stroke");
          shape.stroke(saved_stroke);
        }
      });
    }

    function lineAddEvents() {
      drawingLayer.getChildren().forEach((line) => {
        if (line.className === "Line" && !line._hasLineEvents) {
          line._hasLineEvents = true;
          line.on("tap mousedown", handleSelectLine);
          line.on("mouseover", () => {
            stage.container().style.cursor = "pointer";
          });
          line.on("mouseout", () => {
            stage.container().style.cursor = isDrawingMode
              ? "crosshair"
              : "default";
          });
        }
      });
    }

    function handleSelectLine(e) {
      e.cancelBubble = true;
      resetAllLineColors();
      selectedLine = e.target;
      selectedLine.stroke("black");
      drawingLayer.draw();
    }

    function deleteSelectedLine() {
      var ret = false;
      if (selectedLine) {
        lines = lines.filter((l) => l !== selectedLine);
        selectedLine.remove();
        selectedLine = null;
        drawingLayer.draw();
        ret = true;
      } else {
        ret = undoLastLine();
      }
      return ret;
    }

    // add play icon (Konva image node)
    // Khởi tạo tooltip manager
    const tooltipManager = new TooltipManager();

    function addPlayIcon(x, y, iconW, iconH, iconData) {
      var sound = String(iconData?.sound || "x");
      if (sound && sound.trim() === "x") {
        return;
      }

      const size =
        typeof cfg.getIconSize === "function"
          ? cfg.getIconSize(ICON_SIZE)
          : ICON_SIZE;

      var iconPathFile = getAssetPath(sound); // iconPathIdle;
      var icon_opacity = iconData?.icon_opacity || "0.1";
      var icon_type = iconData?.icon_type || "1";

      Konva.Image.fromURL(iconPathFile, function (icon) {
        icon.setAttrs({
          x: typeof x === "number" ? x : Math.random() * (stage.width() - 50),
          y: typeof y === "number" ? y : Math.random() * (stage.height() - 50),
          width: iconW || ICON_SIZE,
          height: iconH || ICON_SIZE,
          icon_type: icon_type,
          opacity: icon_opacity,
        });

        icon.setAttr("sound", (sound || "").trim());

        // ensure listening on desktop
        icon.listening(true);

        function handleInteraction(e) {
          currentIcon = icon;
          if (typeof cfg.showToast === "function") {
            // update UI elements outside (caller handles inputs)
          }
          // set external inputs via callback if provided (app can read currentIcon)
          if (icon.getAttr("sound")) {
            if (cfg.AudioService) {
              //   cfg.AudioService.setAutoShowPanel(!!cfg.global_const && !!cfg.global_const.autoShowPanel ? cfg.global_const.autoShowPanel : true);
              cfg.AudioService.playSound(icon.getAttr("sound"), currentIcon);
            }
          } else {
            if (typeof cfg.showToast === "function")
              cfg.showToast("Not found the sound id!");
          }
        }

        // attach events — register click/tap and fallbacks for desktop
        icon.on("click tap mousedown touchstart", function (e) {
          e.cancelBubble = true;
          handleInteraction(e);
        });

        playIcons.push(icon);

        // icon.on("mouseover", function () {
        //   stage.container().style.cursor = "pointer";
        // });
        // icon.on("mouseout", function () {
        //   stage.container().style.cursor = isDrawingMode
        //     ? "crosshair"
        //     : "default";
        // });

        //Tạo và cấu hình tooltip
        icon.on("mouseover", function (e) {
            stage.container().style.cursor = "pointer";
            const tooltip = getLastSegment(iconData?.sound);
            tooltipManager.showForIcon(icon, tooltip, e.evt);              
        });

        icon.on("mouseout", function () {
          stage.container().style.cursor = isDrawingMode
            tooltipManager.hide();
        });

        icon.on("mousemove", function (e) {
             tooltipManager.updatePosition(e.evt);
        });

        // Cleanup
        icon.on('remove', function() {
            if (tooltipManager.currentIcon === icon) {
                tooltipManager.hide();
            }
        });

        iconLayer.add(icon);
        // icon.moveToTop();
      });
    }

    // reset icons images (calls external resetIcons if provided, else revert to idle)
    function resetIcons() {
      if (typeof cfg.resetIcons === "function") {
        cfg.resetIcons();
        return;
      }
      const imageList = iconLayer.find("Image");
      imageList.forEach(function (icon) {
        if (currentIcon !== icon) {
          if (_idleImageCache && _idleImageCache.complete) {
            // ✅ dùng ảnh cache
            icon.image(_idleImageCache);
            iconLayer.batchDraw();
          } else {
            // fallback: nếu cache chưa sẵn sàng (rất hiếm)
            const newImage = new Image();
            newImage.onload = function () {
              icon.image(newImage);
              iconLayer.batchDraw();
            };
            newImage.src = iconPathIdle;
          }
        }
      });
    }

    // change icon image URL (uses external changeImageUrl if provided)
    function changeImageUrl(newUrl, icon) {
      if (typeof cfg.changeImageUrl === "function") {
        cfg.changeImageUrl(newUrl, icon);
        return;
      }
      const newImage = new Image();
      newImage.onload = function () {
        icon.image(newImage);
        iconLayer.batchDraw();
      };
      newImage.src = newUrl;
    }

    // getSoundStartEnd wrapper
    function getSoundStartEnd(fileName) {
      if (typeof cfg.getSoundStartEnd === "function")
        return cfg.getSoundStartEnd(fileName);
      if (!fileName) return [];
      return fileName.split("/");
    }

    // --- chỉnh sửa loadAssetJson: không clear layer ngay lập tức ---
    function loadAssetJson(page, url) {
      showSpinner("spinnerOverlay", "#3527f5ff");
      fetch(url)
        .then((res) => {
          if (!res.ok) throw new Error(res.statusText);
          return res.json();
        })
        .then((data) => {
          // don't clear background/icon here — wait until new image loaded successfully
          loadJsonBackgroundAndIcons(page, data);
        })
        .catch((err) => {
          console.error("Error loading JSON:", err);
          if (typeof cfg.showToast === "function")
            cfg.showToast("Error loading JSON", "danger");
        })
        .finally(() => hideSpinner());
    }


  function loadAssetJson2(page) {
      showSpinner("spinnerOverlay", "#3527f5ff");

    var pageIndex = getPageIndex(page) + 1;
    console.log("pageIndex::", pageIndex);

    const urlJson = global_const.PATH_JSON.replace("X", pageIndex);

      fetch(urlJson)
        .then((res) => {
          if (!res.ok) throw new Error(res.statusText);
          return res.json();
        })
        .then((data) => {

         loadJsonBackgroundAndIcons2(data);

        })
        .catch((err) => {
          console.error("Error loading JSON:", err);
          if (typeof cfg.showToast === "function")
            cfg.showToast("Error loading JSON", "danger");
        })
        .finally(() => hideSpinner());
    }

function loadJsonBackgroundAndIcons(page, data) {
  if (!data || !data.background) return;

  const imageObj = new Image();
  showSpinner("spinnerOverlay", "#f5f227ff");

  imageObj.onload = function () {
    hideSpinner();
    if (backgroundImage) {
      backgroundImage.destroy();
    }
    adjustBackgroundImage(imageObj);

    const bgX = backgroundImage.x();
    const bgY = backgroundImage.y();
    const bgDisplayWidth = backgroundImage.width();
    const bgDisplayHeight = backgroundImage.height();
    const originalWidth = backgroundImage.getAttr('originalWidth') || imageObj.naturalWidth;
    const originalHeight = backgroundImage.getAttr('originalHeight') || imageObj.naturalHeight;

    // TÍNH TOÁN THEO BACKGROUND MODE
    let pageDisplayWidth, pageOriginalWidth;
    
    if (isTwoPage()) {
      // DESKTOP - 2 images (double)
      pageDisplayWidth = bgDisplayWidth / 2;
      pageOriginalWidth = originalWidth / 2;
    } else {
      // MOBILE - 1 image (single)
      pageDisplayWidth = bgDisplayWidth;
      pageOriginalWidth = originalWidth;
    }

    // destroy icons
    playIcons.forEach((i) => i.destroy());
    playIcons = [];

    // add icons from json
    (data.icons || []).forEach((iconData) => {
      // Tính vị trí X theo mode
      let iconX;
      if (isTwoPage()) {
        // Desktop - nửa trái
        iconX = iconData.x * pageDisplayWidth + bgX;
      } else {
        // Mobile - full width
        iconX = iconData.x * pageDisplayWidth + bgX;
      }
      
      const iconY = iconData.y * bgDisplayHeight + bgY;
      
      let iconW, iconH;

      if (!iconData?.width) {
        iconData.width = 0.0242727326370449;
      }
      if (!iconData?.height) {
        iconData.height = 0.01809523809523809;
      }

      if (typeof iconData.width === "number" && typeof iconData.height === "number") {
        if (iconData.width <= 1 && iconData.height <= 1) {
          // Tỉ lệ phần trăm
          iconW = iconData.width * pageOriginalWidth;
          iconH = iconData.height * originalHeight;
        } else {
          // Pixel
          iconW = iconData.width;
          iconH = iconData.height;
        }
      } else {
        // Fallback
        iconW = ICON_SIZE;
        iconH = ICON_SIZE;
      }

      // Scale icon size
      const scaleX = pageDisplayWidth / pageOriginalWidth;
      const scaleY = bgDisplayHeight / originalHeight;
      iconW *= scaleX;
      iconH *= scaleY;   
      
      iconData.icon_opacity = 1;
      addPlayIcon(iconX, iconY, iconW, iconH, iconData);
    });

    // Chỉ load page 2 nếu desktop mode
    if (isTwoPage()) {
      loadAssetJson2(page);
    }
    
    if (typeof cfg.onLoadLines === "function") {
      cfg.onLoadLines(page);
    }
  };
  // imageObj.src = (cfg.global_const && cfg.global_const.PATH_IMG ? cfg.global_const.PATH_IMG : "") + getSubImagePath(page);

    // THÊM CACHE-BUSTING PARAMETER
  const imageUrl = (cfg.global_const && cfg.global_const.PATH_IMG ? cfg.global_const.PATH_IMG : "") + getSubImagePath(page);
  const cacheBustedUrl = imageUrl + '?t=' + Date.now();
  
  imageObj.src = cacheBustedUrl;
  
  // Fallback nếu có lỗi
  imageObj.onerror = function() {
    console.warn('Failed to load image with cache busting, trying original URL');
    imageObj.src = imageUrl;
  };
}

function loadJsonBackgroundAndIcons2(data) {
  // Chỉ load page 2 nếu desktop mode
  if (!backgroundImage && !isTwoPage()) return;
  
  const bgX = backgroundImage.x();
  const bgY = backgroundImage.y();
  const bgDisplayWidth = backgroundImage.width();
  const bgDisplayHeight = backgroundImage.height();
  const originalWidth = backgroundImage.getAttr('originalWidth') || backgroundImage.image().naturalWidth;
  const originalHeight = backgroundImage.getAttr('originalHeight') || backgroundImage.image().naturalHeight;

  // DESKTOP MODE - 2 images
  const pageDisplayWidth = bgDisplayWidth / 2;
  const pageOriginalWidth = originalWidth / 2;

  (data.icons || []).forEach((iconData) => {
    // Desktop - nửa phải
    const iconX = iconData.x * pageDisplayWidth + bgX + pageDisplayWidth;
    const iconY = iconData.y * bgDisplayHeight + bgY;
    
    let iconW, iconH;

    if (!iconData?.width) {
      iconData.width = 0.0242727326370449;
    }
    if (!iconData?.height) {
      iconData.height = 0.01809523809523809;
    }

    if (typeof iconData.width === "number" && typeof iconData.height === "number") {
      if (iconData.width <= 1 && iconData.height <= 1) {
        iconW = iconData.width * pageOriginalWidth;
        iconH = iconData.height * originalHeight;
      } else {
        iconW = iconData.width;
        iconH = iconData.height;
      }
    } else {
      iconW = ICON_SIZE;
      iconH = ICON_SIZE;
    }

    const scaleX = pageDisplayWidth / pageOriginalWidth;
    const scaleY = bgDisplayHeight / originalHeight;
    iconW *= scaleX;
    iconH *= scaleY;

    console.log(`Page2 - DOUBLE mode - Icon:`, { 
      iconW, iconH, pageDisplayWidth, pageOriginalWidth 
    });

    iconData.icon_opacity = 1;
    addPlayIcon(iconX, iconY, iconW, iconH, iconData);
  });
}





    function adjustBackgroundImage(imageObj) {
      const imageWidth = imageObj.width;
      const imageHeight = imageObj.height;
      const stageWidth = stage.width();
      const stageHeight = stage.height();
      const aspectRatio = imageWidth / imageHeight;
      let newWidth, newHeight;
      if (stageWidth / stageHeight > aspectRatio) {
        newWidth = stageHeight * aspectRatio;
        newHeight = stageHeight;
      } else {
        newWidth = stageWidth;
        newHeight = stageWidth / aspectRatio;
      }
      let x = 0,
        y = 0;
      if (
        typeof cfg.isNotMobile === "function"
          ? cfg.isNotMobile()
          : window.innerWidth >= 768
      ) {
        // keep horizontal center, but align to top (y = 0)
        x = (stageWidth - newWidth) / 2;
        y = 0;
      }
      backgroundImage = new Konva.Image({
        x: x,
        y: y,
        image: imageObj,
        width: newWidth,
        height: newHeight,
        id: "backgroundImage",
      });

      backgroundImage.setAttrs({
        originalWidth: imageObj.naturalWidth,
        originalHeight: imageObj.naturalHeight,
      });

      backgroundLayer.add(backgroundImage);
      backgroundLayer.batchDraw();
      // ensure other images moved to bottom
      stage.find("Image").forEach((image) => {
        image.moveToBottom();
      });

      // --- NEW: center stage immediately like resetZoom ---
      fitStageIntoParentContainer(); // make sure stage dimensions updated
      const clamped = clampPositionForScale(0, 0, 1);
      // choose immediate placement (no animation)
      stage.scale({ x: 1, y: 1 });
      stage.position({ x: clamped.x, y: clamped.y });
      zoomLevel = 1;
      stage.batchDraw();
    }

    function fitStageIntoParentContainer() {
      stage.width(window.innerWidth);
      stage.height(window.innerHeight);
      resetZoom();
      stage.batchDraw();
    }

    // Build stage + layers + pointer handlers
    function createStage(containerId, stageCfg) {
       // TẮT WARNINGS TRƯỚC KHI TẠO STAGE
      Konva.showWarnings = false;
      Konva.verbose = false;

      Konva._fixTextRendering = true;
      stage = new Konva.Stage(
        Object.assign({ container: containerId }, stageCfg || {})
      );
      backgroundLayer = new Konva.Layer();
      iconLayer = new Konva.Layer();
      drawingLayer = new Konva.Layer();
      stage.add(backgroundLayer);
stage.add(iconLayer);
      stage.add(drawingLayer);
      

      // ensure container touch-action none recommended in CSS: #canvas { touch-action: none; }
      setupPointerHandlers();
      let _resizeTimer = null;
      window.addEventListener("resize", () => {
        clearTimeout(_resizeTimer);
        _resizeTimer = setTimeout(() => fitStageIntoParentContainer(), 120);
      });

      window.addEventListener("beforeunload", function () {
        console.log("beforeunload");
        cfg.AudioService.stopAudio();
      });
    }

    // pointer handlers: handle pointerdown/move/up with pinch detection, swipe, drawing (see earlier conversation)
    function setupPointerHandlers() {
      const container = stage.container();

      // helper canceled draw
      function cancelPendingDraw() {
        if (touchDrawTimer) {
          clearTimeout(touchDrawTimer);
          touchDrawTimer = null;
        }
      }
      function cancelActiveDrawing() {
        if (isDrawing) {
          isDrawing = false;
          lastLine = null;
        }
      }

      // double tap detection
      let lastTapTime = 0;
      let lastTapPos = { x: 0, y: 0 };
      const DOUBLE_TAP_THRESHOLD = 300;
      const DOUBLE_TAP_DISTANCE = 30;

      // pointerdown, on click của stage.on
      container.addEventListener(
        "pointerdown",
        function (evt) {
          try {
            container.setPointerCapture(evt.pointerId);
          } catch (e) {}
          if (evt.pointerType === "touch") evt.preventDefault();

          // double-tap detection (touch)
          // double-tap detection (touch) — REPLACEMENT BLOCK
          if (evt.pointerType === "touch") {
            const now = Date.now();
            const dx = evt.clientX - lastTapPos.x;
            const dy = evt.clientY - lastTapPos.y;
            const dist = Math.hypot(dx, dy);

            // compute hit: nếu double-tap trên Text -> ignore zoom (để text nhận dbltap)
            let hitForTap = null;
            try {
              const stagePtForHit = clientToStage(evt.clientX, evt.clientY);
              hitForTap = stage.getIntersection(stagePtForHit);
            } catch (err) {
              hitForTap = null;
            }

            if (
              now - lastTapTime <= DOUBLE_TAP_THRESHOLD &&
              dist <= DOUBLE_TAP_DISTANCE
            ) {
              // detected a double-tap
              lastTapTime = 0;
              lastTapPos = { x: 0, y: 0 };
              cancelPendingDraw();
              cancelActiveDrawing();

              // nếu là Text node thì KHÔNG zoom — để Text xử lý dbltap
              if (
                hitForTap &&
                (hitForTap.className === "Text" ||
                  (hitForTap.getAttr && hitForTap.getAttr("isEditable")))
              ) {
                // stop further double-tap handling here
                pinchState.isPinching = false;
                return;
              }

              // normal double-tap zoom (when not on Text)
              const oldScale = stage.scaleX();
              const newScale = Math.min(maxZoom, oldScale + zoomStep);
              zoomLevel = newScale;
              const pointer = { x: evt.clientX, y: evt.clientY };
              const mousePointTo = {
                x: (pointer.x - stage.x()) / oldScale,
                y: (pointer.y - stage.y()) / oldScale,
              };
              const desiredPos = {
                x: pointer.x - mousePointTo.x * newScale,
                y: pointer.y - mousePointTo.y * newScale,
              };
              const clamped = clampPositionForScale(
                desiredPos.x,
                desiredPos.y,
                newScale
              );
              animateStageTo(newScale, clamped, 0.2);
              pinchState.isPinching = false;
              return;
            }

            // not a double-tap yet — store last tap info
            lastTapTime = now;
            lastTapPos = { x: evt.clientX, y: evt.clientY };
          }

          // register pointer
          activePointers.set(evt.pointerId, {
            x: evt.clientX,
            y: evt.clientY,
            type: evt.pointerType,
          });

          // if multi-pointer -> pinch
          if (activePointers.size >= 2) {
            pinchState.isPinching = true;
            const pts = Array.from(activePointers.values());
            const p1 = pts[0],
              p2 = pts[1];
            pinchState.startDist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
            pinchState.startScale = stage.scaleX();
            pinchState.startCenter = {
              x: (p1.x + p2.x) / 2,
              y: (p1.y + p2.y) / 2,
            };
            cancelPendingDraw();
            cancelActiveDrawing();
            stage.draggable(false);
            // changeLockIcon(true);

            // báo cho app rằng zoom/pinch bắt đầu (kêu app.toggleLockIcon(true))
            cfg.onToggleLock(true);

            swipeState.active = false;
            return;
          }

          // single pointer: decide if swipe candidate or draw candidate
          const pointerInfo = activePointers.values().next().value;

          // determine hit (if clicked on icon we shouldn't start swipe/draw)
          const stagePt = clientToStage(evt.clientX, evt.clientY);
          const hit = stage.getIntersection(stagePt);

          // start swipe only when:
          //  touch
          //  only 1 pointer
          //  not pinching
          //  not starting on icon
          if (
            evt.pointerType === "touch" &&
            activePointers.size === 1 &&
            !pinchState.isPinching &&
            !(hit && hit.className === "Image")
          ) {
            swipeState.active = true;
            swipeState.startX = evt.clientX;
            swipeState.startY = evt.clientY;
            swipeState.startTime = Date.now();
            swipeState.fired = false;
            cancelPendingDraw();
            cancelActiveDrawing();
            return; // don't start drawing
          }

          // otherwise handle drawing: for touch start with tiny delay; mouse/pen immediate
          if (evt.pointerType === "touch") {
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
                globalCompositeOperation: "source-over",
                points: [pt.x, pt.y],
                lineCap: "round",
                lineJoin: "round",
                saved_stroke: line_color,
                page: getCurrentPageForPoint(pt.x, pt.y) // ← THÊM DÒNG NÀY
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
              globalCompositeOperation: "source-over",
              points: [pt.x, pt.y],
              lineCap: "round",
              lineJoin: "round",
              saved_stroke: line_color,
              page: getCurrentPageForPoint(pt.x, pt.y) // ← THÊM DÒNG NÀY
            });
            drawingLayer.add(lastLine);
            lines.push(lastLine);
          }
        },
        { passive: false }
      );

      // ----------------- register mouse dblclick on container -----------------
      // Some browsers fire native dblclick reliably on desktop — listen on container
      container.addEventListener(
        "dblclick",
        function (ev) {
          const rect = stage.container().getBoundingClientRect();
          const stagePt = {
            x: ev.clientX - rect.left,
            y: ev.clientY - rect.top,
          };
          const hit = stage.getIntersection(stagePt);
          if (hit && hit.className === "Text") {
            // nếu target là Text, không chạy zoom
            return;
          }
          try {
            ev.preventDefault();
          } catch (e) {}
          zoomAtClient(ev.clientX, ev.clientY, zoomStep);
        },
        { passive: false }
      );

      // ----------------- also register Konva dblclick if you prefer -----------------
      stage.on("dblclick", function (e) {
        // nếu người dùng double click lên một Text (hoặc node con của text), đừng xử lý zoom ở đây
        const target = e && e.target;
        if (
          target &&
          (target.className === "Text" ||
            (target.getAttr && target.getAttr("isEditable")))
        ) {
          // allow text handler to run
          return;
        }

        // Konva event e has .evt (native event) — prefer using native client coords if present
        const native = e && e.evt;
        if (native && typeof native.clientX !== "undefined") {
          zoomAtClient(native.clientX, native.clientY, zoomStep);
        } else {
          // fallback
          zoomAtStagePointer(zoomStep);
        }
      });

      // pointermove
      container.addEventListener(
        "pointermove",
        function (evt) {
          if (!activePointers.has(evt.pointerId)) return;
          activePointers.set(evt.pointerId, {
            x: evt.clientX,
            y: evt.clientY,
            type: evt.pointerType,
          });

          // pinch
          if (activePointers.size >= 2) {
            if (!pinchState.isPinching) {
              pinchState.isPinching = true;
              const pts0 = Array.from(activePointers.values());
              const a = pts0[0],
                b = pts0[1];
              pinchState.startDist = Math.hypot(b.x - a.x, b.y - a.y);
              pinchState.startScale = stage.scaleX();
              pinchState.startCenter = {
                x: (a.x + b.x) / 2,
                y: (a.y + b.y) / 2,
              };
              cancelPendingDraw();
              cancelActiveDrawing();
            }

            const pts = Array.from(activePointers.values());
            const p1 = pts[0],
              p2 = pts[1];
            const curDist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
            if (pinchState.startDist === 0) pinchState.startDist = curDist;
            const scaleFactor = curDist / pinchState.startDist;
            let newScale = pinchState.startScale * scaleFactor;
            newScale = Math.max(minZoom, Math.min(maxZoom, newScale));
            zoomLevel = newScale;

            const mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
            const oldScale = stage.scaleX();
            const mousePointTo = {
              x: (mid.x - stage.x()) / oldScale,
              y: (mid.y - stage.y()) / oldScale,
            };
            const desiredPos = {
              x: mid.x - mousePointTo.x * newScale,
              y: mid.y - mousePointTo.y * newScale,
            };
            const clamped = clampPositionForScale(
              desiredPos.x,
              desiredPos.y,
              newScale
            );
            // use tiny animation for smoothness
            animateStageTo(newScale, clamped, 0.02);

            if (evt.pointerType === "touch") evt.preventDefault();
            return;
          }

          // single pointer: handle swipe if active
          if (IS_EANBLE_SWIPE && swipeState.active) {
            const dx = evt.clientX - swipeState.startX;
            const dy = evt.clientY - swipeState.startY;
            if (Math.abs(dy) > SWIPE_MAX_VERTICAL) {
              swipeState.active = false;
            } else {
              if (
                !swipeState.fired &&
                Math.abs(dx) >= SWIPE_THRESHOLD &&
                Date.now() - lastSwipeTime > SWIPE_COOLDOWN
              ) {
                swipeState.fired = true;
                lastSwipeTime = Date.now();
                const isNext = dx < 0;
                // cancel audio and request page change through callback
                if (cfg.AudioService) cfg.AudioService.stopAudio();
                if (typeof cfg.onPageChangeRequest === "function")
                  cfg.onPageChangeRequest(isNext);
                if (navigator.vibrate) navigator.vibrate(30);
              }
            }
            if (evt.pointerType === "touch") evt.preventDefault();
            return;
          }

          // drawing continue
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
        },
        { passive: false }
      );

      // release
      function releasePointer(evt) {
        try {
          container.releasePointerCapture(evt.pointerId);
        } catch (e) {}

        activePointers.delete(evt.pointerId);
        if (activePointers.size < 2 && pinchState.isPinching) {
          pinchState.isPinching = false;
          pinchState.startDist = 0;
        }
        cancelPendingDraw();

        // cancel swipe if short
        if (swipeState.active) {
          swipeState.active = false;
          swipeState.fired = false;
        }

        if (activePointers.size === 0) {
          if (isDrawing) {
            isDrawing = false;
            lastLine = null;
            // restore draggable depending on lock icon (caller may manage)
            // stage.draggable(true/false) managed by caller when toggling lock
          }
        }
      }

      container.addEventListener("pointerup", releasePointer, {
        passive: false,
      });
      container.addEventListener("pointercancel", releasePointer, {
        passive: false,
      });
    }

    // Exposed API functions

    function init(options = {}) {
      // merge options into cfg safely
      cfg = Object.assign(cfg, options || {});
      ICON_SIZE = options.iconSize || ICON_SIZE;
      iconPathIdle = options.iconPathIdle ? options.iconPathIdle : iconPathIdle;
      iconPathPlaying = options.iconPathPlaying
        ? options.iconPathPlaying
        : iconPathPlaying;

      // ✅ preload ảnh icon để tránh lag
      preloadIdleIcon();

      // use provided min/max zoom if given
      minZoom = typeof options.minZoom === "number" ? options.minZoom : minZoom;
      maxZoom = typeof options.maxZoom === "number" ? options.maxZoom : maxZoom;

      createStage(cfg.containerId || "canvas", cfg.stageConfig);
      // expose some convenience globals
      // NOTE: external code can call CanvasManager.addPlayIcon(...) etc.
    }
    function clearCanvas() {
      console.log("🧹 Clearing canvas completely...");

      // 1. DỪNG AUDIO TRƯỚC
      if (cfg.AudioService) {
        cfg.AudioService.stopAudio();
        console.log("✅ Audio stopped");
      }

      // 2. RESET STATES
      textMoveState = {
        active: false,
        targetText: null,
        originalPosition: null,
      };

      // 3. XOÁ TEXT NODES & TRANSFORMERS (từ konva_text_util.js)
      try {
        clearAllTextNodesAndTransformers();
        console.log("✅ Text nodes and transformers cleared");
      } catch (err) {
        console.warn("❌ Error clearing text nodes:", err);
      }

      // 4. XOÁ PLAY ICONS
      try {
        playIcons.forEach((icon) => {
          // Xoá transformer của icon nếu có
          // const transformer = iconTransformers.get(icon);
          // if (transformer) {
          //   transformer.destroy();
          //   iconTransformers.delete(icon);
          // }
          // Xoá icon
          icon.destroy();
        });
        playIcons = [];
        // iconTransformers.clear();
        console.log("✅ Play icons and transformers cleared");
      } catch (err) {
        console.warn("❌ Error clearing icons:", err);
      }

      // 5. XOÁ LINES & SELECTED LINE
      try {
        lines.forEach((line) => {
          // Xoá event listeners nếu có
          line.off("tap mousedown mouseover mouseout");
          line.destroy();
        });
        lines = [];
        selectedLine = null;
        console.log("✅ Lines cleared");
      } catch (err) {
        console.warn("❌ Error clearing lines:", err);
      }

      // 6. XOÁ TẤT CẢ LAYERS COMPLETELY
      try {
        // Background layer - giữ lại background image nếu muốn, hoặc xoá hết
        const bgChildren = backgroundLayer.getChildren();
        bgChildren.forEach((child) => {
          child.destroy();
        });
        backgroundLayer.destroyChildren();
        console.log("✅ Background layer cleared");
      } catch (err) {
        console.warn("❌ Error clearing background:", err);
      }

      try {
        // Icon layer - xoá mọi thứ
        const iconChildren = iconLayer.getChildren();
        iconChildren.forEach((child) => {
          // Xoá transformer nếu có
          if (child.className === "Transformer") {
            child.nodes([]); // Remove nodes from transformer first
          }
          child.destroy();
        });
        iconLayer.destroyChildren();
        console.log("✅ Icon layer cleared");
      } catch (err) {
        console.warn("❌ Error clearing icon layer:", err);
      }

      try {
        // Drawing layer - xoá mọi thứ
        const drawingChildren = drawingLayer.getChildren();
        drawingChildren.forEach((child) => {
          // Xoá transformer nếu có
          if (child.className === "Transformer") {
            child.nodes([]);
          }
          child.destroy();
        });
        drawingLayer.destroyChildren();
        console.log("✅ Drawing layer cleared");
      } catch (err) {
        console.warn("❌ Error clearing drawing layer:", err);
      }

      // 7. XOÁ CÁC GLOBAL TRANSFORMER MAPS (nếu có)
        // try {
        //   // Xoá tất cả transformers còn sót
        //   iconTransformers.forEach((transformer, icon) => {
        //     transformer.destroy();
        //   });
        //   iconTransformers.clear();
        //   console.log("✅ Transformer maps cleared");
        // } catch (err) {
        //   console.warn("❌ Error clearing transformer maps:", err);
        // }

      // 8. RESET ZOOM & POSITION
      try {
        fitStageIntoParentContainer();
        console.log("✅ Stage reset");
      } catch (err) {
        console.warn("❌ Error resetting stage:", err);
      }

      // 9. FORCE REDRAW ALL LAYERS
      try {
        backgroundLayer.batchDraw();
        iconLayer.batchDraw();
        drawingLayer.batchDraw();
        console.log("✅ All layers redrawn");
      } catch (err) {
        console.warn("❌ Error redrawing layers:", err);
      }

      console.log("🎉 Canvas clearing completed!");
    }

    function clearAllTextNodesAndTransformers() {
      try {
        const allTexts = drawingLayer.find("Text");
        const allTransformers = drawingLayer.find("Transformer");

        // Xóa transformers trước
        allTransformers.forEach((transformer) => {
          transformer.destroy();
        });

        // Xóa texts và các phần tử liên quan
        allTexts.forEach((textNode) => {
          // Xóa background rect nếu có
          if (textNode._bgRect) {
            textNode._bgRect.destroy();
          }
          // Xóa event listeners
          if (textNode._containerDbl && stage && stage.container) {
            stage
              .container()
              .removeEventListener("dblclick", textNode._containerDbl, true);
          }
          textNode.destroy();
        });

        drawingLayer.batchDraw();
        console.log("✅ All text nodes and transformers cleared");
      } catch (err) {
        console.warn("❌ Error in clearAllTextNodesAndTransformers:", err);
      }
    }

    // Load background+icons from URL; caller should pass url and page
    function loadPage(page, jsonUrl) {
      IS_EANBLE_SWIPE = true;
      if (!page || !jsonUrl) return;
      cfg.AudioService && cfg.AudioService.stopAudio();
      clearCanvas();
      loadAssetJson(page, jsonUrl);
      fitStageIntoParentContainer();
      stage.draggable(false);
    }

    function loadTextsFromExport(textsArray) {
      loadTexts(textsArray);
    }

    function clearAllShapes() {
      console.log("🧹 Clearing all shapes...");

      // 1. DỪNG AUDIO
      if (cfg.AudioService) {
        cfg.AudioService.stopAudio();
      }

      // 2. XÓA LINES
      try {
        lines.forEach((line) => {
          line.off("tap mousedown mouseover mouseout");
          line.destroy();
        });
        lines = [];
        selectedLine = null;
        console.log("✅ Lines cleared");
      } catch (err) {
        console.warn("❌ Error clearing lines:", err);
      }

      // 3. XÓA TEXTS (sử dụng hàm từ konva_text_util.js)
      try {
        if (typeof clearAllTextNodesAndTransformers === "function") {
          clearAllTextNodesAndTransformers();
        } else {
          // Fallback: xóa thủ công
          const textNodes = drawingLayer.find("Text");
          textNodes.forEach((textNode) => {
            if (textNode._transformer) {
              textNode._transformer.destroy();
            }
            if (textNode._containerDbl && stage && stage.container) {
              stage
                .container()
                .removeEventListener("dblclick", textNode._containerDbl, true);
            }
            if (textNode._bgRect) {
              textNode._bgRect.destroy();
            }
            textNode.destroy();
          });
        }
        console.log("✅ Text nodes cleared");
      } catch (err) {
        console.warn("❌ Error clearing text nodes:", err);
      }

      // 4. XÓA RECTS (sử dụng hàm từ konva_rect_util.js)
      try {
        if (typeof clearAllCoverRects === "function") {
          clearAllCoverRects();
        } else {
          // Fallback: xóa thủ công
          const rects = drawingLayer.find(".maskRect");
          rects.forEach((rect) => {
            if (rect._transformer) {
              rect._transformer.destroy();
            }
            if (rect._dashed) {
              rect._dashed.destroy();
            }
            if (rect._onStagePointerDown && stage) {
              stage.off(
                "contentMouseDown contentTouchStart",
                rect._onStagePointerDown
              );
            }
            rect.destroy();
          });
        }
        console.log("✅ Rects cleared");
      } catch (err) {
        console.warn("❌ Error clearing rects:", err);
      }

      // 5. XÓA TRANSFORMERS CÒN SÓT
      try {
        const transformers = drawingLayer.find("Transformer");
        transformers.forEach((tr) => {
          tr.destroy();
        });
        console.log("✅ Transformers cleared");
      } catch (err) {
        console.warn("❌ Error clearing transformers:", err);
      }

      // 6. REDRAW LAYER
      drawingLayer.batchDraw();

      console.log("🎉 All shapes cleared successfully!");
    }

function loadShapes(imagePage) {
  clearAllShapes();

  loadLinesByDraw(imagePage, 1);
  
  // ✅ QUAN TRỌNG: Chỉ load page 2 nếu desktop mode
  if (isTwoPage()) {
    loadLinesByDraw(imagePage, 2);
  }
}

function loadLinesByDraw(imagePage, targetPage = 1, tries = 0) {

  if (!backgroundImage || !backgroundImage.image()) {
    if (tries < 5) {
      setTimeout(() => loadLinesByDraw(imagePage, targetPage, tries + 1), 60);
    } else {
      console.warn("backgroundImage not ready for loadLinesByDraw", imagePage);
    }
    return;
  }

  // 🔥 QUAN TRỌNG: Sửa logic mapping page
  let jsonPage;
  const isDualPage = isTwoPage();
  
  if (isDualPage) {
    // DESKTOP: page UI -> JSON page mapping
    // Page 1 UI -> JSON 1 & 2
    // Page 2 UI -> JSON 3 & 4  
    // Page 3 UI -> JSON 5 & 6
    // Page 4 UI -> JSON 7 & 8
    if (targetPage === 1) {
      jsonPage = (imagePage * 2) - 1; // Page trái
    } else {
      jsonPage = imagePage * 2;       // Page phải
    }
  } else {
    // MOBILE: direct mapping
    jsonPage = imagePage;
  }

  console.log(`🔄 LOAD DEBUG: UI Page ${imagePage}, Target ${targetPage} -> JSON Page ${jsonPage}`, {
    isDualPage,
    imagePage,
    targetPage,
    jsonPage
  });

  const raw = APP_DATA.get(String(jsonPage));
  if (!raw) {
    console.warn(`No data found for JSON page ${jsonPage} (UI: ${imagePage}, target: ${targetPage})`);
    return;
  }

  let parsedData;
  try {
    parsedData = JSON.parse(raw);
  } catch (e) {
    console.error(`Error parsing data for page ${jsonPage}:`, e);
    return;
  }

  const rawLinesArray = Array.isArray(parsedData.lines) ? parsedData.lines : [];
  
  const bgX = backgroundImage.x();
  const bgY = backgroundImage.y();
  const bgW = backgroundImage.width();
  const bgH = backgroundImage.height();
  
  const pageDisplayWidth = isDualPage ? bgW / 2 : bgW;

  console.log(`📥 Loading page ${targetPage} from JSON ${jsonPage}: ${rawLinesArray.length} lines`);

  rawLinesArray.forEach((savedLine, index) => {
    const pts = savedLine.points || [];
    const restored = [];

    for (let i = 0; i < pts.length; i += 2) {
      const nx = Number(pts[i]) || 0;
      const ny = Number(pts[i + 1]) || 0;

      let actualX, actualY;

      if (isDualPage) {
        // Desktop: khôi phục vị trí thực tế
        if (targetPage === 1) {
          actualX = nx * pageDisplayWidth + bgX;
        } else {
          actualX = nx * pageDisplayWidth + bgX + pageDisplayWidth;
        }
      } else {
        // Mobile: luôn từ góc trái
        actualX = nx * bgW + bgX;
      }

      actualY = ny * bgH + bgY;
      restored.push(actualX);
      restored.push(actualY);
    }

    if (restored.length >= 4) {
      const line = new Konva.Line({
        points: restored,
        stroke: savedLine.stroke || line_color,
        strokeWidth: savedLine.strokeWidth || line_stroke_width,
        lineCap: savedLine.lineCap || "round",
        lineJoin: savedLine.lineJoin || "round",
        saved_stroke: savedLine.stroke || line_color,
        page: targetPage
      });

      console.log(`↪️ Line ${index} restored to page ${targetPage}`, {
        pointsPreview: restored.slice(0, 4)
      });

      line.moveToTop();
      drawingLayer.add(line);
      lines.push(line);
    }
  });

  drawingLayer.batchDraw();
  lineAddEvents();
}



function exportDrawnLines(targetPage = 1) {
  if (!backgroundImage) {
    console.error("No background image for export");
    return null;
  }

  const bgDisplay = {
    x: backgroundImage.x(),
    y: backgroundImage.y(),
    width: backgroundImage.width(),
    height: backgroundImage.height(),
  };

  const isDualPage = isTwoPage();
  const pageDisplayWidth = isDualPage ? bgDisplay.width / 2 : bgDisplay.width;

  console.log('📤 EXPORT DEBUG:', { bgDisplay, isDualPage, pageDisplayWidth, targetPage });

  const drawnLines = [];
  const state = CanvasManager.getState();
  const currentLines = state.lines || [];

  currentLines.forEach((line, lineIndex) => {
    const points = line.points();
    const linePage = line.getAttr('page') || 1;
    
    console.log(`Processing line ${lineIndex}:`, {
      points: points.slice(0, 4), // 2 điểm đầu
      linePage,
      targetPage
    });

    if (isDualPage) {
      // DESKTOP MODE: Phân tách line thành segments theo page boundary
      const segments = splitLineByPageBoundary(line, bgDisplay, pageDisplayWidth);
      const targetSegments = segments[`page${targetPage}`];
      
      if (Array.isArray(targetSegments) && targetSegments.length > 0) {
        targetSegments.forEach((segmentPoints, segmentIndex) => {
          if (Array.isArray(segmentPoints) && segmentPoints.length >= 4) {
            const norm = normalizePoints(segmentPoints, bgDisplay, targetPage === 1, isDualPage, pageDisplayWidth);
            
            console.log(`Segment ${segmentIndex} normalized:`, {
              original: segmentPoints.slice(0, 4),
              normalized: norm.slice(0, 4)
            });
            
            drawnLines.push({
              points: norm,
              stroke: line.stroke(),
              strokeWidth: line.strokeWidth(),
              lineCap: line.lineCap(),
              lineJoin: line.lineJoin(),
              page: targetPage,
              isSegment: true
            });
          }
        });
      }
    } else {
      // MOBILE MODE: Chỉ xử lý lines thuộc page đang export
      if (linePage === targetPage) {
        const norm = normalizePoints(points, bgDisplay, targetPage === 1, isDualPage, pageDisplayWidth);
        
        drawnLines.push({
          points: norm,
          stroke: line.stroke(),
          strokeWidth: line.strokeWidth(),
          lineCap: line.lineCap(),
          lineJoin: line.lineJoin(),
          page: targetPage
        });
      }
    }
  });

  console.log(`✅ Exporting page ${targetPage}: ${drawnLines.length} lines`);

  const textNodes = saveTextNodesForPage(bgDisplay, targetPage === 1, isDualPage, pageDisplayWidth);
  const rects = saveCoverRectsForPage(bgDisplay, targetPage === 1, isDualPage, pageDisplayWidth);

  return {
    lines: drawnLines,
    texts: textNodes,
    rects: rects,
    meta: {
      savedAtDisplay: bgDisplay,
      isDualPage: isDualPage,
      page: targetPage,
      pageDisplayWidth: pageDisplayWidth,
      coordSystem: "normalized_display",
    },
  };
}





function saveTextNodesForPage(bgDisplay, isPage1, isDualPage, pageDisplayWidth) {
  // Giả sử bạn có hàm saveTextNodes() hiện tại
  const allTexts = saveTextNodes(bgDisplay);
  
  if (!isDualPage) {
    return isPage1 ? allTexts : [];
  }
  
  return allTexts.filter((text) => {
    const x = text.x * bgDisplay.width + bgDisplay.x;
    const relativeX = x - bgDisplay.x;
    const belongsToPage1 = relativeX < pageDisplayWidth;
    return isPage1 ? belongsToPage1 : !belongsToPage1;
  });
}


function saveCoverRectsForPage(bgDisplay, isPage1, isDualPage, pageDisplayWidth) {
  // Giả sử bạn có hàm saveCoverRects() hiện tại
  const allRects = saveCoverRects();
  
  if (!isDualPage) {
    return isPage1 ? allRects : [];
  }
  
  return allRects.filter((rect) => {
    const x = rect.x * bgDisplay.width + bgDisplay.x;
    const relativeX = x - bgDisplay.x;
    const belongsToPage1 = relativeX < pageDisplayWidth;
    return isPage1 ? belongsToPage1 : !belongsToPage1;
  });
}

    // navigation helper (can be used by UI or swipe)
    function processNextPrePage(isNext = true) {
      if (cfg.AudioService) cfg.AudioService.stopAudio();
      if (typeof cfg.onPageChangeRequest === "function") {
        cfg.onPageChangeRequest(isNext);
      }
    }

    // ----- Zoom helpers exposed -----
    function getStageCenter() {
      return { x: stage.width() / 2, y: stage.height() / 2 };
    }

    function setZoomAt(newScale, centerPoint) {
      if (!stage) return;
      const oldScale = stage.scaleX();
      newScale = Math.max(minZoom, Math.min(maxZoom, newScale));
      zoomLevel = newScale;

      const center = centerPoint || getStageCenter();
      const mousePointTo = {
        x: (center.x - stage.x()) / oldScale,
        y: (center.y - stage.y()) / oldScale,
      };
      const desiredPos = {
        x: center.x - mousePointTo.x * newScale,
        y: center.y - mousePointTo.y * newScale,
      };
      const clamped = clampPositionForScale(
        desiredPos.x,
        desiredPos.y,
        newScale
      );
      animateStageTo(newScale, clamped, 0.18);
    }

    function zoomIn(centerPoint) {
      const oldScale = stage ? stage.scaleX() : zoomLevel;
      const newScale = Math.min(maxZoom, oldScale + zoomStep);
      setZoomAt(newScale, centerPoint);
    }

    function zoomOut(centerPoint) {
      const oldScale = stage ? stage.scaleX() : zoomLevel;
      const newScale = Math.max(minZoom, oldScale - zoomStep);
      setZoomAt(newScale, centerPoint);
    }

    function resetZoom() {
      const clamped = clampPositionForScale(0, 0, 1);
      zoomLevel = 1;
      animateStageTo(1, clamped, 0.25);
    }

    // ----- Undo (remove last drawn line) -----
    function undoLastLine() {
      if (lines.length === 0) return false;
      const last = lines.pop();
      try {
        last.destroy();
      } catch (e) {
        /* ignore */
      }
      drawingLayer.batchDraw();
      return true;
    }

    function addRect() {
      createRect();
    }

    function addText(text = TEXT_DEFAULT) {
      createText(text);
    }

    // public API
    return {
      init,
      loadPage,
      addPlayIcon,
      resetIcons,
      changeImageUrl,
      getSoundStartEnd,
      loadShapes,
      exportDrawnLines,
      clearCanvas,
      deleteSelectedLine,
      setDrawingMode: function (flag) {
        isDrawingMode = !!flag;
        stage.container().style.cursor = isDrawingMode
          ? "crosshair"
          : "default";
      },
      toggleDrawing: function () {
        isDrawingMode = !isDrawingMode;
        this.setDrawingMode(isDrawingMode);
      },
      processNextPrePage,
      getState: function () {
        return {
          stage,
          backgroundLayer,
          iconLayer,
          drawingLayer,
          backgroundImage,
          playIcons,
          currentIcon,
          lines,
          isDrawingMode,
        };
      },
      // <-- thêm exports mới
      zoomIn,
      zoomOut,
      resetZoom,
      setZoomAt,
      undoLastLine,
      addText,
      addRect,
      setLineColor: function (value) {
        line_color = value;
      },
      setLineStrokeWidth: function (value) {
        line_stroke_width = value;
      },
    };
  })();

  global.CanvasManager = CanvasManager;
})(window);
