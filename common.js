function createRadioButtons() {
  const container = document.getElementById("radioContainer");
  let idx = 0;
  let checkedVal = false;
  let data_type = "student37";

  OPTIONS_ARRAY.forEach((option) => {
    if (DEFAULT_DATA_TYPE == option.data_type) {
      data_type = option.data_type;
      checkedVal = true;
    } else {
      checkedVal = false;
    }
    const divElement = document.createElement("div");
    divElement.className = "form-check me-3";

    const inputElement = document.createElement("input");
    inputElement.className = "form-check-input";
    inputElement.type = "radio";
    inputElement.name = "options";
    inputElement.id = option.id + "_1";
    inputElement.value = option.data_type;
    inputElement.checked = checkedVal;

    const labelElement = document.createElement("label");
    labelElement.className = "form-check-label";
    labelElement.htmlFor = option.id + "_1";
    labelElement.textContent = option.label;

    divElement.appendChild(inputElement);
    divElement.appendChild(labelElement);
    container.appendChild(divElement);
    idx = idx + 1;
  });

  setPageInfo(data_type);
}

function splitLineByPageBoundary(line, bgDisplay, pageDisplayWidth) {
  const pts = line.points();
  const segments = {
    page1: [],
    page2: []
  };
  
  if (pts.length < 4) {
    // Line quá ngắn, không thể phân tách - gán toàn bộ vào page chính
    const linePage = getMainPageForLine(pts, bgDisplay, pageDisplayWidth);
    segments[`page${linePage}`].push([...pts]);
    return segments;
  }
  
  let currentPage = null;
  let currentSegment = [];
  const boundaryX = bgDisplay.x + pageDisplayWidth;
  
  for (let i = 0; i < pts.length; i += 2) {
    const x = pts[i];
    const y = pts[i + 1];
    
    // Xác định page cho điểm hiện tại
    const pointPage = x < boundaryX ? 1 : 2;
    
    if (currentPage === null) {
      // Điểm đầu tiên
      currentPage = pointPage;
      currentSegment.push(x, y);
    } else if (currentPage === pointPage) {
      // Vẫn cùng page
      currentSegment.push(x, y);
    } else {
      // CHUYỂN PAGE: Tìm điểm giao cắt và tách segment
      const prevX = pts[i - 2];
      const prevY = pts[i - 1];
      
      // Tính điểm giao cắt tại biên giới
      const t = (boundaryX - prevX) / (x - prevX);
      const intersectionX = boundaryX;
      const intersectionY = prevY + t * (y - prevY);
      
      // Kết thúc segment hiện tại với điểm giao cắt
      currentSegment.push(intersectionX, intersectionY);
      
      // Lưu segment cũ (chỉ khi có ít nhất 2 điểm)
      if (currentSegment.length >= 4) {
        segments[`page${currentPage}`].push([...currentSegment]);
      }
      
      // Bắt đầu segment mới từ điểm giao cắt
      currentPage = pointPage;
      currentSegment = [intersectionX, intersectionY, x, y];
    }
  }
  
  // Lưu segment cuối cùng (chỉ khi có ít nhất 2 điểm)
  if (currentSegment.length >= 4) {
    segments[`page${currentPage}`].push([...currentSegment]);
  }
  
  return segments;
}

// Hàm tính điểm giao cắt tại biên giới page
function calculatePageIntersection(x1, y1, x2, y2, bgDisplay, pageDisplayWidth) {
  const boundaryX = bgDisplay.x + pageDisplayWidth;
  
  // Kiểm tra xem line có cắt biên giới không
  if ((x1 < boundaryX && x2 >= boundaryX) || (x1 >= boundaryX && x2 < boundaryX)) {
    // Tính tỉ lệ từ x1 đến biên giới
    const t = (boundaryX - x1) / (x2 - x1);
    
    // Tính tọa độ giao điểm
    const intersectionX = boundaryX;
    const intersectionY = y1 + t * (y2 - y1);
    
    return {
      x: intersectionX,
      y: intersectionY
    };
  }
  
  return null;
}

