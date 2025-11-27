// internal vars (kept private inside module)
let stage = null;
let backgroundLayer = null;
let iconLayer = null;
let drawingLayer = null;
let backgroundImage = null;

let RECT_TEXT_DEFAULT_COLOR = "blue";

// Thêm vào phần internal vars
let BASE_FONT_SIZE = 16; // Font size mặc định ở zoom 100%
let currentZoom = 1.0; // Tỷ lệ zoom hiện tại


// Thêm vào phần internal vars
let selectedTextNode = null;
let isMoveMode = false;



function createText(defaultText = TEXT_DEFAULT) {
  // groupText();
  if (!backgroundImage || !backgroundImage.image()) {
    console.warn("createText: backgroundImage not ready.");
    return;
  }

  if (!drawingLayer) {
    console.warn("createText: drawingLayer missing.");
    return;
  }

 // ✅ Giới hạn vùng random (để text không chạm mép)
  const minX = 0.05;
  const maxX = 0.85;
  const minY = 0.1;
  const maxY = 0.85;

  // ✅ Random vị trí trong vùng cho phép
  const xNorm = (maxX - minX) + minX;
  const yNorm = Math.random() * (maxY - minY) + minY;  

  const t =  {
    text: defaultText,
    // đặt mặc định ở góc phải dưới (relative to background)
    xNorm,
    yNorm,
    widthNorm: 0.3, // chiều rộng tương đối
    fontSize: 20,
    fontFamily: "Arial",
    fill: RECT_TEXT_DEFAULT_COLOR,
    align: "center", // căn phải cho phù hợp với vị trí góc phải
    lineHeight: 1,
    attrs: {}, // có thể để trống
    baseFontSize: BASE_FONT_SIZE // ✅ Lưu font size gốc
  };

   // --- ASSIGN PAGE BASED ON ABSOLUTE POSITION (OPTIMAL FIX) ---
  try {
    // lấy thông tin background
    if (backgroundImage && backgroundImage.image) {
      const bgX = backgroundImage.x();
      const bgY = backgroundImage.y();
      const bgW = backgroundImage.width();
      const bgH = backgroundImage.height();

      // kiểm tra mode 2-page nếu helper isTwoPage có tồn tại
      const isDual = (typeof isTwoPage === "function") ? isTwoPage() : false;
      const pageDisplayWidth = isDual ? bgW / 2 : bgW;

      // Nếu có biến CURRENT_PAGE_INDEX (ứng dụng có thể set), ưu tiên dùng
      let assignedPage = (typeof CURRENT_PAGE_INDEX !== "undefined" && CURRENT_PAGE_INDEX) ? Number(CURRENT_PAGE_INDEX) : null;

      // tính toạ độ tuyệt đối dựa trên xNorm/yNorm theo logic của generateTextNode:
      // NOTE: xNorm/yNorm được hiểu là tỷ lệ *trên một trang* khi isDual = true
      const xNorm = (typeof t.xNorm !== "undefined") ? Number(t.xNorm) : 0.5;
      const yNorm = (typeof t.yNorm !== "undefined") ? Number(t.yNorm) : 0.5;

      // nếu CURRENT_PAGE_INDEX đã cho và là 2 thì offsetX add pageDisplayWidth
      const pageOffset = (assignedPage === 2 && isDual) ? pageDisplayWidth : 0;
      const absX = bgX + pageOffset + xNorm * pageDisplayWidth;
      const absY = bgY + yNorm * bgH;

      // nếu chưa có assignedPage thì thử dùng helper getCurrentPageForPoint nếu tồn tại
      if (!assignedPage) {
        if (typeof getCurrentPageForPoint === "function") {
          assignedPage = getCurrentPageForPoint(absX, absY) || 1;
        } else {
          assignedPage = 1; // fallback an toàn
        }
      }

      // gán page vào object text trước khi generate node
      t.page = assignedPage;
      // optional debug (bỏ comment nếu cần)
      // console.log('createText: assigned page', t.page, 'absX,absY=', absX, absY);
    } else {
      // fallback nếu background chưa sẵn sàng
      t.page = t.page || 1;
    }
  } catch (err) {
    console.warn("createText: error assigning page", err);
    t.page = t.page || 1;
  }
  generateTextNode(t, -1, backgroundImage, true, true, true, false);
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
    // ✅ Đảm bảo page attribute tồn tại (fallback = 1)
    if (!t.page) {
      t.page = 1;
    }    
    // ✅ Đảm bảo có baseFontSize khi load
    if (!t.baseFontSize) {
        t.baseFontSize = t.fontSize || BASE_FONT_SIZE;
    }    
    generateTextNode(t, idx, backgroundImage, true, true, false, true );
  });

  // redraw once
  drawingLayer.batchDraw();

  // initMoveMode();
  // enableMoveMode();

    // Thay vì gọi trực tiếp, gọi hàm initialize
    initializeTextUtils();  
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

    // ✅ Xác định mode và page width
    const isDualPage = isTwoPage();
    const pageDisplayWidth = isDualPage ? bgW / 2 : bgW;

    // ✅ Xác định page của text này
    const textPage = t.page || 1;

    let x, y, w;

    if (isDualPage) {
      // ✅ DESKTOP MODE: Restore theo page width
      const pageStartX = (textPage === 1) ? 0 : pageDisplayWidth;
      x = bgX + pageStartX + (t.xNorm || 0) * pageDisplayWidth;
      y = bgY + (t.yNorm || 0) * bgH;
      w = (Number(t.widthNorm) || 0) * pageDisplayWidth;
    } else {
      // ✅ MOBILE MODE: Restore theo toàn bộ width
      x = bgX + (t.xNorm || 0) * bgW;
      y = bgY + (t.yNorm || 0) * bgH;
      w = (Number(t.widthNorm) || 0) * bgW;
    }
    
    const baseFontSize = t.baseFontSize || BASE_FONT_SIZE;
    const fontSize = Math.max(8, baseFontSize * currentZoom); // ✅ Tính theo zoom

    // if (isMobile()) {
    //   y -= 2;
    //   t.fontSize = BASE_FONT_SIZE;
    // }
    

    // padding/corner cho background
    const PADDING = t.padding ?? 8;
    const CORNER_RADIUS = t.cornerRadius ?? 6;



    // --- TẠO TEXT --- (giữ nguyên vị trí theo code cũ)
    const textNode = new Konva.Text({
      x: Math.round(x),
      y: Math.round(y),
      text: typeof t.text === "string" ? t.text : "",
      fontSize: fontSize, // ✅ Dùng fontSize đã tính toán
      fontFamily: t.fontFamily || "Arial",
      fontStyle: 'bold',
      fontWeight: 'bold', // ✅ CẢ HAI ĐỀU ĐƯỢC      
      fill: t.fill || "blue",
      width: Math.max(10, Math.round(w || fontSize * 4)),
      draggable: true,
      rotation: 0,
      align: t.align || "center",
      lineHeight: t.lineHeight || 1,
      id: t.id || undefined,
      listening: true,
      page: textPage  // ✅ THÊM DÒNG NÀY
    });

    // ✅ THÊM: Gán PADDING vào textNode để sử dụng ở nơi khác
    textNode._padding = PADDING;        

    // ✅ Lưu baseFontSize để có thể tính lại khi zoom
    textNode.setAttr('baseFontSize', baseFontSize);    

    // Restore attributes và flags lên textNode (giữ logic của bạn)
    textNode.fill(t.fill);
    textNode.setAttr("isShowText", isShowText);
    textNode.setAttr("isShowBorder", isShowBorder);
    textNode.setAttr("readOny", readOny);

    // Restore safe attrs (giữ logic của bạn)
    if (t.attrs && typeof t.attrs === "object") {
      const safeAttrs = Object.assign({}, t.attrs);
      delete safeAttrs.text;
      delete safeAttrs.x;
      delete safeAttrs.y;
      delete safeAttrs.width;
      delete safeAttrs.height;
      delete safeAttrs.id;
      delete safeAttrs.rotation;
      delete safeAttrs.fontSize; // prevent override
      textNode.setAttrs(safeAttrs);
    }

    // --- TẠO NỀN (background rect) ---
    const bgRect = new Konva.Rect({
      x: textNode.x() - PADDING,
      y: textNode.y() - PADDING,
      width: textNode.width() + PADDING * 2,
      height: textNode.height() + PADDING * 2,
      fill:
        typeof t.backgroundColor !== "undefined"
          ? t.backgroundColor
          : "transparent",
      cornerRadius: CORNER_RADIUS,
      stroke: t.backgroundColor ? "#ddd" : "transparent",
      strokeWidth: 1,
      shadowColor: "black",
      shadowBlur: 4,
      draggable: true,
      shadowOffset: { x: 1, y: 1 },
      shadowOpacity: 0.12,
      listening: true,
    });

    // --- HÀM CẬP NHẬT NỀN --- (giữ đồng bộ khi text thay đổi/kéo/transform)
    function updateBackground() {
      // cập nhật kích thước từ textNode
      const textW = textNode.width();
      const textH = textNode.height();
      // nếu textNode có padding internal, bạn có thể cộng thêm, mình dùng PADDING chung
      bgRect.width(textW + PADDING * 2);
      bgRect.height(textH + PADDING * 2);
      // đặt vị trí bgRect dựa vào textNode
      bgRect.x(textNode.x() - PADDING);
      bgRect.y(textNode.y() - PADDING);

      // ✅ THÊM: Đồng bộ page attribute
      bgRect.setAttr('page', textNode.getAttr('page'));      
    }
    updateBackground();

    // ✅ THÊM: Gán hàm updateBackground vào textNode để có thể gọi từ bên ngoài
    textNode._updateBackground = updateBackground;

    // ✅ Lưu reference để dễ quản lý
    textNode._bgRect = bgRect;    

    // --- Add to layer: bgRect trước, textNode sau để text hiển thị trên nền ---
    drawingLayer.add(bgRect);
    drawingLayer.add(textNode);

    // ✅ THÊM: Đồng bộ khi kéo bgRect
    bgRect.on("dragmove", () => {
      // Khi kéo bgRect → cập nhật vị trí textNode
      textNode.x(bgRect.x() + PADDING);
      textNode.y(bgRect.y() + PADDING);
      updateBackground();
    });

    bgRect.on("dragend", () => {
      // ✅ Cập nhật page cho cả bgRect và textNode
      const newX = bgRect.x() + PADDING; // vị trí text trong bgRect
      const newY = bgRect.y() + PADDING;
      
      if (isTwoPage()) {
        const newPage = getCurrentPageForPoint(newX, newY);
        const oldPage = textNode.getAttr('page');
        
        if (newPage !== oldPage) {
          console.log(`📝 Text (via bgRect) moved: page ${oldPage} → ${newPage}`);
          textNode.setAttr('page', newPage);
          bgRect.setAttr('page', newPage);
        }
      }
    });    

    
      // --- AUTO-FIT WIDTH SAU KHI TẠO ---
  // đặt ở ngay sau `drawingLayer.add(textNode);`
  (function autoFitWidthAfterCreate() {
    try {

      // const isReadOnly = textNode.getAttr("readOny");
      // if (isReadOnly) {
      //   return ;
      // }

      const currentText = textNode.text().trim();
      if (!currentText || currentText === TEXT_DEFAULT) return; // ❌ bỏ qua text mặc định
      const lines = (textNode.text() || "").split("\n");
      const ctx = document.createElement("canvas").getContext("2d");
      // đảm bảo font giống Konva text
      const fs = textNode.fontSize ? textNode.fontSize() : fontSize;
      const ff = textNode.fontFamily ? textNode.fontFamily() : (t.fontFamily || "Arial");
      ctx.font = (fs || 14) + "px " + (ff || "Arial");

      const maxWidth = lines.length
        ? Math.max(...lines.map(line => ctx.measureText(line).width))
        : ctx.measureText(textNode.text() || "").width;

      const paddingCalc = 10; // cùng giá trị bạn dùng trong editor
      // nếu muốn giới hạn width tối đa (ví dụ không vượt quá một phần của background), bạn có thể clamp:
      const bgRect = backgroundImage && backgroundImage.getClientRect ? backgroundImage.getClientRect({ relativeTo: stage }) : null;
      const maxAllowed = bgRect ? Math.floor(bgRect.width * 0.9) : Infinity; // 90% background width
      const newWidth = Math.min(Math.ceil(maxWidth + paddingCalc), maxAllowed);

      textNode.width(Math.max(10, newWidth));

      // cập nhật nền + transformer
      try { updateBackground(); } catch (e) {}
      try { if (textNode._transformer) textNode._transformer.forceUpdate(); } catch (e) {}
      drawingLayer.batchDraw();
    } catch (err) {
      // không block nếu lỗi
      console.warn('autoFitWidthAfterCreate failed', err);
    }
  })();


    // Restore attributes và flags lên textNode (giữ logic của bạn)
    textNode.fill(t.fill);
    textNode.setAttr("isShowText", isShowText);
    textNode.setAttr("isShowBorder", isShowBorder);
    textNode.setAttr("readOny", readOny);

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
      draggable: true,
      borderStrokeWidth: 0.3,
      borderStroke: "rgba(0, 0, 0, 0.2)",
    });

    drawingLayer.add(tr);

    // 🔗 Gán reference ngược để dễ xóa
    textNode._transformer = tr;

    textNode.on("transform", function () {
      // scaleY ảnh hưởng lineHeight
      const scaleY = textNode.scaleY() || 1;
      const newLineHeight = (textNode.lineHeight() || 1) * scaleY;
      textNode.lineHeight(newLineHeight);
      textNode.scaleY(1);

      // width / scaleX
      const scaleX = textNode.scaleX() || 1;
      textNode.width(textNode.width() * scaleX);
      textNode.scaleX(1);

      // cập nhật nền
      updateBackground();
      drawingLayer.batchDraw();
    });


    // Drag events (sync updated background khi kéo)

    textNode.on("dragstart", () => {
      setCursor("pointer");
      // ✅ Lưu page ban đầu để debug
      textNode.setAttr('_dragStartPage', textNode.getAttr('page'));
    });

    textNode.on("dragmove", () => {
      setCursor("pointer");
    });

    textNode.on("dragend", () => {
      setCursor("default");
      
      // ✅ Cập nhật page dựa trên vị trí mới
      const newX = textNode.x();
      const newY = textNode.y();
      
      // Chỉ cập nhật page trong Desktop mode (dual pages)
      if (isTwoPage()) {
        const newPage = getCurrentPageForPoint(newX, newY);
        const oldPage = textNode.getAttr('page');
        
        if (newPage !== oldPage) {
          console.log(`📝 Text moved: page ${oldPage} → ${newPage}`);
          textNode.setAttr('page', newPage);
          
          // ✅ Cập nhật màu fill để debug (optional)
          // if (newPage === 1) {
          //   textNode.fill('blue');
          // } else {
          //   textNode.fill('red');
          // }
        }
      }
      // Mobile mode: page không thay đổi (luôn là JSON page hiện tại)
    });

    // --- TOOLTIP (an toàn check htmlTooltip/stage) ---
    textNode.on("mousemove", (e) => {
      try {
        const stageLocal = e.target.getStage();
        const pointer = stageLocal && stageLocal.getPointerPosition();
        if (pointer && htmlTooltip) {
          htmlTooltip.style.left = pointer.x + 10 + "px";
          htmlTooltip.style.top = pointer.y + 10 + "px";
          htmlTooltip.textContent = textNode.text();
          htmlTooltip.style.display = "block";
          htmlTooltip.style.opacity = "1";
        }
      } catch (err) {}
    });

    textNode.on("mouseout", () => {
      if (htmlTooltip) {
        htmlTooltip.style.opacity = "0";
        setTimeout(() => (htmlTooltip.style.display = "none"), 150);
      }
    });

    // show/hide helpers (cập nhật bgRect luôn)
    function showBorder(isShow = true) {
      tr.visible(Boolean(isShow));
      try {
        tr.forceUpdate();
      } catch (e) {}
      drawingLayer.batchDraw();
    }

    function showText(isShow = true) {
      isShow = true;
      textNode.visible(Boolean(isShow));
      bgRect.visible(Boolean(isShow)); // bg cùng ẩn/hiện với text
      drawingLayer.batchDraw();
    }

    // enable draggable
    // textNode.draggable(Boolean(isDraggable));
    // tr.draggable(Boolean(isDraggable));

    // đảm bảo transformer hiển thị theo isShowBorder
    showText(isShowText);
    showBorder(isShowBorder);

    // --- Rotate icon mở color popup (an toàn) ---
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

    // cursor feedback
    const setCursor = (type) => {
      if (stage && stage.container()) stage.container().style.cursor = type;
    };
    tr.on("mouseover", () => setCursor("pointer"));
    tr.on("mouseout", () => setCursor("default"));
    textNode.on("mouseover", () => setCursor("pointer"));
    textNode.on("mouseout", () => setCursor("default"));

    // update background khi text thay đổi
    textNode.on("text change fontSize", () => {
      updateBackground();
      try {
        tr.forceUpdate();
      } catch (e) {}
      drawingLayer.batchDraw();
    });

    // --- Editor logic (open textarea) ---
    function openTextEditor(e) {
      if (readOny) {
        return;
      }

      textNode.hide();
      tr.hide();
      bgRect.hide();

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
      const padding = 0;
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
        bgRect.show();
        try {
          tr.forceUpdate();
        } catch (e) {}
        drawingLayer.batchDraw();
      }

      function handleOutsideClick(ev) {
        if (ev.target !== textarea) {
          textNode.text(textarea.value);

          // đo lại width cho textNode dựa vào nội dung
          const lines = textarea.value.split("\n");
          const ctx = document.createElement("canvas").getContext("2d");
          ctx.font = textNode.fontSize() + "px " + textNode.fontFamily();
          const maxWidth = Math.max(
            ...lines.map((line) => ctx.measureText(line).width)
          );
          const paddingCalc = 10;
          textNode.width(maxWidth + paddingCalc);

          updateBackground();
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
          textNode.text(textarea.value);
          const lines = textarea.value.split("\n");
          const ctx = document.createElement("canvas").getContext("2d");
          ctx.font = textNode.fontSize() + "px " + textNode.fontFamily();
          const maxWidth = Math.max(
            ...lines.map((line) => ctx.measureText(line).width)
          );
          const paddingCalc = 10;
          textNode.width(maxWidth + paddingCalc);
          updateBackground();
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

(function attachMouseClickDbl(node, opts = {}) {
  // ✅ TRONG MOVE MODE: KHÔNG gắn sự kiện gì cả
  if (isMoveMode) {
    return;
  }

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


textNode.on("touchstart", (ev) => {
  if (isMoveMode) {
    // ✅ TRONG MOVE MODE: KHÔNG làm gì cả
    return;
  }
});


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
    // ✅ THÊM DÒNG NÀY - hỗ trợ move mode
        // if (isMoveMode && !selectedTextNode) {
        //     handleStageClick(e);
        //     e.cancelBubble = true; // ngừng lan ra stage click
        // }

          /* optional debug */
        });


      } catch (err) {
        console.warn("generateTextNode: failed to restore", idx, err, t);
      }
}



