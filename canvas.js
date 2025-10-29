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

    // 🔹 Cache ảnh idle để tránh tạo nhiều lần
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
    function addPlayIcon(x, y, sound) {
      if (sound && sound.trim() === "x") return;

      const size =
        typeof cfg.getIconSize === "function"
          ? cfg.getIconSize(ICON_SIZE)
          : ICON_SIZE;

      var iconPathFile = getAssetPath(sound); // iconPathIdle;

      Konva.Image.fromURL(iconPathFile, function (icon) {
        icon.setAttrs({
          x: typeof x === "number" ? x : Math.random() * (stage.width() - 50),
          y: typeof y === "number" ? y : Math.random() * (stage.height() - 50),
          width: size,
          height: size,
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
        icon.on("mouseover", function () {
          stage.container().style.cursor = "pointer";
        });
        icon.on("mouseout", function () {
          stage.container().style.cursor = isDrawingMode
            ? "crosshair"
            : "default";
        });

        iconLayer.add(icon);
        icon.moveToTop();
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
      showSpinner("spinnerOverlay", "#F54927");
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

    // --- load và swap an toàn (với fade-in) ---
    async function loadJsonBackgroundAndIcons(page, data) {
      
      if (!data || !data.background) {
        hideSpinner();
        return;
      }

      const basePath =
        cfg.global_const && cfg.global_const.PATH_ASSETS_IMG
          ? cfg.global_const.PATH_ASSETS_IMG
          : "";
      const bgUrl = basePath + data.background;

      showSpinner("spinnerOverlay", "#F54927");

      try {
        // 1) preload background image
        const imageObj = await preloadImage(bgUrl);

        // 2) tạo Konva.Image mới (opacity 0 để fade-in)
        const newBg = new Konva.Image({
          x: 0,
          y: 0,
          image: imageObj,
          width: imageObj.width,
          height: imageObj.height,
          id: "backgroundImage_tmp",
          opacity: 0,
        });

        // add vào layer
        backgroundLayer.add(newBg);
        adjustBackgroundImageNode(newBg); // resize/fit nếu bạn có logic này

        // 3) clear icons cũ
        playIcons.forEach((i) => {
          try {
            i.destroy();
          } catch (e) {}
        });
        playIcons = [];
        iconLayer.clear();

        // 4) preload icons (nếu icons có image assets) - optional
        // nếu addPlayIcon tự tạo hình từ sprite/static icon thì bỏ khối preload này
        const iconPreloads = [];
        (data.icons || []).forEach((iconData) => {
          if (iconData.img) {
            // giả sử iconData có trường img nếu icon riêng
            const iconUrl = basePath + iconData.img;
            iconPreloads.push(preloadImage(iconUrl).catch(() => null));
          }
        });
        // chờ preload icons xong (không block nếu lỗi)
        if (iconPreloads.length) await Promise.all(iconPreloads);

        // 5) add icons mới (toạ độ dựa trên kích thước newBg)
        const bgX = newBg.x();
        const bgY = newBg.y();
        const bgW = newBg.width();
        const bgH = newBg.height();

        (data.icons || []).forEach((iconData) => {
          const iconX =
            typeof iconData.x === "number" ? iconData.x * bgW + bgX : bgX;
          const iconY =
            typeof iconData.y === "number" ? iconData.y * bgH + bgY : bgY;
          addPlayIcon(iconX, iconY, iconData.sound, iconData); // truyền iconData nếu addPlayIcon cần img path
        });

        // 6) batch draw
        backgroundLayer.batchDraw();
        iconLayer.batchDraw();

        // 7) fade-in new background, remove old
        const oldBackground = backgroundImage;
        const tween = new Konva.Tween({
          node: newBg,
          duration: 0.22,
          opacity: 1,
          easing: Konva.Easings.EaseInOut,
        });
        tween.play();
        tween.onFinish = function () {
          try {
            tween.destroy();
          } catch (e) {}
          if (oldBackground) {
            try {
              oldBackground.destroy();
            } catch (e) {}
          }
          backgroundImage = newBg;
          backgroundImage.id("backgroundImage");
          backgroundLayer.batchDraw();
          iconLayer.batchDraw();
          drawingLayer.batchDraw();

          if (typeof cfg.onLoadLines === "function") cfg.onLoadLines(page);
        };
      } catch (err) {
        console.error("Error loading background/icons:", err);
        if (typeof cfg.showToast === "function")
          cfg.showToast("Error loading background image", "danger");
      } finally {
        hideSpinner();
      }
    }

    // --- điều chỉnh kích thước + vị trí cho 1 Konva.Image node (KHÔNG reset stage) ---
    function adjustBackgroundImageNode(konvaImageNode) {
      const imageObj = konvaImageNode.image();
      if (!imageObj) return;

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


      x = (stageWidth - newWidth) / 2;
      y = 0;      

      konvaImageNode.width(newWidth);
      konvaImageNode.height(newHeight);
      konvaImageNode.x(x);
      konvaImageNode.y(y);

      // đảm bảo các image khác (ví dụ icon) nằm trên background mới
      // chú ý: moveToBottom ảnh hưởng trong layer; vì backgroundLayer nằm dưới, icons trong iconLayer vẫn hiện lên
      // chỉ cần vẽ lại các layers
      backgroundLayer.batchDraw();
      iconLayer.batchDraw();
      drawingLayer.batchDraw();
    }

    function fitStageIntoParentContainer() {
      stage.width(window.innerWidth);
      stage.height(window.innerHeight);
      resetZoom();
      stage.batchDraw();
    }

    // Build stage + layers + pointer handlers
    function createStage(containerId, stageCfg) {
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

      // pointerdown
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
      // Clear text
      clearAllTextNodesAndTransformers();

      if (cfg.AudioService) cfg.AudioService.stopAudio();
      playIcons.forEach((icon) => icon.destroy());
      playIcons = [];
      iconLayer.batchDraw();
      backgroundLayer.destroyChildren();
      backgroundLayer.draw();
      drawingLayer.destroyChildren();
      drawingLayer.draw();
      fitStageIntoParentContainer();
      lines = [];
      selectedLine = null;
    }

    function clearAllTextsInLayer() {
      iconLayer.destroyChildren(); // xóa toàn bộ node con trong layer
      iconLayer.batchDraw();
    }

    function clearAllTextNodesAndTransformers() {
      const allNodes = iconLayer.find((node) =>
        ["Text", "Transformer"].includes(node.getClassName())
      );

      allNodes.forEach((n) => n.destroy());
      iconLayer.batchDraw(); // redraw sau khi xóa
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
      clearAllTextNodesAndTransformers();
      loadTexts(textsArray);
    }

    function loadShapes(page, parsed) {
      const linesArr = parsed && Array.isArray(parsed.lines) ? parsed.lines : [];
      loadLinesByDraw(page, linesArr);

       const rectArr = parsed && Array.isArray(parsed.rects) ? parsed.rects : [];
       loadRectFromExport(rectArr);

      const textArr = parsed && Array.isArray(parsed.texts) ? parsed.texts : [];
      loadTextsFromExport(textArr);       
    }

    // load lines (normalized display coords) — caller passes APP_DATA map or raw parsed
    function loadLinesByDraw(page, rawLinesArray, tries = 0) {
      if (rawLinesArray == null) return;
      if (!backgroundImage || !backgroundImage.image()) {
        if (tries < 5)
          setTimeout(() => loadLinesByDraw(page, rawLinesArray, tries + 1), 60);
        else
          console.warn("backgroundImage not ready for loadLinesByDraw", page);
        return;
      }

      // remove old lines
      lines.forEach((l) => l.destroy());
      lines = [];

      const bgX = backgroundImage.x();
      const bgY = backgroundImage.y();
      const bgW = backgroundImage.width();
      const bgH = backgroundImage.height();

      rawLinesArray.forEach((savedLine) => {
        const pts = savedLine.points || [];
        const restored = [];
        // assume normalized_display (we saved like that)
        for (let i = 0; i < pts.length; i += 2) {
          const nx = Number(pts[i]) || 0;
          const ny = Number(pts[i + 1]) || 0;
          restored.push(nx * bgW + bgX);
          restored.push(ny * bgH + bgY);
        }
        const line = new Konva.Line({
          points: restored,
          stroke: savedLine.stroke || line_color,
          strokeWidth: savedLine.strokeWidth || line_stroke_width,
          lineCap: savedLine.lineCap || "round",
          lineJoin: savedLine.lineJoin || "round",
          saved_stroke: savedLine.stroke || line_color,
        });
        drawingLayer.add(line);
        lines.push(line);
      });

      drawingLayer.batchDraw();
      lineAddEvents();
    }

    // export current drawn lines normalized relative to background display box
    function exportDrawnLines() {
      if (!backgroundImage) return null;

      const bgDisplay = {
        x: backgroundImage.x(),
        y: backgroundImage.y(),
        width: backgroundImage.width(),
        height: backgroundImage.height(),
      };

      // export lines (existing logic, unchanged except rounding helper)
      const drawnLines = lines.map((line) => {
        const pts = line.points();
        const norm = [];
        for (let i = 0; i < pts.length; i += 2) {
          const x = Number(pts[i]);
          const y = Number(pts[i + 1]);
          const nx = bgDisplay.width ? (x - bgDisplay.x) / bgDisplay.width : 0;
          const ny = bgDisplay.height ? (y - bgDisplay.y) / bgDisplay.height: 0;
          norm.push(formatNumber(nx));
          norm.push(formatNumber(ny));
        }
        return {
          points: norm,
          stroke: line.stroke(),
          strokeWidth: line.strokeWidth(),
          lineCap: line.lineCap(),
          lineJoin: line.lineJoin(),
        };
      });

      // save text nodes
      const textNodes = saveTextNodes(bgDisplay);
     
      // Save rects
      const rects = saveCoverRects();

      return {
        lines: drawnLines,
        texts: textNodes,
        rects: rects,
        meta: {
          savedAtDisplay: {
            x: bgDisplay.x,
            y: bgDisplay.y,
            width: bgDisplay.width,
            height: bgDisplay.height,
          },
          coordSystem: "normalized_display",
        },
      };
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
      // loadLinesByDraw,
      // loadTextsFromExport,
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