function normalizePoints(points, bgDisplay, isPage1, isDualPage, pageDisplayWidth) {
  const norm = [];
  
  for (let i = 0; i < points.length; i += 2) {
    const x = Number(points[i]);
    const y = Number(points[i + 1]);
    
    let nx, ny;
    
    if (isDualPage) {
      // Dual page - normalize theo page width
      const relativeX = x - bgDisplay.x;
      const pageStartX = isPage1 ? 0 : pageDisplayWidth;
      
      // 🔥 Sửa: Tính relative position trong page
      nx = pageDisplayWidth ? (relativeX - pageStartX) / pageDisplayWidth : 0;
      ny = bgDisplay.height ? (y - bgDisplay.y) / bgDisplay.height : 0;
      
      // Debug log
      if (i === 0) {
        console.log('Normalize point:', {
          original: { x, y },
          relativeX,
          pageStartX,
          normalized: { nx, ny },
          pageDisplayWidth,
          bgDisplay
        });
      }
    } else {
      // Single page - normalize theo toàn bộ width
      nx = bgDisplay.width ? (x - bgDisplay.x) / bgDisplay.width : 0;
      ny = bgDisplay.height ? (y - bgDisplay.y) / bgDisplay.height : 0;
    }
    
    norm.push(formatNumber(nx, 8));
    norm.push(formatNumber(ny, 8));
  }
  
  return norm;
}

function debugCoordinateSystem(bgDisplay, isDualPage, pageDisplayWidth, targetPage) {
  console.log('🔍 DEBUG COORDINATE SYSTEM:', {
    bgDisplay,
    isDualPage,
    pageDisplayWidth,
    targetPage,
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight
    },
    stage: stage ? {
      scaleX: stage.scaleX(),
      scaleY: stage.scaleY(),
      x: stage.x(),
      y: stage.y()
    } : null
  });
}


// Hàm xác định page chính cho line (dựa trên đa số điểm)
function getMainPageForLine(points, bgDisplay, pageDisplayWidth) {
  if (!bgDisplay || points.length === 0) return 1;
  
  let page1Count = 0;
  let page2Count = 0;
  
  for (let i = 0; i < points.length; i += 2) {
    const x = points[i];
    const relativeX = x - bgDisplay.x;
    
    if (relativeX < pageDisplayWidth) {
      page1Count++;
    } else {
      page2Count++;
    }
  }
  
  return page1Count >= page2Count ? 1 : 2;
}

// Trong pointerdown event, thêm logic xác định page ban đầu
function getCurrentPageForPoint(x, y) {
  if (!backgroundImage) return 1;
  
  if (!isTwoPage()) {
    // MOBILE MODE: Luôn trả về page 1 (vì chỉ có 1 page)
    return 1;
  } else {
    // DESKTOP MODE: Xác định page dựa trên vị trí X
    const bgX = backgroundImage.x();
    const bgW = backgroundImage.width();
    const pageWidth = bgW / 2;
    const relativeX = x - bgX;
    return relativeX < pageWidth ? 1 : 2;
  }
}

// là đang ở desktop và có config cho hiển thị 2 page, có những book chỉ hiển thị 1 page mà thôi.
function isTwoPage() {
  return isNotMobile() && backgroundMode;
}

// nếu là hiển thị 2 page thì sẽ tính toán để trả về đúng json data.
function getPageIndex(page) {
  if (isTwoPage()) {
    // 🔥 Sửa: UI page -> JSON page mapping
    return (page * 2) - 1; // Chỉ trả về page trái, page phải = page trái + 1
  } else {
    return page;
  }
}

// trường họp có hiển thị 2 page thì /2 folder nằm trong img folder.
function getSubImagePath(page) {
  var imageName = page + ".webp"
  return isTwoPage() ? "2/" + imageName  : imageName;
}

function getLastSegment(soundData) {
    try {
        const soundStr = String(soundData || 'Play Audio');
        const segments = soundStr.split('/');
        return segments[segments.length - 1] || 'Play Audio';
    } catch (error) {
        console.warn('Error processing sound data:', error);
        return 'Play Audio';
    }
}