function saveTextNodes(bgDisplay, isPage1 = true, isDualPage = false, pageDisplayWidth = null) {
  var textNodes = [];
  try {
    const texts = drawingLayer ? drawingLayer.find("Text") : [];
    texts.forEach((tn) => {
      const absX = tn.x();
      const absY = tn.y();
      const w = tn.width();
      const h = tn.height();
      
      let nx, ny, nw, nh;
      
      if (isDualPage) {
        // ✅ DESKTOP MODE: Normalize theo PAGE width
        const relativeX = absX - bgDisplay.x;
        const pageStartX = isPage1 ? 0 : pageDisplayWidth;
        
        // Normalize x theo page width
        nx = pageDisplayWidth ? (relativeX - pageStartX) / pageDisplayWidth : 0;
        ny = bgDisplay.height ? (absY - bgDisplay.y) / bgDisplay.height : 0;
        
        // Width/height cũng normalize theo page width
        nw = pageDisplayWidth ? w / pageDisplayWidth : 0;
        nh = bgDisplay.height ? h / bgDisplay.height : 0;
      } else {
        // ✅ MOBILE MODE: Normalize theo toàn bộ background width
        nx = bgDisplay.width ? (absX - bgDisplay.x) / bgDisplay.width : 0;
        ny = bgDisplay.height ? (absY - bgDisplay.y) / bgDisplay.height : 0;
        nw = bgDisplay.width ? w / bgDisplay.width : 0;
        nh = bgDisplay.height ? h / bgDisplay.height : 0;
      }

      // Lấy attrs nhưng lọc ra các trường đã lưu riêng (tránh duplicate)
      let savedAttrs = {};
      try {
        const allAttrs = tn.getAttrs ? tn.getAttrs() : {};
        // copy selective attrs (or remove keys you don't want)
        savedAttrs = Object.assign({}, allAttrs);
        // remove duplicates / positional / dimensional props
        delete savedAttrs.text;
        delete savedAttrs.x;
        delete savedAttrs.y;
        delete savedAttrs.width;
        delete savedAttrs.height;
        delete savedAttrs.id; // nếu bạn không muốn ghi id vào attrs nữa
        delete savedAttrs.isShowText;
        delete savedAttrs.isShowBorder;
        delete savedAttrs.readOny;
      } catch (err) {
        savedAttrs = null;
      }

      
      textNodes.push({
        text: tn.text(),
        fontSize: tn.getAttr('baseFontSize') || BASE_FONT_SIZE, // ✅ Lưu font size gốc
        baseFontSize: tn.getAttr('baseFontSize') || BASE_FONT_SIZE, // ✅ Thêm baseFontSize
        fontFamily: tn.fontFamily ? tn.fontFamily() : undefined,
        fill: tn.fill ? tn.fill() : undefined,
        align: tn.align ? tn.align() : undefined,
        lineHeight: tn.lineHeight ? tn.lineHeight() : undefined,
        widthNorm: formatNumber(nw),
        heightNorm: formatNumber(nh),
        xNorm: formatNumber(nx),
        yNorm: formatNumber(ny),
        rotation: tn.rotation ? tn.rotation() : 0,
        draggable: !!tn.draggable(),
        id: tn.id() || null,
        attrs: savedAttrs,
        page: tn.getAttr('page') || 1  // ✅ THÊM DÒNG NÀY
      });
    });
  } catch (err) {
    console.warn("saveTextNodes: error enumerating Text nodes", err);
  }

  return textNodes;
}

