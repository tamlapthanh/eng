// internal vars (kept private inside module)
let stage = null;
let backgroundLayer = null;
let iconLayer = null;
let drawingLayer = null;
let backgroundImage = null;

let RECT_TEXT_DEFAULT_COLOR = "#000000";
let RECT_TEXT_MOVED_COLOR = "blue";

function createRect() {
  const t = {
    text: "",
    xNorm: 0.1, // vị trí X tương đối (0.0–1.0)
    yNorm: 0.2, // vị trí Y tương đối
    widthNorm: 0.3, // chiều rộng tương đối
    fontSize: 20,
    fontFamily: "Arial",
    fill: RECT_TEXT_MOVED_COLOR,
    align: "left",
    lineHeight: 1,
    attrs: {}, // có thể để trống
  };
  createText(t);
}

function createText(obj = null) {
  // groupText();
  if (!backgroundImage || !backgroundImage.image()) {
    console.warn("createText: backgroundImage not ready.");
    return;
  }

  if (!drawingLayer) {
    console.warn("createText: drawingLayer missing.");
    return;
  }

  // const t = obj || {
  //   text: ".....",
  //   xNorm: 0.1, // vị trí X tương đối (0.0–1.0)
  //   yNorm: 0.2, // vị trí Y tương đối
  //   widthNorm: 0.3, // chiều rộng tương đối
  //   fontSize: 20,
  //   fontFamily: "Arial",
  //   fill: RECT_TEXT_DEFAULT_COLOR,
  //   align: "center",
  //   lineHeight: 1,
  //   attrs: {}, // có thể để trống
  // };

   const t = obj || {
    text: ".....",
    // đặt mặc định ở góc phải dưới (relative to background)
    xNorm: 0.95,   // X tương đối: gần cạnh phải
    yNorm: 0.85,   // Y tương đối: gần cạnh dưới
    widthNorm: 0.3, // chiều rộng tương đối
    fontSize: 20,
    fontFamily: "Arial",
    fill: RECT_TEXT_DEFAULT_COLOR,
    align: "center", // căn phải cho phù hợp với vị trí góc phải
    lineHeight: 1,
    attrs: {}, // có thể để trống
  };
  
  generateTextNode(t, -1, backgroundImage, true, true, true,false);
  drawingLayer.batchDraw();
}

// thêm vào trong CanvasManager (canvas.js)
// loadTexts: restore texts but force no-rotation and open editor without rotating textarea
function loadTexts(textsArray, options = {}) {
  if (!Array.isArray(textsArray)) return;

  if (!backgroundImage || !backgroundImage.image()) {
    console.warn("loadTexts: backgroundImage not ready.");
    return;
  }

  if (!drawingLayer) {
    console.warn("loadTexts: drawingLayer missing.");
    return;
  }

  textsArray.forEach((t, idx) => {
    IS_EANBLE_SWIPE = false;
    generateTextNode(t, idx, backgroundImage, true, true, false, true);
  });

  // redraw once
  drawingLayer.batchDraw();
}

