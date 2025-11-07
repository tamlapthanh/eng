// Kiểm tra authentication
AuthService.requireAuth();

$(document).ready(async function () {

  await loadOptions();

  // createRadioButtons(); // from common.js

    $('input[name="options"]').on("click", function () {
    var selectedValue = $(this).val();
    var currentPageIndex = $(this).data("current-page-index");
    var maxPageNum = $(this).data("max-page-num");
    var minPageNum = $(this).data("min-page-num");
    var fetchInfo = $(this).data("fetch") ? true : false;
    if (selectedValue === "math_page") {
      window.location.href = "math.html";
    } else if (DATA_TYPE !== selectedValue) {
      DATA_TYPE = selectedValue;
      setPageInfo(
        DATA_TYPE,
        currentPageIndex,
        maxPageNum,
        minPageNum,
        fetchInfo
      );
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

  // // UI inputs references
  // const iconSoundUrlInput = $("#icon-sound-url");
  // const iconXInput = $("#icon-x");
  // const iconYInput = $("#icon-y");

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
    onToggleLock: function (isLock) {
      toggleLockIcon(isLock);
    },
    onLoadLines: function (page) {
      // called by CanvasManager after background+icons loaded
      listDrawingPagesDetailed(String(page), false);
    },
    onPageChangeRequest: function (isNext) {
      // called by CanvasManager swipe -> we handle page index change & load
      processNextPrePage(isNext);
    },
    isNotMobile: isNotMobile,
    iconPathIdle: ICON_AUDIO,
    iconPathPlaying: ICON_PLAYING,
  });

 

  // load page: asks CanvasManager to load JSON
  function loadPage() {
    const page = parseInt($("#json-dropdown").val(), 10);
    CURRENT_PAGE_INDEX = page;
    $("#settingsModal").modal("hide");
    const urlJson = global_const.PATH_JSON.replace("X", page);
    CanvasManager.loadPage(page, urlJson);
  }

  $("#json-dropdown").on("change", function () {
    loadPage();
  });

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
    showSpinner("spinnerOverlay", "#F54927");
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
        // loadPage() //TODO: có nên load lại toàn bộ page hay chi 1 phần
        listDrawingPagesDetailed(page.toString(), true);
      })
      .catch((err) => {
        showToast("Lỗi khi lưu", "danger");
      })
      .finally(() => hideSpinner());
  });

  // load lines list (uses APP_DATA and shapes)
  function listDrawingPagesDetailed(page = null, isClearCache = true) {
    IS_EANBLE_SWIPE = true;
    if (typeof FETCH_DRAW_INFO === "undefined" || FETCH_DRAW_INFO === false) {
      // không cần phải load cho loại data type này vì nó không có draw gì cả.
      console.log(
        " không cần phải load cho loại data type này vì nó không có draw gì cả. "
      );
      return;
    }

    if (APP_DATA == null) {
      showSpinner("spinnerOverlay_async_id", "#FFC0CB");
      const dataToSend = { sheet_name: DATA_TYPE, clear_cache: isClearCache };
      fetch(global_const.SERVER_API_ALL_METHOD, {
        method: "POST",
        // headers: { "Content-Type": "application/json" },
        headers: AuthService.getAuthHeaders(), // ← Thay đổi này
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

          CanvasManager.loadShapes(page, parsed);
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
      CanvasManager.loadShapes(page, parsed);
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
  popDropdown($("#json-dropdown"),"Page",MIN_PAGE_NUM,MAX_PAGE_NUM,CURRENT_PAGE_INDEX);
  loadPage();

});
