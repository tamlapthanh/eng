$(document).ready(function () {

  const stage = new Konva.Stage({
    container: 'canvas',
    width: window.innerWidth,
    height: window.innerHeight,
    draggable: false,
  });

  let PATH_ROOT = "assets/books/27/";
  let DATA_TYPE = "student";
  let CURRENT_PAGE_INDEX = 4;
  let MAX_PAGE_NUM = 66;
  let MIN_PAGE_NUM = 1;
  let ICON_SIZE = 18;

  // Create a new Map
  let APP_DATA = new Map();

  // const RUN_URL_LOCAL = "http://localhost:8080/api/sheets/data";
  //const RUN_URL_SERVER = "https://zizi-app.onrender.com/api/sheets/data";
  const RUN_URL_SERVER = "https://zizi-app.onrender.com/api/sheets/lines";
  const RUN_URL_LOCAL = "http://localhost:8080/api/sheets/lines";
  

  const global_const = {
    get PATH_ASSETS_IMG() {
      //   PATH_ASSETS_IMG = "assets/img/";
      return PATH_ROOT + DATA_TYPE + "/img/";
    },
    get PATH_IMG() {
      //  PATH_IMG = "assets/img/X.webp";
      return PATH_ROOT + DATA_TYPE + "/img/X.webp";
    },
    get PATH_SOUND() {
      //  PATH_SOUND = "assets/sound/student/";
      return PATH_ROOT + DATA_TYPE + "/sound/";
    },
    get PATH_JSON() {
      //  PATH_JSON = "assets/data/X.json";
      return PATH_ROOT + DATA_TYPE + "/data/X.json";
    },
    get SERVER_URL() {
      const hostname = window.location.hostname;
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return RUN_URL_LOCAL;
      } else {
        return RUN_URL_SERVER;
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
    stage.scale({ x: scale, y: scale });
    stage.batchDraw();
  }

  // xu ly ve tren canva
  // Biến để lưu trạng thái có đang ở chế độ vẽ hay không
  let isDrawingMode = false;
  // Biến để lưu trạng thái vẽ đang diễn ra
  let isDrawing = false;
  let lastLine;
  let lines = []; // Mảng lưu các đường vẽ

  function drawProcess() {
    isDrawingMode = !isDrawingMode;

    if (isDrawingMode) {
      // Thay đổi icon thành "cọ vẽ"
      $('#draw-icon').removeClass('bi-brush').addClass('bi-hand-index');
      $('#draw-mode-btn').removeClass('btn-warning').addClass('btn-danger');
      $('button').not('#draw-mode-btn, #undo-btn, #send-json').prop('disabled', true);
      $('#undo-btn').removeClass('d-none').addClass('d-block');
      $('#send-json').removeClass('d-none').addClass('d-block');
      
      // Khóa drag và vô hiệu hóa lắng nghe của các lớp khác
      stage.draggable(false);

      backgroundLayer.listening(false);
      iconLayer.listening(false);
      drawingLayer.listening(true);  // Chỉ lớp vẽ được phép lắng nghe
    } else {
      // Bật lại drag và lắng nghe các lớp khác
      stage.draggable(true);

      backgroundLayer.listening(true);
      iconLayer.listening(true);
      drawingLayer.listening(false); // Vô hiệu hóa lắng nghe lớp vẽ
      $('#draw-icon').removeClass('bi-hand-index').addClass('bi-brush');
      $('#draw-mode-btn').removeClass('btn-danger').addClass('btn-warning'); // Đổi màu
      $('button').prop('disabled', false);
      $('#undo-btn').removeClass('d-block').addClass('d-none');
      $('#send-json').removeClass('d-block').addClass('d-none');
      
    }

    // Cập nhật stage
    stage.batchDraw();
  }



  // Hàm chuyển đổi tọa độ từ canvas sang tọa độ của stage (đã được zoom)
  function getRelativePointerPosition() {
    const transform = stage.getAbsoluteTransform().copy();
    transform.invert();  // Đảo ngược transform để lấy tọa độ chính xác
    const pos = stage.getPointerPosition();
    return transform.point(pos); // Trả về tọa độ đã điều chỉnh
  }

  // Xử lý bắt đầu vẽ
  stage.on('mousedown touchstart', function (e) {
    if (!isDrawingMode) return;  // Chỉ cho phép vẽ khi ở chế độ vẽ

    isDrawing = true;  // Bắt đầu vẽ

    const pos = getRelativePointerPosition();  // Lấy tọa độ đã điều chỉnh

    lastLine = new Konva.Line({
      stroke: 'red',
      strokeWidth: 3,
      globalCompositeOperation: 'source-over',
      points: [pos.x, pos.y],  // Sử dụng tọa độ đã điều chỉnh
      lineCap: 'round',
      lineJoin: 'round',
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
  });

  // Xử lý khi kết thúc vẽ
  stage.on('mouseup touchend', function (e) {
    if (isDrawing) {
      isDrawing = false;  // Dừng vẽ
      lastLine = null;    // Xóa đường vẽ cuối cùng
    }
  });

  $('#draw-mode-btn').on('click', function () {
    drawProcess();
  });

  $('#undo-btn').on('click', function () {
    if (lines.length > 0) {
      const lastLine = lines.pop(); // Lấy đường vẽ cuối cùng
      lastLine.destroy(); // Xóa đường vẽ khỏi canvas
      drawingLayer.batchDraw(); // Cập nhật canvas
    }
  });

  // end of xu ly ve tren canva

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
      console.log('Double-tap detected!');
      if (zoomLevel < maxZoom) {
        zoomLevel += zoomStep;
        setZoom(zoomLevel);
      }
    }

    lastTouchTime = now;
  });

  // Mouse double-click event
  stage.on('dblclick', (e) => {
    console.log('Double-click detected!');
    if (zoomLevel < maxZoom) {
      zoomLevel += zoomStep;
      setZoom(zoomLevel);
    }
  });


  // Zoom with mouse wheel
  stage.on('wheel', function (event) {
    event.evt.preventDefault();
    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();

    const scaleBy = 1.1;
    let newScale = oldScale;

    if (event.evt.deltaY > 0) {
      newScale = oldScale / scaleBy;
    } else {
      newScale = oldScale * scaleBy;
    }

    // Limit the zoom level
    newScale = Math.max(minZoom, Math.min(maxZoom, newScale));

    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };

    const newPos = {
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    };

    zoomLevel = newScale;
    stage.scale({ x: newScale, y: newScale });
    stage.position(newPos);
    stage.batchDraw();
  });

  interact('#canvas').draggable({
    listeners: {
      move(event) {
        if (!isPinching && !isDrawingMode) {  // Only allow dragging if not pinching
          const { dx, dy } = event;
          stage.x(stage.x() + dx);
          stage.y(stage.y() + dy);
          stage.batchDraw();
        }
      }
    }
  });

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
      return [ arr[0], arr[1], arr[2] ];
    }

    return arr ;
  }
  function playSound(soundFileName, icon) {
    resetIcons();

    if (soundFileName && "x" != soundFileName.trim()) {
        const [fileName, start, end] = getSoundStartEnd(soundFileName);
        console.log(fileName, start, end);
        let url = global_const.PATH_SOUND + fileName.trim() + ".mp3";

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

  function isNotMobile() {
    const width = window.innerWidth;
    const userAgent = navigator.userAgent.toLowerCase();

    if (width < 768 || /mobile|android|iphone|ipod|blackberry|iemobile|opera mini/i.test(userAgent)) {
      return false;
    } else {
      return true;
    }
  }

  function getIconSize() {
    let icon_size = ICON_SIZE;
    const width = window.innerWidth;
    const userAgent = navigator.userAgent.toLowerCase();

    if (width < 768 || /mobile|android|iphone|ipod|blackberry|iemobile|opera mini/i.test(userAgent)) {
      icon_size = ICON_SIZE;
    } else if ((width >= 768 && width <= 1024) || /tablet|ipad|playbook|silk/i.test(userAgent)) {
      icon_size = ICON_SIZE;
    } else {
      icon_size = ICON_SIZE;
    }
    return icon_size;
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

    icon_size = getIconSize();
    Konva.Image.fromURL(iconPath_1, function (icon) {
      icon.setAttrs({
        x: x || Math.random() * (stage.width() - 50),
        y: y || Math.random() * (stage.height() - 50),
        width: icon_size,
        height: icon_size,
      });

      icon.setAttr('sound', sound.trim() || '');

      function handleInteraction() {
        currentIcon = icon;
        iconSoundUrlInput.val(icon.getAttr('sound') || '');
        iconXInput.val(icon.x());
        iconYInput.val(icon.y());
        if (icon.getAttr('sound')) {

          playSound(icon.getAttr('sound'), currentIcon);
        } else {
          alert("Not found the sound id.")
        }
      }

      icon.on('click', handleInteraction);
      icon.on('touchend', handleInteraction);

      playIcons.push(icon);

      // Change cursor on hover
      icon.on('mouseover', function () {
        document.body.style.cursor = 'pointer';

      });
      icon.on('mouseout', function () {
        document.body.style.cursor = 'default';
      });

      iconLayer.add(icon);
      icon.moveToTop();
      //iconLayer.batchDraw();
    });
  }

  function requestRenderServer() {
    const data_key = DATA_TYPE + CURRENT_PAGE_INDEX;
      if (APP_DATA.has(data_key)) {
        console.log("Data from stored app map. {%s,%s}", DATA_TYPE, CURRENT_PAGE_INDEX);
        loadIconAndLines(APP_DATA.get(data_key));
      }
      else {
        showSpinner();
        const startTime = Date.now();
        const dataToSend = {
          sheet_name: DATA_TYPE.toString(),
          page: CURRENT_PAGE_INDEX.toString()
        };
        fetch(global_const.SERVER_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(dataToSend)
        })
        .then(response => response.json()) // This actually calls the json() function
        .then(data => {
          checkLoadAppData(data);
        })
        .catch(error => {
          // console.error('There was an error with the fetch operation:');
        })
        .finally(() => {
          hideSpinner();
          const endTime = Date.now();
          const requestTimeInSeconds = (endTime - startTime) / 1000;
          console.log(`Fetch operation completed. Processing time: ${requestTimeInSeconds} seconds`);
        });
    }
  }

  function checkLoadAppData(retObjects) {

     // Chuyển đổi chuỗi JSON thành đối tượng JavaScript
    const jsonObjects = retObjects.map(item => JSON.parse(item));

    // Truy cập các giá trị
    jsonObjects.forEach(data => {
      const pageNo = data.background.split('.')[0];
      if (pageNo == CURRENT_PAGE_INDEX.toString()) {
        loadIconAndLines(data);
      }
      const data_key = DATA_TYPE + pageNo;
      APP_DATA.set(data_key, data);
    });

    // only keep previous 5 pages if any
    let keepPage = CURRENT_PAGE_INDEX - 10;
    while (keepPage >=0 ) {
      const data_key = DATA_TYPE + keepPage;
      APP_DATA.delete(data_key);
      keepPage = keepPage - 1;
    } 
  }

 function loadIconAndLines(data) {
    // Xóa các icon hiện có
    playIcons.forEach(icon => icon.destroy());
    playIcons = [];

    // Xóa các line hiện có
    lines.forEach(line => line.destroy());
    lines = [];

    // Tính toán vị trí mới của các icon dựa trên kích thước hình nền mới
    if (data.icons) {
      data.icons.forEach(iconData => {
        const iconX = iconData.x * backgroundImage.width() + backgroundImage.x();
        const iconY = iconData.y * backgroundImage.height() + backgroundImage.y();
        addPlayIcon(iconX, iconY, iconData.sound);
      });
  }

    if (data.lines) {
      data.lines.forEach(savedLine => {
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
          lineJoin: savedLine.lineJoin
        });
      
        // Thêm line vào layer
        drawingLayer.add(line);
        lines.push(line);
      }); // end of forEach
    }

    drawingLayer.batchDraw();
  }

  // show page
  function loadPage() {

    clearCanvas();
    $('#settingsModal').modal('hide');
    CURRENT_PAGE_INDEX = parseInt($('#json-dropdown').val(), 10);

    loadBackgroundImage(CURRENT_PAGE_INDEX);
    requestRenderServer();

    fitStageIntoParentContainer();
  }


  $('#json-dropdown').change(function () {
    loadPage();
  });


  function loadBackgroundImage(page) {
    const imageObj = new Image();
    imageObj.onload = function () {
      adjustBackgroundImage(imageObj);
    };
    const imageUrl = global_const.PATH_IMG.replace("X", page);
    imageObj.src = imageUrl;
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


  window.addEventListener('resize', loadPage);


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
    CURRENT_PAGE_INDEX = CURRENT_PAGE_INDEX - 1;
    if (CURRENT_PAGE_INDEX < MIN_PAGE_NUM) {
      CURRENT_PAGE_INDEX = MAX_PAGE_NUM;
    }
    $('#json-dropdown').val(CURRENT_PAGE_INDEX).change();
  });

  next_page.on('click', function () {
    CURRENT_PAGE_INDEX = CURRENT_PAGE_INDEX + 1;
    if (CURRENT_PAGE_INDEX > MAX_PAGE_NUM) {
      CURRENT_PAGE_INDEX = MIN_PAGE_NUM;
    }
    $('#json-dropdown').val(CURRENT_PAGE_INDEX).change();
  });

  $('#jump-to-index-jso').on('change', function () {
    var inputValue = $(this).val();
    $('#json-dropdown').val(inputValue).change();
  });

  $('#clearButton').on('click', function () {
    clearCanvas();
  });

  function showSpinner() {
    document.getElementById('spinnerOverlay').style.display = 'flex';
  }

  function hideSpinner() {
    document.getElementById('spinnerOverlay').style.display = 'none';
  }


  $('#setting').on('click', function () {
    const zoomControls = document.querySelector('.zoom-controls');
    zoomControls.style.display = (zoomControls.style.display === 'none' || zoomControls.style.display === '')
      ? 'flex'
      : 'none';
  });

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
    if ("student" == dataType) {
       CURRENT_PAGE_INDEX = 4;
       MAX_PAGE_NUM = 66;
       MIN_PAGE_NUM = 1;
    } if ("work" == dataType) {
      CURRENT_PAGE_INDEX = 1;
      MAX_PAGE_NUM = 65;
      MIN_PAGE_NUM = 1;
    } if ("dict" == dataType) {
      CURRENT_PAGE_INDEX = 2;
      MAX_PAGE_NUM = 87;
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

        let url = global_const.PATH_SOUND + fileName.trim() + ".mp3";

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

      const fileName = getFileNameFromUrl(backgroundImage.image().src);

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
          background: fileName,
          icons: playIcons.map(icon => ({
              x: (icon.x() - backgroundImage.x()) / backgroundSize.width,
              y: (icon.y() - backgroundImage.y()) / backgroundSize.height,
              sound: icon.getAttr('sound')
          })),
          lines: drawnLines,
          backgroundSize: backgroundSize
      };

      console.log('Data to send:', JSON.stringify(jsonData, null, 2)); // Kiểm tra dữ liệu trước khi gửi
      // Tạo đối tượng dữ liệu JSON
      const page = $('#json-dropdown').val() ;
      const dataToSend = {
        sheet_name: DATA_TYPE,
        page: page,
        json: JSON.stringify(jsonData) // Chuyển đổi đối tượng thành chuỗi JSON
    };

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
              alert('Lưu bài làm thành công!');
              APP_DATA.delete(DATA_TYPE + page);
              drawProcess();
          })
          .catch(error => {
              console.log('Error:', error);
              alert('Bị lỗi gì rồi không lưu được bạn ơi.');
          });
  }


   // Event listener for the "Send JSON to Server" button
  $('#send-json').click(function () {
    sendJsonToServer();
  });

  popDropdown($('#json-dropdown'), "Page", MIN_PAGE_NUM, MAX_PAGE_NUM, CURRENT_PAGE_INDEX);
  loadPage();

});