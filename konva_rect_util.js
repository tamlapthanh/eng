function createRect() {
  const coverRect = createLoadCoverRect({
    x: 100,
    y: 80,
    width: 240,
    height: 140,
    fill: "#c0c0c0",
    draggable:true,
    locked: false,
  });
   coverRectsArray.push(coverRect);
}

// Clear tất cả
function clearAllCoverRects() {
  coverRectsArray.forEach((obj) => {
    try {
      // obj.destroy() đã off listener, destroy transformer & dashed & rect
      obj.destroy();
    } catch (e) {
      console.warn("clearAllCoverRects: destroy failed", e);
    }
  });
  coverRectsArray = [];
  drawingLayer.batchDraw();
}



function loadRectFromExport(rectArray, options = {}) {

  var isLocked = true;
  var isDraggable = false;

  rectArray.forEach((it, i) => {
    IS_EANBLE_SWIPE = false;
    // Tương thích: nếu file cũ lưu absolute x/y/width/height (không có xNorm)
    // => detect và convert sang relative trước khi fromRelative
    if (typeof it.xNorm === "undefined" && typeof it.x !== "undefined") {
      // convert absolute -> relative
      const bgX = backgroundImage.x();
      const bgY = backgroundImage.y();
      const bgW = backgroundImage.width();
      const bgH = backgroundImage.height();

      it.xNorm = bgW ? Number(((it.x - bgX) / bgW).toFixed(6)) : 0;
      it.yNorm = bgH ? Number(((it.y - bgY) / bgH).toFixed(6)) : 0;
      it.widthNorm = bgW ? Number((it.width / bgW).toFixed(6)) : 0;
      it.heightNorm = bgH ? Number((it.height / bgH).toFixed(6)) : 0;
    }

    const coverRect = createLoadCoverRect({
      x: 0, // sẽ set lại bằng fromRelative
      y: 0,
      width: 100,
      height: 100,
      fill: it.fill,
      stroke: it.stroke,
      strokeWidth: it.strokeWidth,
      cornerRadius: it.cornerRadius,
      locked: isLocked,
      draggable: isDraggable,
      //   draggable: it.draggable ?? true,
    });

    coverRect.fromRelative({
      xNorm: it.xNorm,
      yNorm: it.yNorm,
      widthNorm: it.widthNorm,
      heightNorm: it.heightNorm,
    });

    coverRectsArray.push(coverRect);
  });

  drawingLayer.batchDraw();
}

/**
 * createCoverRect(opts)
 * - opts: { x, y, width, height, fill, stroke, strokeWidth, cornerRadius, padding, draggable, keepAspect }
 * Returns API: { node, transformer, toRelative, fromRelative, fitToRect, setStyle, destroy }
 */