function getRawLinesArray(jsonPage, imagePage, targetPage, dataType=1) {
  const raw = APP_DATA.get(String(jsonPage));
  if (!raw) {
    console.warn(`No data found for JSON page ${jsonPage} (UI: ${imagePage}, target: ${targetPage})`);
    return ;
  }

  let parsedData;
  try {
    parsedData = JSON.parse(raw);
  } catch (e) {
    console.error(`Error parsing data for page ${jsonPage}:`, e);
    return;
  }

  // const rawLinesArray = Array.isArray(parsedData.lines) ? parsedData.lines : [];
  if (1 == dataType) {
    return Array.isArray(parsedData.lines) ? parsedData.lines : [];
  } else if (2 == dataType) {
    return Array.isArray(parsedData.texts) ? parsedData.texts : [];
  } else if (3 == dataType) {
    return Array.isArray(parsedData.rects) ? parsedData.rects : [];
  }

  return ;
  
}

  // pop dropdown
  function popDropdown(dropdown, text, start, end, default_index) {
    dropdown.empty();
    for (let i = start; i <= end; i++) {
      const option = $("<option>", { value: i, text: text + " " + i });
      if (i === default_index) option.prop("selected", true);
      dropdown.append(option);
    }
  }


  function setPageInfo(dataType) {
    const foundOption = OPTIONS_ARRAY.find((opt) => opt.data_type === dataType);

    DATA_TYPE = dataType;
    CURRENT_PAGE_INDEX = foundOption.current;
    MAX_PAGE_NUM = foundOption.max;
    MIN_PAGE_NUM = foundOption.min;
    FETCH_DRAW_INFO = foundOption.fetch;
    backgroundMode = foundOption.backgroundMode;

    if (foundOption && foundOption.ASSET_URL) {     
      ASSET_URL = foundOption.ASSET_URL;
    } else {      
      ASSET_URL = {
        IMG_URL: "https://tamlapthanh.github.io/store_images/",
        SOUND_URL: "https://tamlapthanh.github.io/store_images/",
        VIDEO_URL: "https://tamlapthanh.github.io/store_images/",
        JSON_URL: "https://tamlapthanh.github.io/store_images/",
      };
    }

    // phải đặt sau cùng để check
    if (isTwoPage()) {
      MAX_PAGE_NUM = parseInt(MAX_PAGE_NUM/2);
    }    

    
    //TODO: for testing only
    if (isDebugMode()) {
      ASSET_URL = {
        IMG_URL: "",
        SOUND_URL: "",
        VIDEO_URL: "",
        JSON_URL: "",
      };    
    }
  }

function showToast(message, type = "success") {
  let toastContainer = document.querySelector(".toast-container");
  if (!toastContainer) {
    toastContainer = document.createElement("div");
    toastContainer.classList.add(
      "toast-container",
      "position-fixed",
      "top-50",
      "start-50",
      "translate-middle"
    );
    document.body.appendChild(toastContainer);
  }

  const toast = document.createElement("div");
  toast.classList.add("toast", "fade"); // Giữ fade
  toast.setAttribute("role", "alert");
  toast.setAttribute("aria-live", "assertive");
  toast.setAttribute("aria-atomic", "true");
  toast.setAttribute("data-bs-autohide", "true");
  toast.setAttribute("data-bs-delay", "1500");

  const toastHeader = document.createElement("div");
  toastHeader.classList.add("toast-header");
  toastHeader.innerHTML = `
        <strong class="me-auto">Thông báo</strong>
        <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
    `;

  const toastBody = document.createElement("div");
  toastBody.classList.add("toast-body");
  toastBody.textContent = message;

  toast.classList.add(`text-bg-${type}`);
  // toast.appendChild(toastHeader);
  toast.appendChild(toastBody);

  // Thêm toast vào container nhưng chưa hiển thị
  toastContainer.appendChild(toast);

  // Đợi một frame rồi hiển thị để tránh chớp
  setTimeout(() => {
    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();
  }, 0);

  toast.addEventListener("hidden.bs.toast", () => {
    toast.remove();
  });
}

function isMobile() {
  const ret = isNotMobile();
  return !ret;
}
function isNotMobile() {
  const width = window.innerWidth;
  const userAgent = navigator.userAgent.toLowerCase();

  if (
    width < 768 ||
    /mobile|android|iphone|ipod|blackberry|iemobile|opera mini/i.test(userAgent)
  ) {
    return false;
  } else {
    return true;
  }
}

function isUnLockStage() {
  if ($("#lock-icon").hasClass("bi-unlock-fill")) {
    console.log("The lock button is in the unlocked state (bi-unlock-fill).");
    return false;
  } else {
    console.log("The lock button is in the locked state (bi-lock-fill).");
    return true;
  }
}

