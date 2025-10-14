// internal vars (kept private inside module)
let stage = null;
let backgroundLayer = null;
let iconLayer = null;
let drawingLayer = null;
let backgroundImage = null;

function createText() {
  if (!backgroundImage || !backgroundImage.image()) {
    console.warn("loadTextsFromExport: backgroundImage not ready.");
    return;
  }

  if (!iconLayer) {
    console.warn("loadTextsFromExport: iconLayer missing.");
    return;
  }

  const t = {
    text: ".....",
    xNorm: 0.1, // vị trí X tương đối (0.0–1.0)
    yNorm: 0.2, // vị trí Y tương đối
    widthNorm: 0.3, // chiều rộng tương đối
    fontSize: 20,
    fontFamily: "Arial",
    fill: "#000000",
    align: "left",
    lineHeight: 1,
    attrs: {}, // có thể để trống
  };
  generateTextNode(t, -1, backgroundImage, true);
  iconLayer.batchDraw();
}

// thêm vào trong CanvasManager (canvas.js)
// loadTextsFromExport: restore texts but force no-rotation and open editor without rotating textarea
function loadTextsFromExport(textsArray, options = {}) {
  if (!Array.isArray(textsArray)) return;

  if (!backgroundImage || !backgroundImage.image()) {
    console.warn("loadTextsFromExport: backgroundImage not ready.");
    return;
  }

  if (!iconLayer) {
    console.warn("loadTextsFromExport: iconLayer missing.");
    return;
  }

  textsArray.forEach((t, idx) => {
    generateTextNode(t, idx, backgroundImage, false);
  });

  // redraw once
  iconLayer.batchDraw();
}