function createLoadCoverRect(opts = {}) {
  if (!stage || !drawingLayer || !backgroundImage) {
    console.warn("createLoadCoverRect: stage/drawingLayer/backgroundImage required");
    return null;
  }

  const padding = opts.padding ?? 6;
  const fill = typeof opts.fill !== "undefined" ? opts.fill : "rgba(0,0,0,0.25)";
  const stroke = opts.stroke ?? "#ffffff";
  const strokeWidth = typeof opts.strokeWidth === "number" ? opts.strokeWidth : 1;
  const cornerRadius = opts.cornerRadius ?? 6;
  const draggable = typeof opts.draggable === "boolean" ? opts.draggable : true;
  const keepAspect = !!opts.keepAspect;
  let isLocked = !!opts.locked;
  

  const rect = new Konva.Rect({
    x: Number(opts.x ?? 50),
    y: Number(opts.y ?? 50),
    width: Number(opts.width ?? 120),
    height: Number(opts.height ?? 80),
    fill,
    stroke,
    strokeWidth,
    cornerRadius,
    draggable: !isLocked && (typeof opts.draggable === 'boolean' ? opts.draggable : true),
    listening: !isLocked,
    name: "maskRect",
  });

  const dashed = new Konva.Rect({
    x: rect.x(),
    y: rect.y(),
    width: rect.width(),
    height: rect.height(),
    stroke: "#000",
    dash: [6, 4],
    visible: false,
    listening: false,
  });

  drawingLayer.add(rect);
  drawingLayer.add(dashed);

 // luôn tạo transformer, nhưng sẽ disable/hidden nếu locked
  const defaultAnchors = keepAspect
    ? ["top-left", "top-right", "bottom-left", "bottom-right"]
    : [
        "top-left","top-center","top-right",
        "middle-left","middle-right",
        "bottom-left","bottom-center","bottom-right"
      ];


  const tr = new Konva.Transformer({
    node: rect,
    enabledAnchors: isLocked ? [] : defaultAnchors,
    rotateEnabled: isLocked ? false : true,
    keepRatio: keepAspect,
    boundBoxFunc: (oldBox, newBox) => {
      newBox.width = Math.max(6, Math.round(newBox.width));
      newBox.height = Math.max(6, Math.round(newBox.height));
      newBox.rotation = 0;
      return newBox;
    },
    anchorSize: 8,
    anchorFill: "#fff",
    anchorStroke: "#444",
    borderStroke: "rgba(0,0,0,0.2)",
    borderStrokeWidth: 1,
  });
  drawingLayer.add(tr);

    // --- thêm reference ngược để delete dễ dàng ---
  rect._transformer = tr;
  rect._dashed = dashed;

  function destroy() {
    try { tr.destroy(); } catch (e) {}
    try { dashed.destroy(); } catch (e) {}
    try { rect.destroy(); } catch (e) {}
    // off chỉ khi onStagePointerDown có tồn tại
    try {
      if (typeof onStagePointerDown === 'function' && stage) {
        stage.off("contentMouseDown contentTouchStart", onStagePointerDown);
      }
    } catch (e) {}
    drawingLayer.batchDraw();
  }

  function syncDashed() {
    dashed.position({ x: rect.x(), y: rect.y() });
    dashed.width(rect.width());
    dashed.height(rect.height());
  }

  // show transformer + dashed on dblclick/dbltap
  rect.on("dbltap dblclick", () => {
  if (isLocked) return;
  tr.nodes([rect]);
  tr.visible(true);
  tr.forceUpdate();
  dashed.visible(true);
  drawingLayer.batchDraw();
  });

    // --- Rotate icon mở color popup (an toàn) ---
    tr.on("mousedown touchstart", function (evt) {

        if (isLocked) return;

      const target = evt.target;
      const isRotater =
        (typeof target.name === "function" && target.name() === "rotater") ||
        (typeof target.hasName === "function" && target.hasName("rotater"));
      if (isRotater) {
        evt.cancelBubble = true;
        evt.evt?.preventDefault?.();
        deleteCoverRect(rect);
      }
    });  

  // sync while moving/resizing
  rect.on("dragmove transform move", () => {
    if (isLocked) return;

    syncDashed();
    drawingLayer.batchDraw();
  });
  rect.on("transformend dragend", () => {
    if (isLocked) return;

    syncDashed();
    try {
      tr.forceUpdate();
    } catch (e) {}
    drawingLayer.batchDraw();
  });

  // API helpers
  function toRelative() {
    const bgX = backgroundImage.x();
    const bgY = backgroundImage.y();
    const bgW = backgroundImage.width();
    const bgH = backgroundImage.height();
    const x = rect.x();
    const y = rect.y();
    const w = rect.width();
    const h = rect.height();

    return {
      xNorm: bgW ? Number(((x - bgX) / bgW).toFixed(6)) : 0,
      yNorm: bgH ? Number(((y - bgY) / bgH).toFixed(6)) : 0,
      widthNorm: bgW ? Number((w / bgW).toFixed(6)) : 0,
      heightNorm: bgH ? Number((h / bgH).toFixed(6)) : 0,
    };
  }

  function fromRelative(obj = {}) {
    if (!obj) return;
    // lấy client rect của background (absolute)
    const bgRect = backgroundImage.getClientRect({ relativeTo: stage });

    // tính tuyệt đối
    const xAbs = bgRect.x + (obj.xNorm || 0) * bgRect.width;
    const yAbs = bgRect.y + (obj.yNorm || 0) * bgRect.height;
    const wAbs = (obj.widthNorm || 0) * bgRect.width;
    const hAbs = (obj.heightNorm || 0) * bgRect.height;

    // nếu rect của bạn đang ở cùng layer với background, set position/size trực tiếp:
    rect.position({ x: Math.round(xAbs), y: Math.round(yAbs) });

    // reset scale để tránh kích thước bị nhân lên (nếu trước đó transform dùng scale)
    rect.scaleX(1);
    rect.scaleY(1);

    rect.width(Math.max(2, Math.round(wAbs)));
    rect.height(Math.max(2, Math.round(hAbs)));
    rect.rotation(0);

    syncDashed();
    try {
      tr.forceUpdate();
    } catch (e) {}
    drawingLayer.batchDraw();
  }

  // fit to absolute rect (x,y,w,h) — tiện khi bạn muốn snap cover lên một vùng cụ thể
  function fitToRect(absRect = {}) {
    if (!absRect) return;
    rect.position({
      x: Math.round(absRect.x || rect.x()),
      y: Math.round(absRect.y || rect.y()),
    });
    rect.width(Math.round(absRect.width || rect.width()));
    rect.height(Math.round(absRect.height || rect.height()));
    syncDashed();
    try {
      tr.forceUpdate();
    } catch (e) {}
    drawingLayer.batchDraw();
  }

  function setStyle(style = {}) {
    if (typeof style.fill !== "undefined") rect.fill(style.fill);
    if (typeof style.stroke !== "undefined") rect.stroke(style.stroke);
    if (typeof style.strokeWidth !== "undefined")
      rect.strokeWidth(style.strokeWidth);
    if (typeof style.cornerRadius !== "undefined")
      rect.cornerRadius(style.cornerRadius);
    drawingLayer.batchDraw();
  }

  function destroy() {
    try {
      tr.destroy();
    } catch (e) {}
    try {
      dashed.destroy();
    } catch (e) {}
    try {
      rect.destroy();
    } catch (e) {}
    // stage.off("contentMouseDown contentTouchStart", onStagePointerDown);
    drawingLayer.batchDraw();
  }

   // lock/unlock API
  function lock() {
    if (isLocked) return;
    isLocked = true;
    // disable interactions
    rect.draggable(false);
    rect.listening(false); // không bắt sự kiện chuột/touch
    dashed.visible(false);
    if (tr) {
      try {
        tr.nodes([]);
        tr.enabledAnchors([]);
        tr.visible(false);
      } catch (e) {}
    }
    drawingLayer.batchDraw();
  }

  function unlock() {
    if (!isLocked) return;
    isLocked = false;
    rect.draggable(Boolean(opts.draggable !== false)); // restore default draggable setting
    rect.listening(true);
    if (tr) {
      try {
        tr.enabledAnchors(defaultAnchors.slice());
        tr.nodes([]); // vẫn ẩn transformer cho tới khi dblclick
        tr.visible(false);
      } catch (e) {}
    }
    drawingLayer.batchDraw();
  }

  // initial sync + draw
  syncDashed();

//   // apply initial locked state (in case opts.locked was true)
//   if (isLocked) {
//     // ensure transformer disabled/hidden
//     try {
//       tr.nodes([]);
//       tr.enabledAnchors([]);
//       tr.visible(false);
//     } catch (e) {}
//     dashed.visible(false);
//   } else {
//     // initially hidden transformer/dashed until dblclick
//     tr.nodes([]);
//     tr.visible(false);
//     dashed.visible(false);
//   }

  drawingLayer.batchDraw();

  return {
    node: rect,
    transformer: tr,
    dashed,
    toRelative,
    fromRelative,
    fitToRect,
    setStyle,
    destroy,
    lock,
    unlock,
    isLocked: () => Boolean(isLocked),    
  };
}