function getIconSize(ICON_SIZE) {
  let icon_size = ICON_SIZE;
  const width = window.innerWidth;
  const userAgent = navigator.userAgent.toLowerCase();

  if (
    width < 768 ||
    /mobile|android|iphone|ipod|blackberry|iemobile|opera mini/i.test(userAgent)
  ) {
    icon_size = 15;
  } else if (
    (width >= 768 && width <= 1024) ||
    /tablet|ipad|playbook|silk/i.test(userAgent)
  ) {
    icon_size = ICON_SIZE;
  } else {
    icon_size = ICON_SIZE;
  }
  return icon_size;
}

function removeLine(arr, element) {
  return arr.filter((item) => item !== element);
}

function showSpinner(id = "spinnerOverlay", color = "#007bff") {
  const overlay = document.getElementById(id);
  if (!overlay) return;

  const icon = overlay.querySelector(".spinner-icon");
  if (icon) icon.style.color = color;

  overlay.style.display = "flex"; // Hiện và căn giữa
}

function hideSpinner(id = "spinnerOverlay") {
  const overlay = document.getElementById(id);
  if (overlay) overlay.style.display = "none";
}


function getExtension(filename) {
  const str = String(filename || '');       // ✅ ép thành chuỗi an toàn
  const match = str.match(/\.([^.]+)$/);    // tìm phần sau dấu chấm cuối
  return match ? match[1].toLowerCase() : '';
}

function getSoundStartEnd(fileName) {
  if (!fileName) return [];
  const arr = fileName.split("/");
  return arr;
}

function getAssetPath(soundFileName) {
  try {
    const parts = getSoundStartEnd(soundFileName);

    const fileName = parts[0];
    // ✅ Xác định xem có phải video không
    const isVideo =
      fileName.endsWith(".mp4") ||
      fileName.endsWith(".mov") ||
      fileName.endsWith(".mkv") ||
      fileName.endsWith(".webm");

    return isVideo ? ICON_VIDEO : ICON_AUDIO;
  } catch (error) {}

  return ICON_AUDIO;
}