function deleteTextNode(textNode) {
  if (!textNode) return;

  try {
    // 🔥 chỉ xóa transformer gắn với textNode này
    if (textNode._transformer) {
      textNode._transformer.destroy();
    }

    // 🔥 gỡ event listener dblclick nếu có
    if (textNode._containerDbl && stage && stage.container) {
      stage.container().removeEventListener("dblclick", textNode._containerDbl, true);
    }

    // 🔥 xóa luôn background rect nếu có (nếu bạn lưu reference)
    if (textNode._bgRect) {
      textNode._bgRect.destroy();
    }

    textNode.destroy();
    drawingLayer.batchDraw();
  } catch (err) {
    console.warn("deleteTextNode failed", err);
  }
}


function updateFontSizeForZoom(zoomLevel) {
    currentZoom = zoomLevel;
    const textNodes = drawingLayer ? drawingLayer.find("Text") : [];
    
    textNodes.forEach(textNode => {
        const baseSize = textNode.getAttr('baseFontSize') || BASE_FONT_SIZE;
        const newSize = Math.max(8, baseSize * zoomLevel);
        
        textNode.fontSize(newSize);
        
        // ✅ AUTO-FIT WIDTH ĐỘNG theo nội dung thực tế
        autoFitTextWidth(textNode);
        
        // Cập nhật background
        updateTextBackground(textNode);
    });
    
    if (drawingLayer) {
        drawingLayer.batchDraw();
    }
}