function deleteCoverRect(target) {
  if (!target) return false;

  // 1) Nếu truyền object trả về bởi createLoadCoverRect (có .destroy() và obj.node)
  if (typeof target === 'object' && typeof target.destroy === 'function' && target.node) {
    try {
      target.destroy();
    } catch (e) {
      console.warn('deleteCoverRect: destroy wrapper failed', e);
    }
    // nếu bạn duy trì mảng coverRectsArray toàn cục, remove object đó
    if (Array.isArray(window.coverRectsArray)) {
      const idx = coverRectsArray.indexOf(target);
      if (idx !== -1) coverRectsArray.splice(idx, 1);
    }
    drawingLayer && drawingLayer.batchDraw();
    return true;
  }

  // 2) Nếu truyền một Konva node (Rect)
  if (typeof target === 'object' && typeof target.getClassName === 'function') {
    const node = target;

    // a) nếu node có reference _transformer -> destroy hoặc detach
    try {
      if (node._transformer) {
        try { node._transformer.destroy(); } catch (e) { /* ignore */ }
        node._transformer = null;
      } else {
        // fallback: tìm transformers trên layer và chỉ xử lý các tr có chứa node
        const transformers = drawingLayer.find('Transformer') || [];
        transformers.forEach(tr => {
          try {
            const nodes = typeof tr.nodes === 'function' ? tr.nodes() : (typeof tr.node === 'function' ? [tr.node()] : []);
            if (!nodes || nodes.length === 0) return;
            const contains = nodes.some(n => n === node);
            if (!contains) return;
            if (nodes.length === 1) {
              // chỉ chứa node này => destroy tr
              try { tr.destroy(); } catch (e) {}
            } else {
              // remove node khỏi tr
              const newNodes = nodes.filter(n => n !== node);
              try { tr.nodes(newNodes); } catch (e) { try { tr.destroy(); } catch (_) {} }
            }
          } catch (e) {}
        });
      }
    } catch (e) {
      console.warn('deleteCoverRect: transformer cleanup error', e);
    }

    // b) dashed rect
    try {
      if (node._dashed) {
        try { node._dashed.destroy(); } catch (e) {}
        node._dashed = null;
      } else {
        // fallback: tìm Rect có dash và clientRect trùng với node
        const allRects = drawingLayer.find('Rect') || [];
        const nodeClient = node.getClientRect({ relativeTo: stage });
        allRects.forEach(r => {
          let dashVal;
          try {
            dashVal = (typeof r.dash === 'function') ? r.dash() : (r.getAttr ? r.getAttr('dash') : undefined);
          } catch (e) { dashVal = undefined; }
          if (!Array.isArray(dashVal) || dashVal.length === 0) return;
          const rClient = r.getClientRect({ relativeTo: stage });
          if (Math.abs(rClient.x - nodeClient.x) < 2 &&
              Math.abs(rClient.y - nodeClient.y) < 2 &&
              Math.abs(rClient.width - nodeClient.width) < 2 &&
              Math.abs(rClient.height - nodeClient.height) < 2) {
            try { r.destroy(); } catch (e) {}
          }
        });
      }
    } catch (e) {
      console.warn('deleteCoverRect: dashed cleanup error', e);
    }

    // c) nếu bạn đã lưu onStagePointerDown ref trên node, off đúng handler
    try {
      if (node._onStagePointerDown && stage) {
        try { stage.off('contentMouseDown contentTouchStart', node._onStagePointerDown); } catch (e) {}
        node._onStagePointerDown = null;
      }
    } catch (e) {}

    // d) gỡ color popup DOM nếu có
    try {
      if (node._colorPopup) {
        try { node._colorPopup.remove(); } catch (e) {}
        node._colorPopup = null;
        if (window.currentColorPopupRect === node) window.currentColorPopupRect = null;
      }
    } catch (e) {}

    // e) remove khỏi mảng coverRectsArray nếu bạn dùng mảng quản lý
    if (Array.isArray(window.coverRectsArray)) {
      for (let i = coverRectsArray.length - 1; i >= 0; i--) {
        const obj = coverRectsArray[i];
        if (!obj || !obj.node) continue;
        if (obj.node === node || (obj.node._id && obj.node._id === node._id)) {
          try { obj.destroy(); } catch (e) {}
          coverRectsArray.splice(i, 1);
          drawingLayer && drawingLayer.batchDraw();
          return true;
        }
      }
    }

    // f) cuối cùng destroy node
    try { node.destroy(); } catch (e) { console.warn('deleteCoverRect: final node.destroy failed', e); }
    drawingLayer && drawingLayer.batchDraw();
    return true;
  }

  // 3) nếu truyền id/name
  if (typeof target === 'string' || typeof target === 'number') {
    const s = String(target);
    // tìm node bằng id/name
    let node = drawingLayer.findOne('#' + s) || drawingLayer.findOne('.' + s);
    if (node) return deleteCoverRect(node);
  }

  return false;
}