function showColorisPopup(textNode, isText = true) {

  var isBorder = textNode.getAttr("isShowBorder");
  var isText   = textNode.getAttr("isShowText");

  // remove old popup if exists
  const old = document.getElementById("coloris-popup");
  if (old) old.remove();

  const wrapper = document.createElement("div");
  wrapper.id = "coloris-popup";
  Object.assign(wrapper.style, {
    position: "fixed",
    left: "50%",
    top: "50%",
    transform: "translate(-50%, -50%)",
    background: "#fff",
    padding: "16px",
    borderRadius: "8px",
    boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "10px",
  });

  const label = document.createElement("label");
  label.textContent = "Select Color:";
  label.style.fontWeight = "600";
  wrapper.appendChild(label);

  const input = document.createElement("input");
  input.type = "text";
  input.className = "coloris instance1";
  input.value = textNode.fill ? textNode.fill().toString() || "#000000" : "#000000";
  input.style.width = "120px";
  input.dataset.target = "app";
  wrapper.appendChild(input);

  // === NEW SECTION: 2 options ===
  const optionsContainer = document.createElement("div");
  optionsContainer.style.display = "flex";
  optionsContainer.style.flexDirection = "column";
  optionsContainer.style.gap = "6px";
  optionsContainer.style.marginTop = "6px";

  // --- Show text ---
  const showTextRow = document.createElement("label");
  showTextRow.style.display = "flex";
  showTextRow.style.alignItems = "center";
  showTextRow.style.gap = "8px";
  const chkShowText = document.createElement("input");
  chkShowText.type = "checkbox";
  chkShowText.checked = isText; //textNode.visible(); // default theo trạng thái hiện tại
  const lblShowText = document.createElement("span");
  lblShowText.textContent = "Show text";
  showTextRow.appendChild(chkShowText);
  showTextRow.appendChild(lblShowText);
  optionsContainer.appendChild(showTextRow);

  chkShowText.addEventListener("change", (e) => {
    const visible = e.target.checked;
    textNode.setAttr("isShowText",  visible);
  });

  // --- Show border ---
  const showBorderRow = document.createElement("label");
  showBorderRow.style.display = "flex";
  showBorderRow.style.alignItems = "center";
  showBorderRow.style.gap = "8px";
  const chkShowBorder = document.createElement("input");
  chkShowBorder.type = "checkbox";
  chkShowBorder.checked = isBorder; 
  const lblShowBorder = document.createElement("span");
  lblShowBorder.textContent = "Show border";
  showBorderRow.appendChild(chkShowBorder);
  showBorderRow.appendChild(lblShowBorder);
  optionsContainer.appendChild(showBorderRow);

  // Border logic
  chkShowBorder.addEventListener("change", (e) => {
    const enable = e.target.checked;
    textNode._hasBorder = enable;
    textNode.setAttr("isShowBorder", enable)    

  });

  wrapper.appendChild(optionsContainer);

  // === Buttons ===
  const row = document.createElement("div");
  Object.assign(row.style, {
    display: "flex",
    gap: "8px",
    marginTop: "10px"
  });
  wrapper.appendChild(row);

  // Delete button
  const deleteBtn = document.createElement("button");
  deleteBtn.innerHTML = `<i class="bi bi-trash3"></i> Delete`;
  Object.assign(deleteBtn.style, {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "6px 12px",
    border: "1px solid #d9534f",
    background: "#d9534f",
    color: "#fff",
    cursor: "pointer",
    borderRadius: "6px",
  });

  deleteBtn.addEventListener(
    "click",
    (ev) => {
      ev.stopPropagation();
      try {
        if (isText) {
          deleteTextNode(textNode);
        } else {
          deleteRectNode(textNode);
        }
        
        // // remove Transformer nodes attached to this textNode
        // const transformers = drawingLayer.find("Transformer");
        // transformers.forEach((tr) => {
        //   try {
        //     if (tr.node && tr.node() === textNode) tr.destroy();
        //   } catch (e) {}
        // });

        // // remove dblclick handler if exists
        // if (textNode._containerDbl && stage && stage.container) {
        //   try {
        //     stage
        //       .container()
        //       .removeEventListener("dblclick", textNode._containerDbl, true);
        //   } catch (e) {}
        // }

        // textNode.destroy();
        // drawingLayer.batchDraw();

      } catch (err) {
        console.warn("Failed to delete textNode", err);
      } finally {
        wrapper.remove();
      }
    },
    { passive: false }
  );
  row.appendChild(deleteBtn);

  // Close button
  const closeBtn = document.createElement("button");
  closeBtn.innerHTML = `<i class="bi bi-x-circle"></i> Close`;
  Object.assign(closeBtn.style, {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "6px 12px",
    border: "1px solid #ddd",
    background: "#f5f5f5",
    cursor: "pointer",
    borderRadius: "6px"
  });
  closeBtn.addEventListener("click", () => wrapper.remove(), { passive: false });
  row.appendChild(closeBtn);

  document.body.appendChild(wrapper);

  // === Initialize Coloris ===
  Coloris({
    el: ".coloris.instance1",
    themeMode: "light",
    swatches: [
      "#000000", "#444444", "#7f8c8d",
      "#c0392b", "#e74c3c", "#ff6b6b",
      "#f39c12", "#f1c40f", "#27ae60",
      "#2ecc71", "#2980b9", "#3498db",
      "#8e44ad", "#9b59b6", "#ffffff",
    ],
    onChange: (color, inputEl) => {
      if (!inputEl) return;
      const target = inputEl.dataset.target;
      if (target === "app") {
        textNode.fill(color);
        iconLayer.batchDraw();
      }
      Coloris.close();
      wrapper.remove();
    },
  });
}

// --- helper wrappers used by CanvasManager ---
  function resetIcons() {
    // app-level reset (keeps same behaviour)
    const imageList = CanvasManager.getState().iconLayer.find("Image");
    imageList.forEach(function (icon) {
      const srcIcon = getAssetPath(icon.getAttr('sound'));
      const newImage = new Image();
      newImage.onload = function () {
        icon.image(newImage);
        CanvasManager.getState().iconLayer.batchDraw();
      };
      newImage.src = srcIcon; // "assets/play_icon.png";
    });
  }

  function changeImageUrl(newUrl, icon) {
    const newImage = new Image();
    newImage.onload = function () {
      icon.image(newImage);
      CanvasManager.getState().iconLayer.batchDraw();
    };
    newImage.src = newUrl;
  }



  function toggleLockIcon(isLock = true) {
    // replicate original toggleLockIcon behavior
    const icon = document.getElementById("lock-btn").querySelector("i");
    if (!isLock) {
      icon.classList.remove("bi-lock-fill");
      icon.classList.add("bi-unlock-fill");
      // unlock -> stage draggable true
      const st = CanvasManager.getState().stage;
      st && st.draggable(true);
      CanvasManager.setDrawingMode(false);
    } else {
      icon.classList.remove("bi-unlock-fill");
      icon.classList.add("bi-lock-fill");
      const st = CanvasManager.getState().stage;
      st && st.draggable(false);
    }
  }

