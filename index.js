let line_color = " #ff6347"; // Tomato
const selected_color = 'black';

$(document).ready(function () {

  const stage = new Konva.Stage({
    container: 'canvas',
    width: window.innerWidth,
    height: window.innerHeight,
    draggable: true,
  });

  let PATH_ROOT = "assets/books/27/";
  let DATA_TYPE = "student37";
  let CURRENT_PAGE_INDEX = 5;
  let MAX_PAGE_NUM = 107;
  let MIN_PAGE_NUM = 1;

  // Create a new Map
  let ICON_SIZE = 18;
  let APP_DATA = null;
  const RUN_URL_SERVER = "https://zizi-app.onrender.com/";
  const RUN_URL_LOCAL = "http://localhost:8080/";
  // const API_METHOD = "api/sheets/lines"

  const API_METHOD = "api/sheets/line_by_key"
  const API_ALL_METHOD = "api/sheets/line_all"

  const global_const = {
    get PATH_ASSETS_IMG() {
      //   PATH_ASSETS_IMG = "assets/img/";
      return PATH_ROOT + DATA_TYPE + "/img/";
    },
    get PATH_IMG() {
      //  PATH_IMG = "assets/img/X.webp";
      return PATH_ROOT + DATA_TYPE + "/img/";
    },
    get PATH_SOUND() {
      //  PATH_SOUND = "assets/sound/student/";
      return PATH_ROOT + DATA_TYPE + "/sound/";
    },
    get PATH_JSON() {
      //  PATH_JSON = "assets/data/X.json";
      return PATH_ROOT + DATA_TYPE + "/data/X.json";
    },
    get SERVER_API_ALL_METHOD() {
      const hostname = window.location.hostname;
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return RUN_URL_LOCAL + API_ALL_METHOD;
      } else {
        return RUN_URL_SERVER + API_ALL_METHOD;
      }
    },
    get SERVER_URL() {
      const hostname = window.location.hostname;
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return RUN_URL_LOCAL + API_METHOD;
      } else {
        return RUN_URL_SERVER + API_METHOD;
      }
    }

  };

  const backgroundLayer = new Konva.Layer();
  const iconLayer = new Konva.Layer();
  const drawingLayer = new Konva.Layer(); // Layer để vẽ
  stage.add(backgroundLayer);
  stage.add(iconLayer);
  stage.add(drawingLayer);

  // start zoom
  let zoomLevel = 1;
  const zoomStep = 0.2;
  const minZoom = 0.5;
  const maxZoom = 10;

  let isPinching = false;

  function setZoom(scale) {

    if ($('#lock-icon').hasClass('bi-unlock-fill')) {
      stage.scale({ x: scale, y: scale });
      stage.batchDraw();
    }
  }

  // xu ly ve tren canva
  // Biến để lưu trạng thái có đang ở chế độ vẽ hay không
  let isDrawingMode = false;
  // Biến để lưu trạng thái vẽ đang diễn ra
  let isDrawing = false;
  let lastLine;
  let lines = []; // Mảng lưu các đường vẽ
  let selectedLine = null;


  // Hàm chuyển đổi tọa độ từ canvas sang tọa độ của stage (đã được zoom)
  function getRelativePointerPosition() {
    const transform = stage.getAbsoluteTransform().copy();
    transform.invert();  // Đảo ngược transform để lấy tọa độ chính xác
    const pos = stage.getPointerPosition();
    return transform.point(pos); // Trả về tọa độ đã điều chỉnh
  }

  // Xử lý bắt đầu vẽ
  stage.on('mousedown touchstart', function (e) {
    if (isDrawingMode == false) {

      console.log("Chỉ cho phép vẽ khi ở chế độ vẽ"); 
      return;  // Chỉ cho phép vẽ khi ở chế độ vẽ
    }

    // cho phep ve nhưng khong cho drag able khi dang lock
    isDrawing = true;  // Bắt đầu vẽ
    stage.draggable(false);  

    const pos = getRelativePointerPosition();  // Lấy tọa độ đã điều chỉnh

    lastLine = new Konva.Line({
      stroke: line_color,
      strokeWidth: 3,
      globalCompositeOperation: 'source-over',
      points: [pos.x, pos.y],  // Sử dụng tọa độ đã điều chỉnh
      lineCap: 'round',
      lineJoin: 'round',
      saved_stroke: line_color
    });

    drawingLayer.add(lastLine);
    lines.push(lastLine); // Lưu đường vẽ vào mảng
  });

  // Xử lý khi di chuyển chuột (hoặc touch) trong khi vẽ
  stage.on('mousemove touchmove', function (e) {
    if (!isDrawing) return;  // Chỉ vẽ nếu đang trong quá trình vẽ

    const pos = getRelativePointerPosition();  // Lấy tọa độ đã điều chỉnh

    let newPoints = lastLine.points().concat([pos.x, pos.y]);
    lastLine.points(newPoints);
    drawingLayer.batchDraw();
    lineAddEvents();
  });

  // Xử lý khi kết thúc vẽ
  stage.on('mouseup touchend', function (e) {
    if (isDrawing) {
      isDrawing = false;  // Dừng vẽ
      lastLine = null;    // Xóa đường vẽ cuối cùng
      stage.draggable(true);  
    }
  });
  // end of xu ly ve tren canva
  $('#delete-line-btn').on('click', function () {
    deleteSelectedLine();
    $('#delete-line-btn').prop('disabled', true);
  });

  $('#undo-btn').on('click', function () {
    if (lines.length > 0) {
      const lastLine = lines.pop(); // Lấy đường vẽ cuối cùng
      lastLine.destroy(); // Xóa đường vẽ khỏi canvas
      drawingLayer.batchDraw(); // Cập nhật canvas
    }
  });

  $('#setting').on('click', function () {
    const controls = document.querySelector('.controls');
    if (controls.style.display === 'none' || controls.style.display === '') {
      controls.style.display = 'flex';
    } else {
      controls.style.display = 'none';
      toggleDrawIcon(true);
    }

  });

  $('#zoom').on('click', function () {
    const controls = document.querySelector('.zoom-controls');
    if ((controls.style.display === 'none' || controls.style.display === '')) {
      controls.style.display = 'flex';
    } else {
      controls.style.display = 'none';
    }
  });

  // Zoom In button
  $('#zoom-in').on('click', function () {
    if (zoomLevel < maxZoom) {
      zoomLevel += zoomStep;
      setZoom(zoomLevel);
    }
  });

  // Zoom Out button
  $('#reset-zoom').on('click', function () {
    stage.scale({ x: 1, y: 1 });
    stage.position({ x: 0, y: 0 }); // Optionally reset position to top-left corner
    stage.batchDraw(); // Re-draw the stage to apply changes
  });

  // Zoom Out button
  $('#zoom-out').on('click', function () {
    if (zoomLevel > minZoom) {
      zoomLevel -= zoomStep;
      setZoom(zoomLevel);
    }
  });

  $('#draw').on('click', function () {
    toggleDrawIcon();
  });

  function toggleDrawIcon(isDraw = false) {
    const drawControls = document.querySelector('.draw-controls');
    if (isDraw) {
      isDrawingMode = false;
      stage.container().style.cursor = 'default';
      drawControls.style.display = 'none';
    } else {
      if ((drawControls.style.display === 'none' || drawControls.style.display === '')) {
        drawControls.style.display = 'flex';
        stage.container().style.cursor = 'crosshair';
        isDrawingMode = true;
        toggleLockIcon(true); // khong cho move trong khi ve
      } else {
        isDrawingMode = false;
        stage.container().style.cursor = 'default';
        drawControls.style.display = 'none';
      }
    }
  }

  $('#lock').on('click', function () {

    toggleLockIcon();
  });

  function toggleLockIcon(isLock = false) {
    // Lấy phần tử button
    const button = document.getElementById("lock");

    // Tìm phần tử con bên trong (ở đây là phần tử <i>)
    const icon = button.querySelector("i");

    if (isLock) {
      icon.classList.remove("bi-unlock-fill");
      icon.classList.add("bi-lock-fill");

      // Đổi lại background của nút về màu ban đầu khi ở trạng thái "lock"
      // interact('#canvas').draggable(false);
      stage.draggable(false);  
    } else {
      // Kiểm tra và thay đổi class của phần tử <i>
      if (icon.classList.contains("bi-lock-fill")) {
        icon.classList.remove("bi-lock-fill");
        icon.classList.add("bi-unlock-fill");

        // Đổi background của nút sang màu khác khi ở trạng thái "unlock"
        // interact('#canvas').draggable(true);
        stage.draggable(true);  
        toggleDrawIcon(true); // Không cho vẽ
      } else {
        icon.classList.remove("bi-unlock-fill");
        icon.classList.add("bi-lock-fill");

        // Đổi lại background của nút về màu ban đầu khi ở trạng thái "lock"
        // interact('#canvas').draggable(false);
        stage.draggable(false);  
      }
    }


    // Toggle draggable
    if (stage.draggable()) {
      stage.draggable(false);
      console.log('Stage is now NOT draggable');
    } else {
      stage.draggable(true);
      console.log('Stage is now draggable');
    }

  }

  // Pinch-to-zoom with gestures
  interact('#canvas').gesturable({
    onstart: function () {
      isPinching = true;
      stage.draggable(false);  // Disable dragging during pinch-to-zoom
    },
    onmove: function (event) {
      const { da } = event;
      const scale = stage.scaleX() * (1 + da / 100);
      if (scale >= minZoom && scale <= maxZoom) {
        stage.scale({ x: scale, y: scale });
        stage.batchDraw();
      }
    },
    onend: function () {
      isPinching = false;
      stage.draggable(true);  // Re-enable dragging after pinch-to-zoom
    }
  });

  let lastTouchTime = 0; // To store the time of the last touch
  stage.on('touchstart', (e) => {
    const now = Date.now();
    const touchInterval = now - lastTouchTime;

    if (touchInterval < 300) { // 300ms is the threshold for double-tap detection
      // Handle double-tap event here
      //console.log('Double-tap detected!');
      if (zoomLevel < maxZoom) {
        zoomLevel += zoomStep;
        setZoom(zoomLevel);
      }
    }

    lastTouchTime = now;
  });



  // Mouse double-click event
  stage.on('dblclick', (e) => {

      console.log('Double-click detected! 111');
      if (zoomLevel < maxZoom) {
        zoomLevel += zoomStep;
        setZoom(zoomLevel);
      }
  });



  stage.on('wheel', function (event) {

    if ($('#lock-icon').hasClass('bi-unlock-fill')) {
        event.evt.preventDefault();

        const oldScale = stage.scaleX();
        const scaleBy = 1.1;
        let newScale = event.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy;

        newScale = Math.max(minZoom, Math.min(maxZoom, newScale));
        zoomLevel = newScale;

        // Chỉ scale mà không di chuyển
        stage.scale({ x: newScale, y: newScale });
        stage.batchDraw();
    }
  });

  interact('#canvas').draggable(false);

  // end zoom

  const iconSoundUrlInput = $('#icon-sound-url');
  const iconXInput = $('#icon-x');
  const iconYInput = $('#icon-y');
  const previous_page = $('#previous_page');
  const next_page = $('#next_page');

  let backgroundImage = null;
  let playIcons = [];
  let currentIcon = null;
  let audio = null;
  let iconPath_1 = "assets/icons/icons8-play_1.gif";
  let iconPath_2 = "assets/icons/icons8-play_2.gif";

  function resetIcons() {
    const imageList = iconLayer.find('Image');
    imageList.forEach(function (icon) {

      //  if (currentIcon.getAttr('sound')  != icon.getAttr('sound') ) {
      if (currentIcon != icon) {
        // Tạo một đối tượng hình ảnh HTML mới
        const newImage = new Image();

        // Đặt callback onload để cập nhật node hình ảnh KonvaJS
        newImage.onload = function () {
          // Cập nhật thuộc tính hình ảnh của node hình ảnh KonvaJS
          icon.image(newImage);

          // Vẽ lại canvas để áp dụng thay đổi
          iconLayer.batchDraw();
        };

        // Đặt nguồn của hình ảnh mới
        newImage.src = iconPath_1;
      }

    });

  }



  function getSoundStartEnd(fileName) {
    var arr = fileName.split("/");
    if (arr.length > 1) {
      return [arr[0], arr[1], arr[2]];
    }

    return arr;
  }
  function playSound(soundFileName, icon) {
    resetIcons();

    if (soundFileName && "x" != soundFileName.trim()) {
      const [fileName, start, end] = getSoundStartEnd(soundFileName);
      console.log(fileName, start, end);
      // let url = global_const.PATH_SOUND + fileName.trim() + ".mp3";
      let url = global_const.PATH_SOUND + fileName.trim() + (fileName.trim().endsWith('.mp3') ? '' : '.mp3');

      // Kiểm tra và dừng âm thanh nếu đang phát
      if (audio && !audio.paused) {
        audio.pause();        // Tạm dừng âm thanh hiện tại
        audio.currentTime = 0; // Đặt lại thời gian phát về đầu
      }

      // Tạo đối tượng âm thanh mới
      audio = new Audio(url);

      if (start) {
        audio.currentTime = start;

        // Theo dõi thời gian và dừng âm thanh khi đạt đến thời gian kết thúc
        audio.addEventListener('timeupdate', () => {
          if (audio.currentTime >= end) {
            console.log("addEventListener timeupdate");
            if (!audio.paused) {
              audio.pause();
              audio.currentTime = 0;
            }
            changeImageUrl(iconPath_1, icon);
          }
        });
      } else {
        audio.addEventListener("ended", (event) => {
          console.log("addEventListener ended");
          changeImageUrl(iconPath_1, icon);
        });
      }


      // Phát âm thanh nếu không có lỗi
      changeImageUrl(iconPath_2, icon);
      audio.play().then(() => {
        console.log("Playing");
      }).catch(error => {
        console.error('Playback failed:', error);
      });

    }
  }


  // Hàm để thay đổi hình ảnh
  function changeImageUrl(newUrl, icon) {
    // Tạo một đối tượng hình ảnh HTML mới
    const newImage = new Image();

    // Đặt callback onload để cập nhật node hình ảnh KonvaJS
    newImage.onload = function () {

      // Cập nhật thuộc tính hình ảnh của node hình ảnh KonvaJS
      icon.image(newImage);

      // Vẽ lại canvas để áp dụng thay đổi
      iconLayer.batchDraw();
    };

    // Đặt nguồn của hình ảnh mới
    newImage.src = newUrl;
  }

  function addPlayIcon(x, y, sound) {

    // don't show sound icon that are x
    if (sound && "x" == sound.trim()) {
      return;
    }

    icon_size = getIconSize(ICON_SIZE);
    Konva.Image.fromURL(iconPath_1, function (icon) {
      icon.setAttrs({
        x: x || Math.random() * (stage.width() - 50),
        y: y || Math.random() * (stage.height() - 50),
        width: icon_size,
        height: icon_size,
      });

      // icon.setAttr('sound', sound.trim() || '');
      icon.setAttr('sound', (sound || '').trim());
      //icon.setAttr('sound', sound?.trim() ?? '');

      function handleInteraction() {
        currentIcon = icon;
        iconSoundUrlInput.val(icon.getAttr('sound') || '');
        iconXInput.val(icon.x());
        iconYInput.val(icon.y());
        if (icon.getAttr('sound')) {

          playSound(icon.getAttr('sound'), currentIcon);
        } else {
          showToast('Not found the sound id!');
        }
      }

      icon.on('click', handleInteraction);
      icon.on('touchend', handleInteraction);

      playIcons.push(icon);

      // Change cursor on hover
      icon.on('mouseover', function () {
        stage.container().style.cursor = 'pointer';
      });
      icon.on('mouseout', function () {
        const drawControls = document.querySelector('.draw-controls');
        if ((drawControls.style.display === 'none' || drawControls.style.display === '')) {
          stage.container().style.cursor = 'default';
        } else {
          stage.container().style.cursor = 'crosshair';
        }
      });

      iconLayer.add(icon);
      icon.moveToTop();
      //iconLayer.batchDraw();
    });
  }

  $('.add-icon').on('click', function () {
    addPlayIcon();
  });

  

  function loadLinesByDraw(page) {
    if (page != null) {
      const data_line = getLinesByKey(page);
      if (data_line != null) {
        $('#delete-line-btn').prop('disabled', true);
        // Xóa các line hiện có
        lines.forEach(line => line.destroy());
        lines = [];

        if (data_line) {
          data_line.forEach(savedLine => {
            const points = savedLine.points.map((point, index) =>
              index % 2 === 0
                ? (point * backgroundImage.width()) + backgroundImage.x()  // Adjusted for X
                : (point * backgroundImage.height()) + backgroundImage.y() // Adjusted for Y
            );

            // Tạo đối tượng Line từ Konva
            const line = new Konva.Line({
              points: points,
              stroke: savedLine.stroke,
              strokeWidth: savedLine.strokeWidth,
              lineCap: savedLine.lineCap,
              lineJoin: savedLine.lineJoin,
              saved_stroke: savedLine.stroke
            });

            // Thêm line vào layer
            drawingLayer.add(line);
            lines.push(line);
          }); // end of forEach
        }
        drawingLayer.batchDraw();
        lineAddEvents();
      }
    }
  }



  function lineAddEvents() {
    drawingLayer.getChildren().forEach((line) => {
      if (line.className === 'Line') {
        // Add a click event to select the line
        line.on('click', (e) => {
          e.cancelBubble = true; // Prevent other events from firing
          resetAllLineColors(); // Reset colors of all lines
          selectedLine = line; // Set the selected line
          $('#delete-line-btn').prop('disabled', false);
          line.stroke('black'); // Highlight the selected line
          drawingLayer.draw();
        });


        // Đảm bảo con trỏ chuột thay đổi thành pointer khi hover qua line
        line.on('mouseover', function () {
          stage.container().style.cursor = 'pointer';
        });

        line.on('mouseout', function () {
          if (isDrawingMode) {
            stage.container().style.cursor = 'crosshair';
          } else {
            stage.container().style.cursor = 'default';
          }
        });
      }
    });
  }

  // Function to reset all line colors to default
  function resetAllLineColors() {
    drawingLayer.getChildren().forEach((shape) => {
      if (shape.className === 'Line') {
        const saved_stroke = shape.getAttr('saved_stroke');
        shape.stroke(saved_stroke); // Reset color to black or your default color
      }
    });
  }



  // Event listener for the 'Delete' key to delete selected line
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Delete' || e.key === 'Backspace') {
      deleteSelectedLine();
    }
  });

  // show page
  function loadPage() {

    // interact('#canvas').draggable(false);
    stage.draggable(false);
    clearCanvas();
    $('#settingsModal').modal('hide');
    CURRENT_PAGE_INDEX = parseInt($('#json-dropdown').val(), 10);

    // Load background, icon from json data file
    loadAssetJson(CURRENT_PAGE_INDEX);
    fitStageIntoParentContainer();
  }


  $('#json-dropdown').change(function () {
    loadPage();
  });

  // Chi can load line, con lai thi trong json het roi
  function loadAssetJson(page) {
    const urlJson = global_const.PATH_JSON.replace("X", page);
    fetch(urlJson)
      .then(response => response.json())
      .then(data => {
        backgroundLayer.clear();
        iconLayer.clear();
        loadJsonBackgroundAndIcons(page, data);
      })
      .catch(error => console.error('Error loading JSON:', error));
  }

  function loadJsonBackgroundAndIcons(page, data) {
    if (data.background) {
      const imageObj = new Image();
      imageObj.onload = function () {
        if (backgroundImage) backgroundImage.destroy();

        adjustBackgroundImage(imageObj);

        // Xóa các icon hiện có
        playIcons.forEach(icon => icon.destroy());
        playIcons = [];

        // Tính toán vị trí mới của các icon dựa trên kích thước hình nền mới
        data.icons.forEach(iconData => {
          const iconX = iconData.x * backgroundImage.width() + backgroundImage.x();
          const iconY = iconData.y * backgroundImage.height() + backgroundImage.y();
          addPlayIcon(iconX, iconY, iconData.sound);
        });

        // load lines, luc nay chi can lay tu APP_DATA ra thoi
        listDrawingPagesDetailed(page.toString());
      };
      imageObj.src = global_const.PATH_ASSETS_IMG + data.background;
    }
  }


  function adjustBackgroundImage(imageObj) {
    const imageWidth = imageObj.width;
    const imageHeight = imageObj.height;

    const stageWidth = stage.width();
    const stageHeight = stage.height();

    let aspectRatio = imageWidth / imageHeight;
    let newWidth, newHeight;

    if (stageWidth / stageHeight > aspectRatio) {
      newWidth = stageHeight * aspectRatio;
      newHeight = stageHeight;
    } else {
      newWidth = stageWidth;
      newHeight = stageWidth / aspectRatio;
    }

    let x = 0;
    let y = 0;
    if (isNotMobile()) {
      x = (stageWidth - newWidth) / 2;
      y = (stageHeight - newHeight) / 2;
    }
    backgroundImage = new Konva.Image({
      x: x,
      y: y,
      image: imageObj,
      width: newWidth,
      height: newHeight,
      id: 'backgroundImage' // Đặt ID cho hình ảnh
    });

    backgroundLayer.add(backgroundImage);
    backgroundLayer.batchDraw();
    stage.find('Image').forEach((image) => {
      image.moveToBottom();
    });
    stage.on('resize', function () {
      fitStageIntoParentContainer();
    });
    fitStageIntoParentContainer();
  }

  function fitStageIntoParentContainer() {
    stage.width(window.innerWidth);
    stage.height(window.innerHeight);
    stage.batchDraw();
  }


  window.addEventListener('resize', resizeEvent);

  function resizeEvent() {
    //fitStageIntoParentContainer();
    loadPage();
    // window.location.reload();
  }

  // Hàm để xóa tất cả các play icon và làm lại từ đầu, bao gồm cả hình nền
  function clearCanvas() {
    if (audio) {
      audio.pause();
    }

    // Xóa tất cả các play icons
    playIcons.forEach(function (icon) {
      icon.destroy();  // Xóa biểu tượng khỏi layer
    });
    playIcons = [];  // Xóa danh sách biểu tượng
    iconLayer.batchDraw();  // Vẽ lại layer để cập nhật sự thay đổi

    // Xóa hình nền
    backgroundLayer.destroyChildren();  // Xóa tất cả các thành phần trên backgroundLayer
    backgroundLayer.draw();  // Vẽ lại để cập nhật sự thay đổi

    drawingLayer.destroyChildren();
    drawingLayer.draw();

    // Thiết lập lại kích thước canvas nếu cần
    fitStageIntoParentContainer();  // Đảm bảo canvas phù hợp với kích thước mới

  }

  // Thêm sự kiện cho nút Clear
  function addClickAndTouchEvents(element, handler) {
    element.on('click', handler);
    element.on('touchend', handler);
  }



  function popDropdown(dropdown, text, start, end, default_index) {
    dropdown.empty();
    // Add options dynamically
    for (var i = start; i <= end; i++) {
      var option = $('<option>', {
        value: i,
        text: text + " " + i
      });

      // Set the default selected option
      if (i === default_index) {
        option.prop('selected', true);
      }

      dropdown.append(option);
    }

  }

  previous_page.on('click', function () {
    processNextPrePage(false);
  });

  next_page.on('click', function () {
    processNextPrePage(true);
  });

  function processNextPrePage(isNext = true) {
    if (isNext) {
      CURRENT_PAGE_INDEX = CURRENT_PAGE_INDEX + 1;
      if (CURRENT_PAGE_INDEX > MAX_PAGE_NUM) {
        CURRENT_PAGE_INDEX = MIN_PAGE_NUM;
      }
    } else {
      CURRENT_PAGE_INDEX = CURRENT_PAGE_INDEX - 1;
      if (CURRENT_PAGE_INDEX < MIN_PAGE_NUM) {
        CURRENT_PAGE_INDEX = MAX_PAGE_NUM;
      }
    }
    $('#json-dropdown').val(CURRENT_PAGE_INDEX).change();
  }

  $('#jump-to-index-jso').on('change', function () {
    var inputValue = $(this).val();
    $('#json-dropdown').val(inputValue).change();
  });

  $('#clearButton').on('click', function () {
    clearCanvas();
  });

  function showSpinner(color = '#007bff') { // Default color if none is provided
    const spinnerIcon = document.querySelector('.spinner-icon');
    spinnerIcon.style.color = color;
    document.getElementById('spinnerOverlay').style.display = 'flex';
  }

  function hideSpinner() {
    document.getElementById('spinnerOverlay').style.display = 'none';
  }


  // Event listener for radio button click/change
  $('input[name="options"]').on('click', function () {
    var selectedValue = $(this).val();
    if (selectedValue === 'math_page') {
      window.location.href = 'math.html'; // Redirect to newpage.html
    } else if (DATA_TYPE !== selectedValue) {
      DATA_TYPE = selectedValue;
      setPageInfo(DATA_TYPE);
      popDropdown($('#json-dropdown'), "Page", MIN_PAGE_NUM, MAX_PAGE_NUM, CURRENT_PAGE_INDEX);
      loadPage();
      $('#settingsModal').modal('hide');
    }
  });

  function setPageInfo(dataType) {
    DATA_TYPE = dataType;
    if ("student" == dataType) {
      CURRENT_PAGE_INDEX = 4;
      MAX_PAGE_NUM = 66;
      MIN_PAGE_NUM = 1;
    }else if ("work" == dataType) {
      CURRENT_PAGE_INDEX = 1;
      MAX_PAGE_NUM = 65;
      MIN_PAGE_NUM = 1;
    } else if ("dict" == dataType) {
      CURRENT_PAGE_INDEX = 2;
      MAX_PAGE_NUM = 87;
      MIN_PAGE_NUM = 1;
    } else if ("student37" == dataType) {
      CURRENT_PAGE_INDEX = 5;
      MAX_PAGE_NUM = 107;
      MIN_PAGE_NUM = 1;
    }
    else if ("work37" == dataType) {
      CURRENT_PAGE_INDEX = 1;
      MAX_PAGE_NUM = 97;
      MIN_PAGE_NUM = 1;
    }
  }

  // Function to play sounds in sequence
  let playAllIndex = 0;
  function playAllSounds(icons) {
    let iconCount = icons.length;

    // Function to play a sound
    function playNextSound() {

      if (playAllIndex >= iconCount) {
        return; // All sounds played
      }

      let icon = icons[playAllIndex]; // Get the current icon
      let soundFileName = icon.getAttr('sound'); // Get the sound associated with the icon
      if (soundFileName && soundFileName.trim() !== 'x') {

        const [fileName, start, end] = getSoundStartEnd(soundFileName);
        console.log(fileName, start, end);

        // let url = global_const.PATH_SOUND + fileName.trim() + ".mp3";
        let url = global_const.PATH_SOUND + fileName.trim() + (fileName.trim().endsWith('.mp3') ? '' : '.mp3');

        // Kiểm tra và dừng âm thanh nếu đang phát
        if (audio && !audio.paused) {
          audio.pause();        // Tạm dừng âm thanh hiện tại
          audio.currentTime = 0; // Đặt lại thời gian phát về đầu
        }

        audio = new Audio(url);
        changeImageUrl(iconPath_2, icon); // Change the icon to indicate it's playing
        if (start) {
          audio.currentTime = start;
          // Theo dõi thời gian và dừng âm thanh khi đạt đến thời gian kết thúc
          audio.addEventListener('timeupdate', () => {
            if (audio.currentTime >= end) {
              console.log("addEventListener timeupdate");
              if (!audio.paused) {
                audio.pause();
                audio.currentTime = 0;
              }
              changeImageUrl(iconPath_1, icon);
              playAllIndex++; // Move to the next icon
              playNextSound(); // Recursively play the next sound
            }
          });

        } else {
          // Listen for when the sound finishes playing
          audio.addEventListener('ended', function () {
            console.log("addEventListener ended");
            changeImageUrl(iconPath_1, icon); // Reset the icon after playing
            playAllIndex++; // Move to the next icon
            playNextSound(); // Recursively play the next sound
          });
        }

        // Phát âm thanh nếu không có lỗi
        audio.play().then(() => {
          console.log("Playing");
        }).catch(error => {
          console.error('Playback failed:', error);
        });

      } else {
        // If no sound or "x" is found, skip to the next icon
        playAllIndex++;
      }
    }

    playNextSound(); // Start playing the sounds
  }

  // Bind the play-all button to play all sounds when clicked
  $('#play-all-btn').on('click', function () {
    playAllIndex = 0;
    playAllSounds(playIcons); // Pass in the array of play icons
  });

  function getFileNameFromUrl(imageSrc) {
    try {
      const url = new URL(imageSrc);
      const pathname = url.pathname;
      const fileName = pathname.substring(pathname.lastIndexOf('/') + 1);
      return fileName;
    } catch (e) {
      console.error('Invalid URL:', e);
      return null;
    }
  }

  function sendJsonToServer() {
    const backgroundSize = {
      width: backgroundImage.width(),
      height: backgroundImage.height(),
    };

    // const fileName = getFileNameFromUrl(backgroundImage.image().src);

    // Lấy tất cả đường line đã vẽ và chuyển thành dạng JSON
    const drawnLines = lines.map(line => ({
      points: line.points().map((point, index) =>
        index % 2 === 0
          ? (point - backgroundImage.x()) / backgroundSize.width // Tọa độ X
          : (point - backgroundImage.y()) / backgroundSize.height // Tọa độ Y
      ),
      stroke: line.stroke(), // Màu của nét vẽ
      strokeWidth: line.strokeWidth(), // Độ rộng của nét vẽ
      lineCap: line.lineCap(), // Hình dạng đầu nét vẽ
      lineJoin: line.lineJoin() // Hình dạng khi các đoạn thẳng nối nhau
    }));


    const jsonData = {
      lines: drawnLines
    };

    // Tạo đối tượng dữ liệu JSON
    const page = $('#json-dropdown').val();
    const dataToSend = {
      sheet_name: DATA_TYPE,
      page: page,
      json: JSON.stringify(jsonData) // Chuyển đổi đối tượng thành chuỗi JSON
    };

    console.log(dataToSend);
    showSpinner('#F54927');
    fetch(global_const.SERVER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(dataToSend)
    })
      .then(response => response)
      .then(data => {
        console.log('Success:', data);
        showToast('Lưu bài làm thành công!');
        // listDrawingPagesDetailed(page.toString());
      })
      .catch(error => {
        console.log('Error:', error);
        showToast('Bị lỗi gì rồi không lưu được bạn ơi.!', 'danger');
      })
      .finally(() => {
        hideSpinner();
      });      
  }

  // Key is String
  function getLinesByKey(key) {
    console.log('getLinesByKey::', key)
    if (APP_DATA != null) {
      const raw = APP_DATA.get(key);
      // 2. Parse nếu cần (nếu server trả chuỗi JSON)
      let parsed;
      if (typeof raw === 'string') {
        try {
          parsed = JSON.parse(raw);
        } catch (err) {
          console.error('Không parse được JSON cho key :', err);
          parsed = null;
        }
      } else {
        parsed = raw; // đã là object
      }

      // 3. Lấy mảng lines an toàn
      const lines = parsed && Array.isArray(parsed.lines) ? parsed.lines : [];
      return lines;
    } 

    return null;
  }

  function listDrawingPagesDetailed(page = null) {
    console.log("listDrawingPagesDetailed::" + page);

    // showSpinner('#28a745');
    const dataToSend = { sheet_name: DATA_TYPE };
    // Tạo promise và gắn xử lý lỗi — nhưng KHÔNG await/return
    fetch(global_const.SERVER_API_ALL_METHOD, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dataToSend)
    })
      .then(async response => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then(data => {
        
        APP_DATA = new Map(Object.entries(data || {}));
        console.log('Đã cập nhật APP_DATA');
        loadLinesByDraw(page);
      })
      .catch(err => {
        console.error('Fetch error (fire-and-forget):', err);
      })
      .finally(() => {
        // hideSpinner();
      });
  }


  // Event listener for the "Send JSON to Server" button
  $('#send-json').click(function () {
    sendJsonToServer();
  });

  popDropdown($('#json-dropdown'), "Page", MIN_PAGE_NUM, MAX_PAGE_NUM, CURRENT_PAGE_INDEX);
  loadPage();
  toggleLockIcon();

});