// internal vars (kept private inside module)
let stage = null;
let backgroundLayer = null;
let iconLayer = null;
let drawingLayer = null;
let backgroundImage = null;

function createText() {

  const bgX = backgroundImage.x();
  const bgY = backgroundImage.y();

  const textNode = new Konva.Text({
    text: "....",
    x: bgX,
    y: bgY,
    // fill: "red",
    fontSize: 20,
    draggable: true,
    width: 200,
  });

  iconLayer.add(textNode);

  const tr = new Konva.Transformer({
    node: textNode,
    // anchorFill: "blue" ,
    // borderStroke : "black" ,
    enabledAnchors: ["middle-left", "middle-right"],    
    boundBoxFunc: function (oldBox, newBox) {
      newBox.width = Math.max(30, newBox.width);
      return newBox;
    },
  });

  textNode.on("transform", function () {
    textNode.setAttrs({
      width: textNode.width() * textNode.scaleX(),
      scaleX: 1,
    });
  });
  iconLayer.add(tr);

  // debug listeners (buộc bạn dễ thấy event nào tới)
  textNode.on('mousedown', (e)=> console.log('TEXT mousedown', e));
  textNode.on('mouseup', (e)=> console.log('TEXT mouseup', e));
  textNode.on('dbltap', (e)=> console.log('TEXT dbltap', e));

  // ---------- shared handler: mở textarea editor ----------
  function openTextEditor(e) {
    // hide Konva nodes
    textNode.hide();
    tr.hide();

    const textPosition = textNode.absolutePosition();
    const stageBox = stage.container().getBoundingClientRect();

    const areaPosition = {
      x: stageBox.left + textPosition.x,
      y: stageBox.top + textPosition.y,
    };

    const textarea = document.createElement("textarea");
    document.body.appendChild(textarea);

    textarea.value = textNode.text();
    textarea.style.position = "absolute";
    textarea.style.top = areaPosition.y + "px";
    textarea.style.left = areaPosition.x + "px";
    textarea.style.width = textNode.width() - (textNode.padding ? textNode.padding() * 2 : 0) + "px";
    textarea.style.height = textNode.height() - (textNode.padding ? textNode.padding() * 2 : 0) + 5 + "px";
    textarea.style.fontSize = textNode.fontSize() + "px";
    textarea.style.border = "none";
    textarea.style.padding = "0px";
    textarea.style.margin = "0px";
    textarea.style.overflow = "hidden";
    textarea.style.background = "none";
    textarea.style.outline = "none";
    textarea.style.resize = "none";
    textarea.style.lineHeight = (textNode.lineHeight ? textNode.lineHeight() : 1).toString();
    textarea.style.fontFamily = textNode.fontFamily();
    textarea.style.transformOrigin = "left top";
    textarea.style.textAlign = textNode.align ? textNode.align() : "left";
    textarea.style.color =  "#000";

    const rotation = textNode.rotation ? textNode.rotation() : 0;
    let transform = "";
    if (rotation) {
      transform += "rotateZ(" + rotation + "deg)";
    }
    transform += "translateY(-" + 2 + "px)";
    textarea.style.transform = transform;

    textarea.style.height = "auto";
    textarea.style.height = textarea.scrollHeight + 3 + "px";

    textarea.focus();

    function removeTextarea() {
      if (textarea.parentNode) textarea.parentNode.removeChild(textarea);
      window.removeEventListener("click", handleOutsideClick);
      window.removeEventListener("touchstart", handleOutsideClick);
      textNode.show();
      tr.show();
      tr.forceUpdate();
    }

    function setTextareaWidth(newWidth = 0) {
      if (!newWidth) {
        newWidth = (textNode.placeholder ? textNode.placeholder.length * textNode.fontSize() : textNode.width());
      }
      textarea.style.width = newWidth + "px";
    }

    textarea.addEventListener("keydown", function (ev) {
      if (ev.key === "Enter" && !ev.shiftKey) {
        textNode.text(textarea.value);
        removeTextarea();
      }
      if (ev.key === "Escape") {
        removeTextarea();
      }
    });

    textarea.addEventListener("input", function () {
      const scale = (textNode.getAbsoluteScale ? textNode.getAbsoluteScale().x : 1);
      setTextareaWidth(textNode.width() * scale);
      textarea.style.height = "auto";
      textarea.style.height = textarea.scrollHeight + textNode.fontSize() + "px";
    });

    function handleOutsideClick(ev) {
      if (ev.target !== textarea) {
        textNode.text(textarea.value);
        removeTextarea();
      }
    }
    // attach outside click listeners (defer to avoid immediate trigger)
    setTimeout(() => {
      window.addEventListener("click", handleOutsideClick);
      window.addEventListener("touchstart", handleOutsideClick);
    }, 0);
  }

  // ---------- synthetic click / dblclick detector ----------
  (function attachMouseClickDbl(node, opts = {}) {
    const dblTimeout = typeof opts.dblTimeout === 'number' ? opts.dblTimeout : 350; // ms
    const moveThreshold = typeof opts.moveThreshold === 'number' ? opts.moveThreshold : 6; // px
    let lastClickTime = 0;
    let downPos = null;
    let mouseDownAt = 0;

    node.on('mousedown', (ev) => {
      const evt = ev && ev.evt ? ev.evt : null;
      mouseDownAt = Date.now();
      if (evt) {
        downPos = { x: evt.clientX, y: evt.clientY };
      } else {
        downPos = null;
      }
    });

    node.on('mouseup', (ev) => {
      const evt = ev && ev.evt ? ev.evt : null;
      const now = Date.now();

      // compute move distance
      let moved = false;
      if (downPos && evt) {
        const dx = Math.abs(evt.clientX - downPos.x);
        const dy = Math.abs(evt.clientY - downPos.y);
        moved = Math.hypot(dx, dy) > moveThreshold;
      }

      downPos = null;

      // if movement indicates drag, skip click
      if (moved) {
        return;
      }

      // synthetic click/dblclick detection
      if (now - lastClickTime <= dblTimeout) {
        // double-click detected
        lastClickTime = 0;
        // fire both Konva dblclick and dbltap events
        try { node.fire('dblclick', ev); } catch (err) {}
        try { node.fire('dbltap', ev); } catch (err) {}
        // also call editor opening logic
        openTextEditor(ev);
      } else {
        // single click candidate
        lastClickTime = now;
        // small timeout to fire 'click' if no second click
        setTimeout(() => {
          if (lastClickTime !== 0) {
            // single click confirmed
            try { node.fire('click', ev); } catch (err) {}
            lastClickTime = 0;
          }
        }, dblTimeout + 5);
      }
    });

    // expose helpers (optional)
    node.onSyntheticClick = function (fn) { node._onSyntheticClick = fn; };
    node.onSyntheticDbl = function (fn) { node._onSyntheticDbl = fn; };
  })(textNode);


   // --- desktop: native dblclick on container -> open editor when target is this textNode ---
  (function addDesktopDblHandler(node) {
    // guard: only once per node
    if (!stage || !stage.container) return;
    const container = stage.container();

    // handler function
    function onContainerDblClick(ev) {
      // ignore if panel/inputs target
      if (!ev || !ev.clientX) return;

      const rect = container.getBoundingClientRect();
      const stagePt = { x: ev.clientX - rect.left, y: ev.clientY - rect.top };
      const hit = stage.getIntersection(stagePt);

      if (!hit) return;

      // if hit is the node itself (or a child inside it), open editor
      if (hit === node || (hit.getParent && hit.getParent() === node)) {
        // prevent other global dblclick handlers (e.g. zoom) from running
        try { ev.stopPropagation(); ev.preventDefault(); } catch (e) {}
        // open the same editor used for dbltap/synthetic dblclick
        openTextEditor({ target: node });
      }
    }

    // attach once
    // Use capture phase to run before other listeners that might stopPropagation
    container.addEventListener('dblclick', onContainerDblClick, true);

    // Optional: store reference to remove later if needed
    node._containerDbl = onContainerDblClick;
  })(textNode);
  
  // ---------- wire native dbltap (touch) to same editor ----------
  textNode.on('dbltap', function (e) {
    // dbltap from Konva touch handling -> open editor
    openTextEditor(e);
  });

  // also keep native dblclick listener (in case it arrives)
  textNode.on('dblclick', function (e) {
    // sometimes native dblclick may be delivered; ensure editor opens
    openTextEditor(e);
  });

  // debug click if needed
  textNode.on('click', (e) => {
    // optional: handle single click selection, etc.
    console.log('TEXT click (synthetic or native)', e);
  });
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

  const bgX = backgroundImage.x();
  const bgY = backgroundImage.y();
  const bgW = backgroundImage.width();
  const bgH = backgroundImage.height();

  textsArray.forEach((t, idx) => {
    try {


      const x = bgX + (Number(t.xNorm) || 0) * bgW ;
      let y = bgY + (Number(t.yNorm) || 0) * bgH;

      if (isMobile()) {
          y = y - 10;
      }      

      const w = (Number(t.widthNorm) || 0) * bgW;
      const fontSize = Number(t.fontSize) || 16;

      const textNode = new Konva.Text({
        x: Math.round(x),
        y: Math.round(y),
        text: typeof t.text === "string" ? t.text : "",
        fontSize: fontSize,
        fontFamily: t.fontFamily || "Arial",
        fill: t.fill || "#000",
        width: Math.max(10, Math.round(w || fontSize * 4)),
        draggable: false,
        rotation: 0, // **force no rotation**
        align: t.align || "left",
        lineHeight: t.lineHeight || 1,
        id: t.id || undefined,
      });

      // restore other attrs safely but remove rotation if present
      if (t.attrs && typeof t.attrs === "object") {
        try {
          const safeAttrs = Object.assign({}, t.attrs);
          // do not restore these core fields
          delete safeAttrs.text;
          delete safeAttrs.x;
          delete safeAttrs.y;
          delete safeAttrs.width;
          delete safeAttrs.height;
          delete safeAttrs.id;
          // ENSURE rotation not restored
          if ('rotation' in safeAttrs) delete safeAttrs.rotation;
          textNode.setAttrs(safeAttrs);
        } catch (err) {
          // ignore restore errors
        }
      }

      // add to layer
      iconLayer.add(textNode);

      // transformer: allow only width adjustment (no rotation control)
   const tr = new Konva.Transformer({
        node: textNode,
        enabledAnchors: ["middle-left", "middle-right", "rotater"], // include rotate handle
        rotateEnabled: true,
        boundBoxFunc: function (oldBox, newBox) {
          newBox.width = Math.max(30, newBox.width);
          // keep rotation 0 during boundBox (we prevent real rotate)
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
          // ensure rotation stays 0 if some transform attempted to rotate
          rotation: 0,
        });
      });
      iconLayer.add(tr);

// prevent actual rotation by intercepting pointer down on rotate anchor
// inside tr.on('mousedown touchstart', function(evt) { ... })
tr.on('mousedown touchstart', function (evt) {
const target = evt.target;
  const isRotater =
    (typeof target.name === 'function' && target.name() === 'rotater') ||
    (typeof target.hasName === 'function' && target.hasName && target.hasName('rotater'));

  if (isRotater) {
    evt.cancelBubble = true;
    evt.evt?.preventDefault?.();
    showColorisPopup(textNode);
  }
});

    // cursor feedback
    tr.on("mouseover", () => {
    stage.container().style.cursor = "pointer";
    });
    tr.on("mouseout", () => {
      stage && stage.container() && (stage.container().style.cursor = "default");
    });


 

      // cursor feedback
      textNode.on("mouseover", () => {
        stage && stage.container() && (stage.container().style.cursor = "pointer");
      });
      textNode.on("mouseout", () => {
        stage && stage.container() && (stage.container().style.cursor = "default");
      });

      // ---------- shared handler: mở textarea editor (no rotation) ----------
      function openTextEditor(e) {
        // hide Konva nodes during edit
        textNode.hide();
        tr.hide();

        // compute client coordinates for the top-left of the text node
        // use stage.getAbsoluteTransform to handle group/scale/translate
        const absPos = textNode.absolutePosition(); // stage coordinates
        const transform = stage.getAbsoluteTransform().copy();
        const clientPoint = transform.point({ x: absPos.x, y: absPos.y }); // container-space
        const rect = stage.container().getBoundingClientRect();
        const areaX = rect.left + clientPoint.x;
        const areaY = rect.top + clientPoint.y;

        const textarea = document.createElement("textarea");
        document.body.appendChild(textarea);

        textarea.value = textNode.text();
        textarea.style.position = "absolute";
        textarea.style.top = areaY + "px";
        textarea.style.left = areaX + "px";

        // set width/height respecting absolute scale so textarea matches visible size
        const absScaleX = textNode.getAbsoluteScale ? textNode.getAbsoluteScale().x : 1;
        const absScaleY = textNode.getAbsoluteScale ? textNode.getAbsoluteScale().y : 1;

        const padding = textNode.padding ? textNode.padding() : 0;
        textarea.style.width = Math.max(20, (textNode.width() - padding * 2) * absScaleX) + "px";
        // estimate height: use lineHeight * fontSize * numberOfLines (auto adjust below)
        textarea.style.height = Math.max(24, (textNode.fontSize() * (textNode.lineHeight || 1)) * absScaleY) + "px";

        // style to visually match Konva text
        textarea.style.fontSize = (textNode.fontSize() * absScaleX) + "px";
        textarea.style.border = "none";
        textarea.style.padding = "0px";
        textarea.style.margin = "0px";
        textarea.style.overflow = "hidden";
        textarea.style.background = "transparent";
        textarea.style.outline = "none";
        textarea.style.resize = "none";
        textarea.style.lineHeight = (textNode.lineHeight ? textNode.lineHeight() : 1).toString();
        textarea.style.fontFamily = textNode.fontFamily();
        textarea.style.textAlign = textNode.align ? textNode.align() : "left";
        textarea.style.color = textNode.fill ? textNode.fill().toString() : "#000";

        // DO NOT rotate the textarea — we explicitly avoid rotation here

        // autosize height
        textarea.style.height = "auto";
        textarea.style.height = textarea.scrollHeight + 3 + "px";

        textarea.focus();

        function removeTextarea() {
          if (textarea.parentNode) textarea.parentNode.removeChild(textarea);
          window.removeEventListener("click", handleOutsideClick);
          window.removeEventListener("touchstart", handleOutsideClick);
          textNode.show();
          tr.show();
          tr.forceUpdate();
          iconLayer.batchDraw();
        }

        function setTextareaWidth(newWidth = 0) {
          if (!newWidth) {
            newWidth = textNode.placeholder ? textNode.placeholder.length * textNode.fontSize() : textNode.width();
          }
          const absScale = textNode.getAbsoluteScale ? textNode.getAbsoluteScale().x : 1;
          textarea.style.width = (newWidth * absScale) + "px";
        }

        textarea.addEventListener("keydown", function (ev) {
          if (ev.key === "Enter" && !ev.shiftKey) {
            textNode.text(textarea.value);
            removeTextarea();
          }
          if (ev.key === "Escape") {
            removeTextarea();
          }
        });

        textarea.addEventListener("input", function () {
          const scale = textNode.getAbsoluteScale ? textNode.getAbsoluteScale().x : 1;
          setTextareaWidth(textNode.width() * scale);
          textarea.style.height = "auto";
          textarea.style.height = textarea.scrollHeight + textNode.fontSize() + "px";
        });

        function handleOutsideClick(ev) {
          if (ev.target !== textarea) {
            textNode.text(textarea.value);
            removeTextarea();
          }
        }
        // attach outside click listeners (defer to avoid immediate trigger)
        setTimeout(() => {
          window.addEventListener("click", handleOutsideClick);
          window.addEventListener("touchstart", handleOutsideClick);
        }, 0);
      }

      // ---------- synthetic click / dblclick detector ----------
      (function attachMouseClickDbl(node, opts = {}) {
        const dblTimeout = typeof opts.dblTimeout === "number" ? opts.dblTimeout : 350;
        const moveThreshold = typeof opts.moveThreshold === "number" ? opts.moveThreshold : 6;
        let lastClickTime = 0;
        let downPos = null;
        let mouseDownAt = 0;

        node.on("mousedown", (ev) => {
          const evt = ev && ev.evt ? ev.evt : null;
          mouseDownAt = Date.now();
          if (evt) {
            downPos = { x: evt.clientX, y: evt.clientY };
          } else {
            downPos = null;
          }
        });

        node.on("mouseup", (ev) => {
          const evt = ev && ev.evt ? ev.evt : null;
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
            try { node.fire("dblclick", ev); } catch (err) {}
            try { node.fire("dbltap", ev); } catch (err) {}
            openTextEditor(ev);
          } else {
            lastClickTime = now;
            setTimeout(() => {
              if (lastClickTime !== 0) {
                try { node.fire("click", ev); } catch (err) {}
                lastClickTime = 0;
              }
            }, dblTimeout + 5);
          }
        });

        node.onSyntheticClick = function (fn) { node._onSyntheticClick = fn; };
        node.onSyntheticDbl = function (fn) { node._onSyntheticDbl = fn; };
      })(textNode);

      // --- desktop: native dblclick on container -> open editor when target is this textNode ---
      (function addDesktopDblHandler(node) {
        if (!stage || !stage.container) return;
        const container = stage.container();

        function onContainerDblClick(ev) {
          if (!ev || !ev.clientX) return;
          const rect = container.getBoundingClientRect();
          const stagePt = { x: ev.clientX - rect.left, y: ev.clientY - rect.top };
          const hit = stage.getIntersection(stagePt);
          if (!hit) return;
          if (hit === node || (hit.getParent && hit.getParent() === node)) {
            try { ev.stopPropagation(); ev.preventDefault(); } catch (e) {}
            openTextEditor({ target: node });
          }
        }

        container.addEventListener('dblclick', onContainerDblClick, true);
        node._containerDbl = onContainerDblClick;
      })(textNode);

      // wire native dbltap/dblclick to same editor (safe)
      textNode.on("dbltap", function (e) { openTextEditor(e); });
      textNode.on("dblclick", function (e) { openTextEditor(e); });

      // debug click
      textNode.on("click", (e) => { /* console.log('TEXT click', e); */ });

    } catch (err) {
      console.warn("loadTextsFromExport: failed to restore text item", idx, err, t);
    }
  });

  // redraw once
  iconLayer.batchDraw();
}