function autoFitTextWidth(textNode) {
    try {
        const currentText = textNode.text().trim();
        if (!currentText) return;
        
        // ✅ PHƯƠNG PHÁP 1: Reset width để text tự co giãn
        textNode.width(null);
        
        // ✅ PHƯƠNG PHÁP 2: Dùng Konva's measurement
        let textWidth;
        try {
            textWidth = textNode.getTextWidth();
        } catch (e) {
            // Fallback: tính thủ công
            const ctx = document.createElement("canvas").getContext("2d");
            const fs = textNode.fontSize();
            const ff = textNode.fontFamily() || "Arial";
            ctx.font = `${fs}px ${ff}`;
            
            const lines = currentText.split("\n");
            textWidth = lines.length 
                ? Math.max(...lines.map(line => ctx.measureText(line).width))
                : ctx.measureText(currentText).width;
        }
        
        // ✅ SET WIDTH MỚI VỚI PADDING
        const paddingCalc = 12 * currentZoom; // Tăng padding một chút
        const newWidth = Math.max(40, Math.ceil(textWidth + paddingCalc));
        
        textNode.width(newWidth);
        
        console.log('✅ Auto-fit successful:', {
            text: currentText.substring(0, 30) + '...',
            textWidth: Math.round(textWidth),
            newWidth,
            zoom: currentZoom
        });
        
    } catch (err) {
        console.warn('autoFitTextWidth failed', err);
    }
}