function generateTextNode(t, idx, backgroundImage, isDraggable) {
  try {
    const bgX = backgroundImage.x();
    const bgY = backgroundImage.y();
    const bgW = backgroundImage.width();
    const bgH = backgroundImage.height();

    const x = bgX + (Number(t.xNorm) || 0) * bgW;
    let y = bgY + (Number(t.yNorm) || 0) * bgH;
    if (isMobile()) y -= 10;

    const w = (Number(t.widthNorm) || 0) * bgW;
    const fontSize = Number(t.fontSize) || 16;

    const textNode = new Konva.Text({
      x: Math.round(x),
      y: Math.round(y),
      text: typeof t.text === "string" ? t.text : "",
      fontSize,
      fontFamily: t.fontFamily || "Arial",
      fill: t.fill || "#000",
      width: Math.max(10, Math.round(w || fontSize * 4)),
      draggable: false,
      rotation: 0,
      align: t.align || "left",
      lineHeight: t.lineHeight || 1,
      id: t.id || undefined,
    });

    // Restore safe attrs
    if (t.attrs && typeof t.attrs === "object") {
      const safeAttrs = Object.assign({}, t.attrs);
      delete safeAttrs.text;
      delete safeAttrs.x;
      delete safeAttrs.y;
      delete safeAttrs.width;
      delete safeAttrs.height;
      delete safeAttrs.id;
      delete safeAttrs.rotation;
      textNode.setAttrs(safeAttrs);
    }

    iconLayer.add(textNode);

    // --- Transformer (no rotation) ---
    const tr = new Konva.Transformer({
      node: textNode,
      enabledAnchors: ["middle-left", "middle-right", "rotater"],
      rotateEnabled: true,
      boundBoxFunc: function (oldBox, newBox) {
        newBox.width = Math.max(30, newBox.width);
        newBox.rotation = 0;
        return newBox;
      },
      anchorFill: "#fff",
      anchorStroke: "#444",
      anchorSize: 8,
    });

    textNode.on("transform", function () {
      textNode.setAttrs({
        width: textNode.width() * textNode.scaleX(),
        scaleX: 1,
        rotation: 0,
      });
    });

    textNode.draggable(isDraggable);
    tr.draggable(isDraggable); // rất quan trọng
    iconLayer.add(tr);

    // --- Rotate icon opens color popup ---
    tr.on("mousedown touchstart", function (evt) {
      const target = evt.target;
      const isRotater =
        (typeof target.name === "function" && target.name() === "rotater") ||
        (typeof target.hasName === "function" && target.hasName("rotater"));
      if (isRotater) {
        evt.cancelBubble = true;
        evt.evt?.preventDefault?.();
        showColorisPopup(textNode);
      }
    });

    // --- Cursor feedback ---
    const setCursor = (type) => {
      if (stage && stage.container()) stage.container().style.cursor = type;
    };
    tr.on("mouseover", () => setCursor("pointer"));
    tr.on("mouseout", () => setCursor("default"));
    textNode.on("mouseover", () => setCursor("pointer"));
    textNode.on("mouseout", () => setCursor("default"));

    // --- Editor logic ---
    function openTextEditor(e) {
      textNode.hide();
      tr.hide();

      const absPos = textNode.absolutePosition();
      const transform = stage.getAbsoluteTransform().copy();
      const clientPoint = transform.point({ x: absPos.x, y: absPos.y });
      const rect = stage.container().getBoundingClientRect();
      const areaX = rect.left + clientPoint.x;
      const areaY = rect.top + clientPoint.y;

      const textarea = document.createElement("textarea");
      document.body.appendChild(textarea);
      textarea.value = textNode.text();
      textarea.style.position = "absolute";
      textarea.style.top = areaY + "px";
      textarea.style.left = areaX + "px";

      const absScaleX = textNode.getAbsoluteScale()?.x || 1;
      const absScaleY = textNode.getAbsoluteScale()?.y || 1;
      const padding = textNode.padding ? textNode.padding() : 0;
      textarea.style.width =
        Math.max(20, (textNode.width() - padding * 2) * absScaleX) + "px";
      textarea.style.height =
        Math.max(
          24,
          textNode.fontSize() * (textNode.lineHeight() || 1) * absScaleY
        ) + "px";

      textarea.style.fontSize = textNode.fontSize() * absScaleX + "px";
      textarea.style.border = "none";
      textarea.style.background = "transparent";
      textarea.style.outline = "none";
      textarea.style.resize = "none";
      textarea.style.fontFamily = textNode.fontFamily();
      textarea.style.textAlign = textNode.align();
      textarea.style.color = textNode.fill();

      textarea.focus();
      textarea.style.height = "auto";
      textarea.style.height = textarea.scrollHeight + 3 + "px";

      function removeTextarea() {
        textarea.remove();
        window.removeEventListener("click", handleOutsideClick);
        window.removeEventListener("touchstart", handleOutsideClick);
        textNode.show();
        tr.show();
        tr.forceUpdate();
        iconLayer.batchDraw();
      }

      function handleOutsideClick(ev) {
        if (ev.target !== textarea) {
          textNode.text(textarea.value);
          removeTextarea();
        }
      }
      setTimeout(() => {
        window.addEventListener("click", handleOutsideClick);
        window.addEventListener("touchstart", handleOutsideClick);
      }, 0);

      textarea.addEventListener("keydown", (ev) => {
        if (ev.key === "Enter" && !ev.shiftKey) {
          textNode.text(textarea.value);
          removeTextarea();
        } else if (ev.key === "Escape") removeTextarea();
      });

      textarea.addEventListener("input", function () {
        const scale = textNode.getAbsoluteScale()?.x || 1;
        textarea.style.width = textNode.width() * scale + "px";
        textarea.style.height = "auto";
        textarea.style.height =
          textarea.scrollHeight + textNode.fontSize() + "px";
      });
    }

    // --- Dblclick/tap attach ---
    (function attachMouseClickDbl(node, opts = {}) {
      const dblTimeout = opts.dblTimeout || 350;
      const moveThreshold = opts.moveThreshold || 6;
      let lastClickTime = 0;
      let downPos = null;

      node.on("mousedown", (ev) => {
        const evt = ev.evt;
        downPos = evt ? { x: evt.clientX, y: evt.clientY } : null;
      });

      node.on("mouseup", (ev) => {
        const evt = ev.evt;
        const now = Date.now();
        let moved = false;
        if (downPos && evt) {
          const dx = Math.abs(evt.clientX - downPos.x);
          const dy = Math.abs(evt.clientY - downPos.y);
          moved = Math.hypot(dx, dy) > moveThreshold;
        }
        downPos = null;
        if (moved) return;

        if (now - lastClickTime <= dblTimeout) {
          lastClickTime = 0;
          openTextEditor(ev);
        } else {
          lastClickTime = now;
          setTimeout(() => {
            lastClickTime = 0;
          }, dblTimeout + 5);
        }
      });
    })(textNode);

    // --- Desktop dblclick fallback ---
    (function addDesktopDblHandler(node) {
      const container = stage.container();
      function onContainerDblClick(ev) {
        const rect = container.getBoundingClientRect();
        const stagePt = { x: ev.clientX - rect.left, y: ev.clientY - rect.top };
        const hit = stage.getIntersection(stagePt);
        if (hit === node) openTextEditor({ target: node });
      }
      container.addEventListener("dblclick", onContainerDblClick, true);
      node._containerDbl = onContainerDblClick;
    })(textNode);

    textNode.on("dbltap dblclick", (e) => openTextEditor(e));
    textNode.on("click", (e) => {
      /* optional debug */
    });
  } catch (err) {
    console.warn("generateTextNode: failed to restore", idx, err, t);
  }
}