function stopAutoPlay() {
  const $btn = $("#auto-play-btn");
  const $icon = $btn.find("i");

  $btn.removeClass("btn-danger").addClass("btn-success");
  $icon.removeClass("bi-pause-btn").addClass("bi-play-btn");

  if (autoPlayInterval) {
    clearInterval(autoPlayInterval);
    autoPlayInterval = null;
  }

  stopCountdownHTML(); // thêm dòng này
}

function isDebugMode() {
  const hostname = window.location.hostname;
  return hostname === "localhost" || hostname === "127.0.0.1" ? true : false;
}

$(document).on("click", ".group-controls .toggle-btn", function () {
  const $group = $(this).closest(".group-controls");
  $group.find(".btn").not(this).fadeToggle(200);
});

function startCountdownHTML(seconds) {
  // stopCountdownHTML();

  const overlay = document.getElementById("countdown-overlay");
  if (!overlay) return;

  let timeLeft = seconds - 1;
  overlay.classList.add("show");
  overlay.classList.remove("vibrate");
  overlay.textContent = timeLeft;

  const update = () => {
    timeLeft--;
   overlay.classList.add("show");
    if (timeLeft <= 0) {
      overlay.classList.remove("show", "vibrate");
      setTimeout(() => {
        overlay.textContent = "";
      }, 100);
      processNextPrePage(true);
      return;
    }

    overlay.textContent = timeLeft;
    // overlay.style.opacity = Math.max(0.6, timeLeft / 3);

    // THÊM HIỆU ỨNG RUNG + VIBRATE KHI CÒN 1 GIÂY
    if (timeLeft < 2) {
      overlay.classList.add("vibrate");
    } else {
      
      overlay.classList.remove("vibrate");
    }

    countdownTimeout = setTimeout(update, 1000);
  };

  countdownTimeout = setTimeout(update, 1000);
}

function stopCountdownHTML() {
  if (countdownTimeout) {
    clearTimeout(countdownTimeout);
    countdownTimeout = null;
  }
  const overlay = document.getElementById("countdown-overlay");
  if (overlay) {
    overlay.classList.remove("show", "vibrate");
    setTimeout(() => {
      overlay.textContent = "";
    }, 100);
  }
}

function processNextPrePage(isNext = true) {
  window.AudioService && window.AudioService.stopAudio();
  if (isNext) {
    CURRENT_PAGE_INDEX = CURRENT_PAGE_INDEX + 1;
    if (CURRENT_PAGE_INDEX > MAX_PAGE_NUM) CURRENT_PAGE_INDEX = MIN_PAGE_NUM;
  } else {
    CURRENT_PAGE_INDEX = CURRENT_PAGE_INDEX - 1;
    if (CURRENT_PAGE_INDEX < MIN_PAGE_NUM) CURRENT_PAGE_INDEX = MAX_PAGE_NUM;
  }
  $("#json-dropdown").val(CURRENT_PAGE_INDEX).change();
}

// Đầu file app.js (toàn cục)
let tickAudio = null;

// Trong startCountdownHTML hoặc bất kỳ đâu
function playTickSound() {
  if (!tickAudio) {
    tickAudio = new Audio("assets/sound/tick.mp3");
    tickAudio.preload = "auto"; // tải trước
  }

  // Reset về đầu (để play lại)
  tickAudio.currentTime = 0;
  tickAudio.play().catch(() => {});
}

// // preloadImage.js — Utility tải ảnh trước khi hiển thị
// const _imageCache = new Map();

// function preloadImage(url) {
//   return new Promise((resolve, reject) => {
//     if (!url) return reject(new Error("Invalid image url"));

//     // nếu đã cache thì trả ngay object Image đã load
//     if (_imageCache.has(url)) {
//       return resolve(_imageCache.get(url));
//     }

//     const img = new Image();
//     img.onload = () => {
//       _imageCache.set(url, img);
//       resolve(img);
//     };
//     img.onerror = (err) => reject(err);

//     // bắt đầu tải
//     img.src = url;
//   });
// }

function formatNumber(n, decimals = 6) {
  return Number(n.toFixed(decimals));
}