function saveCoverRects() {
  const nodes = drawingLayer.find('.maskRect');

  const items = nodes.map(node => {
    // lấy client rect (absolute trên stage, đã tính scale/transform)
    const nodeRect = node.getClientRect({ relativeTo: stage });

    // lấy client rect của background image (absolute trên stage)
    const bgRect = backgroundImage.getClientRect({ relativeTo: stage });

    // nếu bgRect.width/height = 0, tránh chia cho 0
    const bgW = bgRect.width || 1;
    const bgH = bgRect.height || 1;

    const data = {
      // relative coords dựa trên client rect
      xNorm: Number(((nodeRect.x - bgRect.x) / bgW).toFixed(6)),
      yNorm: Number(((nodeRect.y - bgRect.y) / bgH).toFixed(6)),
      widthNorm: Number((nodeRect.width / bgW).toFixed(6)),
      heightNorm: Number((nodeRect.height / bgH).toFixed(6)),

      // giữ thêm attrs để restore
      fill: node.fill?.() ?? null,
      stroke: node.stroke?.() ?? null,
      strokeWidth: node.strokeWidth?.() ?? null,
      cornerRadius: node.cornerRadius?.() ?? null,
      draggable: node.draggable?.() ?? true,
      name: node.name?.() ?? null,
      id: node.id?.() ?? null,
    };

    return data;
  });

  return items;
}