// ✅ Hàm cập nhật background cho text
function updateTextBackground(textNode) {
    if (!textNode._bgRect) return;
    
    const PADDING = 8 * currentZoom; // ✅ Padding scale theo zoom
    
    textNode._bgRect.x(textNode.x() - PADDING);
    textNode._bgRect.y(textNode.y() - PADDING);
    textNode._bgRect.width(textNode.width() + PADDING * 2);
    textNode._bgRect.height(textNode.height() + PADDING * 2);
    
    // ✅ GIỮ NGUYÊN stroke settings khi cập nhật
    // Không reset stroke ở đây
    
    // Cập nhật transformer nếu có
    if (textNode._transformer) {
        try {
            textNode._transformer.forceUpdate();
        } catch (e) {}
    }
}



// Thêm hàm để kích hoạt chế độ di chuyển
function enableMoveMode() {
    isMoveMode = true;
    if (stage && stage.container()) {
        stage.container().style.cursor = "crosshair";
    }
    console.log("🔄 Move mode enabled - Stage cursor:", stage?.container()?.style.cursor);
}

// Thêm hàm để tắt chế độ di chuyển
function disableMoveMode() {
    isMoveMode = false;
    selectedTextNode = null;
    if (stage && stage.container()) {
        stage.container().style.cursor = "default";
    }
    console.log("❌ Move mode disabled");
}

