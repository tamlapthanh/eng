// Kiểm tra authentication
AuthService.requireAuth();

$(document).ready(function () {
  
  [DATA_TYPE, CURRENT_PAGE_INDEX, MAX_PAGE_NUM, MIN_PAGE_NUM, ASSETS_URL, FETCH_DRAW_INFO] = createRadioButtons(); // from common.js

  // UI inputs references
  const iconSoundUrlInput = $("#icon-sound-url");
  const iconXInput = $("#icon-x");
  const iconYInput = $("#icon-y");
  const previous_page = $("#previous_page");
  const next_page = $("#next_page");

  // --- Initialize CanvasManager ---
  CanvasManager.init({
    containerId: "canvas",
    stageConfig: {
      width: window.innerWidth,
      height: window.innerHeight,
      draggable: false,
    },
    global_const: global_const,
    resetIcons: resetIcons, // functions from this file, used by CanvasManager
    changeImageUrl: changeImageUrl,
    getSoundStartEnd: getSoundStartEnd,
    getIconSize: getIconSize,
    showToast: showToast,
    AudioService: window.AudioService,
    onToggleLock:function (isLock) {
      toggleLockIcon(isLock);
    },
    onLoadLines: function (page) {
      // called by CanvasManager after background+icons loaded
      listDrawingPagesDetailed(String(page));
    },
    onPageChangeRequest: function (isNext) {
      // called by CanvasManager swipe -> we handle page index change & load
      processNextPrePage(isNext);
    },
    isNotMobile: isNotMobile,
    iconPathIdle: ICON_AUDIO,
    iconPathPlaying: ICON_PLAYING,
  });

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

  // ---- non-canvas UI handlers ----

  $("#add-text-btn").on("click", function () {
    CanvasManager.addText();
  });

  $("#add-rect-btn").on("click", function () {
    CanvasManager.addRect();
  });  

  $("#toggle-zoom-btn").on("click", function () {
    toggleButtons("zoom-controls-btn", "toggle-zoom-btn");
  });

  

  // Zoom & draw & lock buttons (some are still in CanvasManager but UI toggles here)
  $("#draw-btn").on("click", function () {
    CanvasManager.toggleDrawing();
    $(this).toggleClass("btn-danger btn-dark");
  });

  $('input[name="options"]').on("click", function () {
    var selectedValue = $(this).val();
    var currentPageIndex = $(this).data("current-page-index");
    var maxPageNum = $(this).data("max-page-num");
    var minPageNum = $(this).data("min-page-num");
    var fetchInfo      = $(this).data("fetch") ? true : false;
    if (selectedValue === "math_page") {
      window.location.href = "math.html";
    } else if (DATA_TYPE !== selectedValue) {
      DATA_TYPE = selectedValue;
      setPageInfo(DATA_TYPE, currentPageIndex, maxPageNum, minPageNum, fetchInfo);
      popDropdown(
        $("#json-dropdown"),
        "Page",
        MIN_PAGE_NUM,
        MAX_PAGE_NUM,
        CURRENT_PAGE_INDEX
      );
      APP_DATA = null;
      loadPage();
      $("#settingsModal").modal("hide");
    }
  });

  function setPageInfo(dataType, currentPageIndex, maxPageNum, minPageNum, fetchInfo) {
    DATA_TYPE = dataType;
    CURRENT_PAGE_INDEX = currentPageIndex;
    MAX_PAGE_NUM = maxPageNum;
    MIN_PAGE_NUM = minPageNum;
    FETCH_DRAW_INFO = fetchInfo;
    ASSETS_URL = getLinkByType(dataType);
  }

  $("#setting").on("click", function () {
    const controls = document.querySelector(".controls");
    if (controls.style.display === "none") {
      controls.style.display = "flex";
    } else {
      controls.style.display = "none";
      toggleDrawIcon(true);
    }
  });

  $("#id_ShowPanel").on("click", function () {
    let isAuto = !$(this).hasClass("btn-success");
    $(this).toggleClass("btn-success", isAuto).toggleClass("btn-dark", !isAuto);
    // toggle audio panel visibility
    if (isAuto)
      window.AudioService.showPanel && window.AudioService.showPanel();
    else window.AudioService.hidePanel && window.AudioService.hidePanel();
    window.AudioService.setAutoShowPanel(isAuto);
  });

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

  let autoPlayInterval = null;
  $("#auto-play-btn").on("click", function () {
    const $icon = $(this).find("i");

    if ($icon.hasClass("bi-play-btn")) {
      // 👉 Chuyển sang chế độ Auto Play
      $(this).removeClass("btn-success").addClass("btn-danger");      
      $icon.removeClass("bi-play-btn").addClass("bi-pause-btn");

      // ⏱ Lần đầu chờ 2 giây rồi gọi
        setTimeout(() => {
          processNextPrePage(true);
        }, 2000);

      // Gọi lại mỗi 5 giây
      autoPlayInterval = setInterval(() => {
        processNextPrePage(true);
      }, AUTO_PLAY_TIME*1000);
    } else {
      // 👉 Dừng Auto Play
      $(this).removeClass("btn-danger").addClass("btn-success");            
      $icon.removeClass("bi-pause-btn").addClass("bi-play-btn");
      clearInterval(autoPlayInterval);
    }
  });

  $("#lock-btn").on("click", function () {
    // replicate original toggleLockIcon behavior
    const icon = document.getElementById("lock-btn").querySelector("i");
    if (icon.classList.contains("bi-lock-fill")) {
      toggleLockIcon(false);
    } else {
      toggleLockIcon(true);
    }
  });

  // zoom buttons -> delegate to CanvasManager (so logic sống ở canvas.js)
  $("#zoom-in")
    .off("click")
    .on("click", function () {
      // optionally zoom around stage center
      CanvasManager.zoomIn();
    });

  $("#zoom-out")
    .off("click")
    .on("click", function () {
      CanvasManager.zoomOut();
    });

  $("#reset-zoom")
    .off("click")
    .on("click", function () {
      CanvasManager.resetZoom();
    });

  // undo button
  $("#undo-btn")
    .off("click")
    .on("click", function () {
      const ok = CanvasManager.undoLastLine();
      if (!ok) {
        // optional feedback
        showToast && showToast("Không có gì để undo", "info");
      }
    });

  $("#delete-line-btn")
    .off("click")
    .on("click", function () {
      const ok = CanvasManager.deleteSelectedLine();
      if (!ok) {
        // optional feedback
        showToast && showToast("Đâu có chọn gì đâu mừ xóa.", "info");
      }
    });

  $("#id_line_stroke_width").on("change", function () {
    CanvasManager.setLineStrokeWidth($(this).val());
  });

  // previous/next buttons
  previous_page.on("click", function () {
    processNextPrePage(false);
  });
  next_page.on("click", function () {
    processNextPrePage(true);
  });

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

  // pop dropdown
  function popDropdown(dropdown, text, start, end, default_index) {
    dropdown.empty();
    for (let i = start; i <= end; i++) {
      const option = $("<option>", { value: i, text: text + " " + i });
      if (i === default_index) option.prop("selected", true);
      dropdown.append(option);
    }
  }

  // load page: asks CanvasManager to load JSON
  function loadPage() {    
    const page = parseInt($("#json-dropdown").val(), 10);
    CURRENT_PAGE_INDEX = page;
    $("#settingsModal").modal("hide");
    const urlJson = global_const.PATH_JSON.replace("X", page);
    CanvasManager.loadPage(page, urlJson);
  }

  $("#json-dropdown").change(loadPage);

  // sendJsonToServer - using CanvasManager.exportDrawnLines()
  $("#send-json").click(function () {
    if (!CanvasManager.getState().backgroundImage) {
      showToast("Không có background, không thể lưu!", "warning");
      return;
    }
    const page = $("#json-dropdown").val();
    const jsonData = CanvasManager.exportDrawnLines();
    const dataToSend = {
      sheet_name: DATA_TYPE,
      page: page,
      json: JSON.stringify(jsonData),
    };
    showSpinner("#F54927");
    fetch(global_const.API_LINE_KEY_METHOD, {
      method: "POST",
      headers: AuthService.getAuthHeaders(), // ← Thay đổi này
      // headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dataToSend),
    })
      .then((resp) => resp)
      .then((d) => {
        showToast("Lưu bài làm thành công!");
        APP_DATA = null;
        listDrawingPagesDetailed(page.toString(), true);
      })
      .catch((err) => {
        showToast("Lỗi khi lưu", "danger");
      })
      .finally(() => hideSpinner());
  });

  // load lines list (uses APP_DATA and CanvasManager.loadLinesByDraw)
  function listDrawingPagesDetailed(page = null, isClearCache = false) {
    IS_EANBLE_SWIPE = true;

    if (typeof FETCH_DRAW_INFO === "undefined" || FETCH_DRAW_INFO === false) {
      // không cần phải load cho loại data type này vì nó không có draw gì cả. 
      console.log(" không cần phải load cho loại data type này vì nó không có draw gì cả. ");
      return ;
    }

    if (APP_DATA == null) {
      showSpinner("#FFC0CB", "spinnerOverlay_async_id");
      const dataToSend = { sheet_name: DATA_TYPE, clear_cache: isClearCache };
      fetch(global_const.SERVER_API_ALL_METHOD, {
        method: "POST",
        // headers: { "Content-Type": "application/json" },
        headers: AuthService.getAuthHeaders(), // ← Thay đổi này
        body: JSON.stringify(dataToSend),
      })
        .then(async (res) => {
          if (res & !res.ok) throw new Error("HTTP " + res.status);
          return res.json();
        })
        .then((data) => {
          APP_DATA = new Map(Object.entries(data || {}));
          const raw = APP_DATA.get(String(page));
          let parsed = null;
          try {
            parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
          } catch (e) {
            parsed = null;
          }
          const linesArr = parsed && Array.isArray(parsed.lines) ? parsed.lines : [];
          CanvasManager.loadLinesByDraw(page, linesArr);

          const textArr = parsed && Array.isArray(parsed.texts) ? parsed.texts : [];
          CanvasManager.loadTextsFromExport(textArr);

        })
        .catch((err) => console.error("Fetch error", err))
        .finally(() => hideSpinner("spinnerOverlay_async_id"));
    } else {
      const raw = APP_DATA.get(String(page));
      let parsed = null;
      try {
        parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
      } catch (e) {
        parsed = null;
      }
      const linesArr = parsed && Array.isArray(parsed.lines) ? parsed.lines : [];
      CanvasManager.loadLinesByDraw(page, linesArr);

      const textArr = parsed && Array.isArray(parsed.texts) ? parsed.texts : [];
      CanvasManager.loadTextsFromExport(textArr);      
    }
  }

  // expose some functions globally for console/testing if desired
  window.App = {
    global_const,
    loadPage,
    listDrawingPagesDetailed,
    processNextPrePage,
    CanvasManager,
  };


  Coloris({
    onChange: (color, inputEl) => {
      if (!inputEl) return;

      // lấy data-target từ input
      const target = inputEl.dataset.target;
    
      if (target === "window") {
        console.log("Đang chọn màu cho:", target, "=>", color);
        CanvasManager.setLineColor(color);
      } 

      // đóng popup Coloris sau khi chọn
      Coloris.close();

    },
  });


  // init UI: populate dropdowns and load initial page
  popDropdown(
    $("#json-dropdown"),
    "Page",
    MIN_PAGE_NUM,
    MAX_PAGE_NUM,
    CURRENT_PAGE_INDEX
  );
  loadPage();

  // init AudioService
  AudioService.init({
    iconPathPlaying: ICON_PLAYING, // "assets/music_icon.svg"
    iconPathIdle: ICON_AUDIO, // "assets/play_icon.png"
    resetIcons: resetIcons,
    changeImageUrl: changeImageUrl,
    getSoundStartEnd: getSoundStartEnd,
    global_const: global_const,
    autoShowPanel: true,
  //   onClose: () => {
  //     console.log("Closed panel!");
  //     // $("#id_ShowPanel")
  //     //   .toggleClass("btn-dark", true)
  //     //   .toggleClass("btn-success", false);
  //     // window.AudioService.setAutoShowPanel(false);
  //   }
  });
  
    $('#logout').on('click', function() {
      if (confirm('Are you sure you want to logout?')) {
        AuthService.logout();
      }
    });

});
