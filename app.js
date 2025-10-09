// app.js
// Application-level initialization and UI glue.
// Must be loaded after common.js, audioService.js, canvas.js, konva, jquery, bootstrap, etc.

$(document).ready(function () {
  // basic app config mirrored from your original index.js
  const PATH_ROOT = "assets/books/27/";
  let APP_DATA = null;

  let DATA_TYPE = "student37";
  let CURRENT_PAGE_INDEX = 1;
  let MAX_PAGE_NUM = 107;
  let MIN_PAGE_NUM = 1;

  [DATA_TYPE, CURRENT_PAGE_INDEX, MAX_PAGE_NUM, MIN_PAGE_NUM] = createRadioButtons(0); // from common.js


  const RUN_URL_SERVER = "https://zizi-app.onrender.com/";
  const RUN_URL_LOCAL = "http://localhost:8080/";
  const API_METHOD = "api/sheets/line_by_key";
  const API_ALL_METHOD = "api/sheets/line_all";

  const global_const = {
    get PATH_ASSETS_IMG() {
      return PATH_ROOT + DATA_TYPE + "/img/";
    },
    get PATH_IMG() {
      return PATH_ROOT + DATA_TYPE + "/img/";
    },
    get PATH_SOUND() {
      return PATH_ROOT + DATA_TYPE + "/sound/";
    },
    get PATH_JSON() {
      return PATH_ROOT + DATA_TYPE + "/data/X.json";
    },
    get SERVER_API_ALL_METHOD() {
      const hostname = window.location.hostname;
      return hostname === "localhost" || hostname === "127.0.0.1"
        ? RUN_URL_LOCAL + API_ALL_METHOD
        : RUN_URL_SERVER + API_ALL_METHOD;
    },
    get SERVER_URL() {
      const hostname = window.location.hostname;
      return hostname === "localhost" || hostname === "127.0.0.1"
        ? RUN_URL_LOCAL + API_METHOD
        : RUN_URL_SERVER + API_METHOD;
    },
  };

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
    onLoadLines: function (page) {
      // called by CanvasManager after background+icons loaded
      listDrawingPagesDetailed(String(page));
    },
    onPageChangeRequest: function (isNext) {
      // called by CanvasManager swipe -> we handle page index change & load
      processNextPrePage(isNext);
    },
    isNotMobile: isNotMobile,
    iconPathIdle: "assets/play_icon.png",
    iconPathPlaying: "assets/music_icon.svg",
  });

  // --- helper wrappers used by CanvasManager ---
  function resetIcons() {
    // app-level reset (keeps same behaviour)
    const imageList = CanvasManager.getState().iconLayer.find("Image");
    imageList.forEach(function (icon) {
      const newImage = new Image();
      newImage.onload = function () {
        icon.image(newImage);
        CanvasManager.getState().iconLayer.batchDraw();
      };
      newImage.src = "assets/play_icon.png";
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

  function getSoundStartEnd(fileName) {
    if (!fileName) return [];
    const arr = fileName.split("/");
    return arr;
  }

  // ---- non-canvas UI handlers ----

  // Zoom & draw & lock buttons (some are still in CanvasManager but UI toggles here)
  $("#draw").on("click", function () {
    CanvasManager.toggleDrawing();
    $(this).toggleClass("btn-danger btn-dark");
  });

$('input[name="options"]').on("click", function () {
    var selectedValue = $(this).val();
    var currentPageIndex = $(this).data("current-page-index");
    var maxPageNum = $(this).data("max-page-num");
    var minPageNum = $(this).data("min-page-num");
    if (selectedValue === "math_page") {
      window.location.href = "math.html";
    } else if (DATA_TYPE !== selectedValue) {
      DATA_TYPE = selectedValue;
      setPageInfo(DATA_TYPE, currentPageIndex, maxPageNum, minPageNum);
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

  function setPageInfo(dataType, currentPageIndex, maxPageNum, minPageNum) {
    DATA_TYPE = dataType;
    CURRENT_PAGE_INDEX = currentPageIndex;
    MAX_PAGE_NUM = maxPageNum;
    MIN_PAGE_NUM = minPageNum;
  }  

  $("#id_ShowPanel").on("click", function () {
    let isAuto = !$(this).hasClass("btn-success");
    $(this).toggleClass("btn-success", isAuto).toggleClass("btn-dark", !isAuto);
    // toggle audio panel visibility
    if (isAuto)
      window.AudioService.showPanel && window.AudioService.showPanel();
    else window.AudioService.hidePanel && window.AudioService.hidePanel();
    window.AudioService.setAutoShowPanel(isAuto);
  });

  $("#lock").on("click", function () {
    // replicate original toggleLockIcon behavior
    const icon = document.getElementById("lock").querySelector("i");
    if (icon.classList.contains("bi-lock-fill")) {
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
    fetch(global_const.SERVER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dataToSend),
    })
      .then((resp) => resp)
      .then((d) => {
        showToast("Lưu bài làm thành công!");
        APP_DATA = null;
        listDrawingPagesDetailed(page.toString());
      })
      .catch((err) => {
        showToast("Lỗi khi lưu", "danger");
      })
      .finally(() => hideSpinner());
  });

  // load lines list (uses APP_DATA and CanvasManager.loadLinesByDraw)
  function listDrawingPagesDetailed(page = null) {
    if (APP_DATA == null) {
      const dataToSend = { sheet_name: DATA_TYPE };
      fetch(global_const.SERVER_API_ALL_METHOD, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dataToSend),
      })
        .then(async (res) => {
          if (!res.ok) throw new Error("HTTP " + res.status);
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
          const linesArr =
            parsed && Array.isArray(parsed.lines) ? parsed.lines : [];
          CanvasManager.loadLinesByDraw(page, linesArr);
        })
        .catch((err) => console.error("Fetch error", err));
    } else {
      const raw = APP_DATA.get(String(page));
      let parsed = null;
      try {
        parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
      } catch (e) {
        parsed = null;
      }
      const linesArr =
        parsed && Array.isArray(parsed.lines) ? parsed.lines : [];
      CanvasManager.loadLinesByDraw(page, linesArr);
    }
  }

  // other UI helpers (spinner, toast)
  function showSpinner(color = "#007bff") {
    const spinnerIcon = document.querySelector(".spinner-icon");
    if (spinnerIcon) spinnerIcon.style.color = color;
    const overlay = document.getElementById("spinnerOverlay");
    if (overlay) overlay.style.display = "flex";
  }
  function hideSpinner() {
    const overlay = document.getElementById("spinnerOverlay");
    if (overlay) overlay.style.display = "none";
  }

  // expose some functions globally for console/testing if desired
  window.App = {
    global_const,
    loadPage,
    listDrawingPagesDetailed,
    processNextPrePage,
    CanvasManager,
  };

  document.addEventListener("coloris:pick", (event) => {
    CanvasManager.setLineColor(event.detail.color);
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
    iconPathPlaying: "assets/music_icon.svg",
    iconPathIdle: "assets/play_icon.png",
    resetIcons: resetIcons,
    changeImageUrl: changeImageUrl,
    getSoundStartEnd: getSoundStartEnd,
    global_const: global_const,
    autoShowPanel: true,
    onClose: () => {
        console.log("Closed panel!");        
        $("#id_ShowPanel").toggleClass("btn-dark", true).toggleClass("btn-success", false);
        window.AudioService.setAutoShowPanel(false);
    },
  });
});