// Hàm debug để kiểm tra vị trí
function debugTextPosition(textNode) {
    if (!textNode) return;
    
    console.log('🔍 DEBUG Text Position:', {
        text: textNode.text().substring(0, 20),
        textX: textNode.x(),
        textY: textNode.y(),
        textWidth: textNode.width(),
        textHeight: textNode.height(),
        bgRectX: textNode._bgRect ? textNode._bgRect.x() : 'N/A',
        bgRectY: textNode._bgRect ? textNode._bgRect.y() : 'N/A',
        bgRectWidth: textNode._bgRect ? textNode._bgRect.width() : 'N/A',
        bgRectHeight: textNode._bgRect ? textNode._bgRect.height() : 'N/A',
        hasUpdateBackground: !!textNode._updateBackground
    });
}

// Hàm xử lý sự kiện click trên stage
function handleStageClick(ev) {
    console.log("🎯 Stage click/tap event triggered", ev.type);
    
    if (!isMoveMode) {
        console.log("❌ Move mode not active");
        return;
    }
    
    if (!stage) {
        console.log("❌ Stage not available");
        return;
    }
    
    // Lấy vị trí click từ event
    let pos;
    if (ev.evt) {
        // Konva event
        pos = stage.getPointerPosition();
    } else {
        // Native event
        const rect = stage.container().getBoundingClientRect();
        pos = {
            x: ev.clientX - rect.left,
            y: ev.clientY - rect.top
        };
    }
    
    if (!pos) {
        console.log("❌ No pointer position");
        return;
    }
    
    console.log("🎯 Click position:", pos.x, pos.y);
    
    // TÌM TEXT NODE tại vị trí click
    const allTexts = drawingLayer.find('Text');
    let clickedTextNode = null;
    
    // Kiểm tra từng text node xem có bị click không
    for (let textNode of allTexts) {
        const rect = textNode.getClientRect();
        if (pos.x >= rect.x && pos.x <= rect.x + rect.width &&
            pos.y >= rect.y && pos.y <= rect.y + rect.height) {
            clickedTextNode = textNode;
            console.log("🎯 Found text node at click position:", textNode.text());
            break;
        }
    }
    
    if (clickedTextNode) {
        // Click vào text node: CHỌN hoặc DI CHUYỂN text
        if (selectedTextNode !== clickedTextNode) {
            // Chọn text node mới
            selectTextNode(clickedTextNode);
        } else {
            // ✅ SỬA: Click vào text node ĐÃ CHỌN - DI CHUYỂN nó đến vị trí click
            console.log("🎯 Moving selected text to new click position");
            moveSelectedTextToPosition(pos.x, pos.y);
        }
    } else {
        // Click vào vùng trống: DI CHUYỂN text đã chọn
        if (selectedTextNode) {
            console.log("🎯 Moving selected text to new position");
            moveSelectedTextToPosition(pos.x, pos.y);
        } else {
            console.log("⚠️ No text selected, please click a text first");
        }
    }
}