function generateTextNode(
  t,
  idx,
  backgroundImage,
  isDraggable,
  isShowText = true,
  isShowBorder = true,
  readOny = false
) {
  try {

    const htmlTooltip = document.getElementById("tooltip");

    const bgX = backgroundImage.x();
    const bgY = backgroundImage.y();
    const bgW = backgroundImage.width();
    const bgH = backgroundImage.height();

    const x = bgX + (t.xNorm || 0) * bgW;
    let y = bgY + (t.yNorm || 0) * bgH;
    if (isMobile()) {
      y -= 2;
      t.fontSize = 12;
    }

    const w = (Number(t.widthNorm) || 0) * bgW;
    const fontSize = Number(t.fontSize) || 15;
    var orgX = t.attrs.originX || t.xNorm;
    var orgY = t.attrs.originY || t.yNorm;    

    var isChangedPos = t.attrs.isChangedPos || false;
    if (!readOny) {
      orgX = t.xNorm;
      orgY = t.yNorm;
    }
    if (!isShowBorder && isChangedPos == false) {
      isShowText = false;            
    } else if (isChangedPos) {
      t.fill = RECT_TEXT_MOVED_COLOR;
    }

    const textNode = new Konva.Text({
      x: Math.round(x),
      y: Math.round(y),
      text: typeof t.text === "string" ? t.text : "",
      fontSize,
      fontFamily: t.fontFamily || "Arial",
      fill: t.fill ||  "blue",
      width: Math.max(10, Math.round(w || fontSize * 4)),
      draggable: false,
      rotation: 0,
      align: t.align || "center",
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

      // IMPORTANT: prevent overriding of fontSize / scale
      // delete safeAttrs.fontSize;
      // delete safeAttrs.scaleX;
      // delete safeAttrs.scaleY;
      delete safeAttrs.fontSize; // bảo mật kép
      textNode.setAttrs(safeAttrs);
    }

   
    textNode.fill(t.fill); 
    textNode.setAttr("isChangedPos",  isChangedPos);
    textNode.setAttr("originX", Number(orgX));
    textNode.setAttr("originY", Number(orgY));           
    textNode.setAttr("isShowText",  isShowText);
    textNode.setAttr("isShowBorder", isShowBorder);    
    textNode.setAttr("readOny",  readOny);
    drawingLayer.add(textNode);

    // --- Transformer (no rotation) ---
    const tr = new Konva.Transformer({
      node: textNode,
      enabledAnchors: [
        "middle-left",
        "middle-right",
        "rotater",
        "top-center",
        "bottom-center",
      ],
      rotateEnabled: true,
      boundBoxFunc: function (oldBox, newBox) {
        newBox.width = Math.max(30, newBox.width);
        newBox.height = Math.max(30, newBox.height);
        newBox.rotation = 0;
        return newBox;
      },
      anchorFill: "#fff",
      anchorStroke: "#444",
      anchorSize: 6,
      borderStrokeWidth: 0.3, // mảnh hơn một chút
      borderStroke: "rgba(0, 0, 0, 0.2)", // viền đen nhạt và mờ (alpha = 0.2)
    });

    textNode.on("transform", function () {
      // tính tỉ lệ thay đổi chiều cao
      const scaleY = textNode.scaleY();

      // tăng/giảm lineHeight dựa trên scaleY
      const newLineHeight = (textNode.lineHeight() || 1) * scaleY;
      textNode.lineHeight(newLineHeight);

      // hoặc đổi fontSize nếu muốn thay đổi tỉ lệ toàn bộ chữ
      // textNode.fontSize(textNode.fontSize() * scaleY);

      // reset scale để tránh méo
      textNode.scaleY(1);

      // tương tự width/scaleX nếu cần
      textNode.width(textNode.width() * textNode.scaleX());
      textNode.scaleX(1);

      drawingLayer.batchDraw();
    });


    // --- thêm method reset -> trả về vị trí ban đầu (đã lưu lúc tạo) ---
    textNode.resetToInitialPosition = function () {

      // trở về vị trí ban đâu, chưa di chuyển
      textNode.setAttr("isChangedPos",  false);

      var isShowText = true; // textNode.getAttr("isShowText");      
      const isShowBorder = textNode.getAttr("isShowBorder");

      if (!isShowBorder) {
        isShowText = false;            
      }      
      textNode.fill(RECT_TEXT_DEFAULT_COLOR);
      showText(isShowText);
      showBorder(isShowBorder);

      const orgX = textNode.getAttr("originX") || 0;
      const orgY = textNode.getAttr("originY") || 0;      
      const bgX = backgroundImage.x();
      const bgY = backgroundImage.y();
      const bgW = backgroundImage.width();
      const bgH = backgroundImage.height();

      const xNormm = bgX + orgX * bgW;
      let yNorm = bgY + orgY * bgH;
      if (isMobile()) {
        yNorm -= 2;
        // nếu muốn thay fontSize thực tế trên textNode khi mobile:
        try {
          textNode.fontSize(12);
        } catch (e) {}
      }
      
      textNode.position({ x: xNormm, y: yNorm });
      try {
        tr.forceUpdate();
      } catch (e) {}
      drawingLayer.batchDraw();

    };


    

      textNode.on("mousemove", (e) => {
        const stage = e.target.getStage();
        const pointer = stage.getPointerPosition();
        htmlTooltip.style.left = pointer.x + 10 + "px";
        htmlTooltip.style.top = pointer.y + 10 + "px";
        htmlTooltip.textContent = textNode.text();// "Tooltip HTML nè 😄";
        htmlTooltip.style.display = "block";
        htmlTooltip.style.opacity = '1';        
      });

      textNode.on("mouseout", () => {
        htmlTooltip.style.opacity = '0';
        setTimeout(() => htmlTooltip.style.display = 'none', 150);
    });

    // Sự kiện khi bắt đầu kéo
    textNode.on("dragstart", () => {
      setCursor("pointer");
      showText(true);
    });

    // Sự kiện khi đang kéo
    textNode.on("dragmove", () => {
      setCursor("pointer");
      showText(true);
    });

    textNode.on("dragend", () => {
       if (!readOny) {
        // Lấy vị trí và kích thước background hiện tại
        const bgX = backgroundImage.x();
        const bgY = backgroundImage.y();
        const bgW = backgroundImage.width();
        const bgH = backgroundImage.height();

        // Vị trí tuyệt đối hiện tại của textNode
        const xAbs = textNode.x();
        const yAbs = textNode.y();

        // Tính normalized coords (phòng trường hợp bgW/bgH = 0)
        let newXNorm = 0;
        let newYNorm = 0;
        if (bgW && !isNaN(bgW)) newXNorm = (xAbs - bgX) / bgW;
        if (bgH && !isNaN(bgH)) newYNorm = (yAbs - bgY) / bgH;

        // Clamp về [0,1] để tránh giá trị ngoài vùng (tuỳ chọn)
        newXNorm = Math.max(0, Math.min(1, newXNorm));
        newYNorm = Math.max(0, Math.min(1, newYNorm));

        // Lưu vào thuộc tính (để reset / save)
        const roundedX = Number(newXNorm.toFixed(6));
        const roundedY = Number(newYNorm.toFixed(6));

        textNode.setAttr("originX", roundedX);
        textNode.setAttr("originY", roundedY);      
        
      } 

      if (!isShowBorder) {
        textNode.fill(RECT_TEXT_MOVED_COLOR);
        textNode.setAttr("isChangedPos",  true);
      }

      
      setCursor("default");
      showText(true);
    });

    showText(isShowText);
    showBorder(isShowBorder);
    textNode.draggable(isDraggable);
    tr.draggable(isDraggable); // rất quan trọng
    drawingLayer.add(tr);

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
    function showBorder(isShow = true) {
      if (isShow) {
        // make visible
        tr.visible(true);
      } else {
        tr.visible(false);
      }

      // update transformer node and redraw
      tr.forceUpdate();
      drawingLayer.batchDraw();
    }

    // --- Editor logic ---
    function showText(isShow = true) {
      if (isShow) {
        // make visible
        textNode.opacity(1);
      } else {
        textNode.opacity(0);
      }

      // update transformer node and redraw
      tr.forceUpdate();
      drawingLayer.batchDraw();
    }



    function openTextEditor(e) {
      if (readOny) {
        textNode.resetToInitialPosition();
        return;
      }

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
        drawingLayer.batchDraw();
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
        ev.preventDefault();

        // Cập nhật text vào node
        textNode.text(textarea.value);

        // --- Đo width tự động vừa nội dung ---
        const lines = textarea.value.split("\n");
        const ctx = document.createElement("canvas").getContext("2d");
        ctx.font = textNode.fontSize() + "px " + textNode.fontFamily();

        // Lấy độ rộng lớn nhất trong các dòng
        const maxWidth = Math.max(...lines.map(line => ctx.measureText(line).width));
        const padding = 10; // chừa khoảng cách nhỏ
        textNode.width(maxWidth + padding);

        removeTextarea();
      } else if (ev.key === "Escape") {
        removeTextarea();
      }
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