// Hàm chọn text node
function selectTextNode(textNode) {
    // Bỏ chọn text node cũ (nếu có)
    if (selectedTextNode && selectedTextNode !== textNode) {
        if (selectedTextNode._bgRect) {
            selectedTextNode._bgRect.stroke('transparent');
            selectedTextNode._bgRect.strokeWidth(1);
        }
    }
    
    selectedTextNode = textNode;
    
    // Highlight text được chọn
    if (selectedTextNode._bgRect) {
        selectedTextNode._bgRect.stroke('red');
        selectedTextNode._bgRect.strokeWidth(2);
        selectedTextNode._bgRect.strokeEnabled(true);
        
        // ✅ SỬA: Force update transformer để hiển thị border vàng ngay lập tức
        if (selectedTextNode._transformer) {
            try {
                selectedTextNode._transformer.forceUpdate();
            } catch (e) {}
        }
    }
    
    console.log("✅ Text selected:", selectedTextNode.text().substring(0, 20) + "...");
    drawingLayer.batchDraw();
}

// Hàm bỏ chọn text node
function deselectTextNode() {
    if (selectedTextNode && selectedTextNode._bgRect) {
        selectedTextNode._bgRect.stroke('transparent');
        selectedTextNode._bgRect.strokeWidth(1);
        
        // ✅ Cập nhật transformer để áp dụng thay đổi
        if (selectedTextNode._transformer) {
            try {
                selectedTextNode._transformer.forceUpdate();
            } catch (e) {}
        }
    }
    selectedTextNode = null;
}

// Sửa lại moveSelectedTextToPosition để dùng PADDING từ textNode
function moveSelectedTextToPosition(x, y) {
    if (!selectedTextNode) {
        console.log("❌ No text selected to move");
        return;
    }
    
    try {
        console.log("🎯 Moving text from:", selectedTextNode.x(), selectedTextNode.y(), "to:", x, y);
        
        // ✅ SỬA: Sử dụng PADDING từ chính textNode
        const PADDING = selectedTextNode._padding || 8;
        
        // Đặt text node trực tiếp tại vị trí click (căn giữa)
        selectedTextNode.x(x - selectedTextNode.width() / 2);
        selectedTextNode.y(y - selectedTextNode.height() / 2);
        
        // ✅ Cập nhật background rect với PADDING chính xác
        if (selectedTextNode._bgRect) {
            selectedTextNode._bgRect.x(selectedTextNode.x() - PADDING);
            selectedTextNode._bgRect.y(selectedTextNode.y() - PADDING);
            selectedTextNode._bgRect.width(selectedTextNode.width() + PADDING * 2);
            selectedTextNode._bgRect.height(selectedTextNode.height() + PADDING * 2);
            
            // Đảm bảo border vàng vẫn hiển thị
            selectedTextNode._bgRect.stroke('red');
            selectedTextNode._bgRect.strokeWidth(2);
            selectedTextNode._bgRect.strokeEnabled(true);
        }
        
        // Cập nhật transformer
        if (selectedTextNode._transformer) {
            try {
                selectedTextNode._transformer.forceUpdate();
            } catch (e) {}
        }
        
        console.log(`✅ Text moved to: x=${Math.round(selectedTextNode.x())}, y=${Math.round(selectedTextNode.y())}`);
        drawingLayer.batchDraw();
        
    } catch (error) {
        console.error("❌ Error moving text:", error);
    }
}



// Hàm để thêm sự kiện click vào stage (gọi khi khởi tạo)
function initMoveMode() {
    if (stage && stage.container()) {
        console.log("🔧 Initializing move mode with container events");
        
        const container = stage.container();
        
        // Remove existing listeners
        container.removeEventListener('click', handleContainerClick);
        stage.off('click tap');
        
        // Add container event (more reliable)
        container.addEventListener('click', handleContainerClick);
        container.addEventListener('touchstart', handleContainerClick);
        
        // Also keep Konva events as backup
        stage.on('click tap', handleStageClick);
        
        console.log("✅ Move mode events attached to container");
    } else {
        console.log("❌ Stage container not available");
    }
}

// Hàm xử lý sự kiện container
function handleContainerClick(ev) {
    console.log("🎯 Container click event");
    handleStageClick(ev);
}

// Hàm utility để kiểm tra xem move mode có đang active không
function isMoveModeActive() {
    return isMoveMode;
}

// Thêm vào phần export/public functions nếu bạn có module pattern
// Ví dụ:
// return {
//     createText,
//     loadTexts,
//     saveTextNodes,
//     deleteTextNode,
//     updateFontSizeForZoom,
//     enableMoveMode,
//     disableMoveMode,
//     isMoveModeActive,
//     initMoveMode
// };

// Hàm để bỏ chọn text node hiện tại
function clearTextSelection() {
    deselectTextNode();
    console.log("🗑️ Text selection cleared");
}

// Sửa hàm disableMoveMode
function disableMoveMode() {
    isMoveMode = false;
    deselectTextNode(); // Bỏ chọn text khi tắt move mode
    if (stage && stage.container()) {
        stage.container().style.cursor = "default";
    }
    console.log("❌ Move mode disabled");
}

// Sửa phần cuối file - đảm bảo stage đã tồn tại
function initializeTextUtils() {
    // Đợi một chút để đảm bảo stage đã được tạo
    setTimeout(() => {
        if (stage) {
            initMoveMode();
            // enableMoveMode();
            console.log("✅ Text utils initialized with move mode");
        } else {
            console.log("❌ Stage not ready, retrying...");
            initializeTextUtils(); // Retry
        }
    }, 100);
}

