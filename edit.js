let ICON_AUDIO = "assets/play_icon.png";
let ICON_PLAYING = "assets/music_icon.svg";

$(document).ready(function () {
  
  let PATH_ROOT = "assets/books/27/";
  let is_move_icon = true;

  // let DATA_TYPE = "student"
  // let CURRENT_PAGE_INDEX = 4;
  // let MAX_PAGE_NUM = 66;
  // let MIN_PAGE_NUM = 4;
  

  // let DATA_TYPE = "work"
  // let CURRENT_PAGE_INDEX = 1;
  // let MAX_PAGE_NUM = 65;
  // let MIN_PAGE_NUM = 1;

  let DATA_TYPE = "student37";
  let CURRENT_PAGE_INDEX = 3;
  let MAX_PAGE_NUM = 107;
  let MIN_PAGE_NUM = 1;

  // let DATA_TYPE = "work37";
  // let CURRENT_PAGE_INDEX = 1;
  // let MAX_PAGE_NUM = 97;
  // let MIN_PAGE_NUM = 1;  

  // let DATA_TYPE = "Young_Children_2_5";
  // let CURRENT_PAGE_INDEX = 1;
  // let MAX_PAGE_NUM = 37;
  // let MIN_PAGE_NUM = 1;  


  // let DATA_TYPE = "Young_Children_6_12";
  // let CURRENT_PAGE_INDEX = 2;
  // let MAX_PAGE_NUM = 65;
  // let MIN_PAGE_NUM = 1;  

  // let DATA_TYPE = "first_work_sheet";
  // let CURRENT_PAGE_INDEX = 1;
  // let MAX_PAGE_NUM = 14;
  // let MIN_PAGE_NUM = 1;    

  // let DATA_TYPE = "dict"
  // let CURRENT_PAGE_INDEX = 1;
  // let MAX_PAGE_NUM = 87;
  // let MIN_PAGE_NUM = 1;

  let SERVER_URL = "http://localhost:8080/api/file/save-json";
  const SAVE_FOLDER = DATA_TYPE + "/data/";

  const global_const = {
    get PATH_ASSETS_IMG() {
      return PATH_ROOT + DATA_TYPE + "/img/";
    },
    get PATH_IMG() {
      return PATH_ROOT + DATA_TYPE + "/img/X.webp";
    },
    get PATH_SOUND() {
      return PATH_ROOT + DATA_TYPE + "/sound/";
    },
    get PATH_JSON() {
      return PATH_ROOT + DATA_TYPE + "/data/X.json";
    },
  };

  const stage = new Konva.Stage({
    container: "canvas",
    width: window.innerWidth,
    height: window.innerHeight,
  });

  const backgroundLayer = new Konva.Layer();
  const iconLayer = new Konva.Layer();
  stage.add(backgroundLayer);
  stage.add(iconLayer);

  const imageFileInput = $("#upload-image");
  const iconSoundUrlInput = $("#icon-sound-url");
  const iconXInput = $("#icon-x");
  const iconYInput = $("#icon-y");
  const iconTypeInput = $("#icon-type");
  const iconOpacityInput = $("#icon-opacity");
  const iconWidthInput = $("#icon-width");
  const iconHeightInput = $("#icon-height");

  const playIconButton = $("#play-icon");
  const saveIconButton = $("#save-icon"); // save icon trong modal
  const saveSendIconButton = $("#save-icon-send");
  const saveSendIconButton2 = $("#save-icon-send-2");
  const saveJsonButton = $("#save-json");
  const cloneButton = $("#clone-icon-2, #clone-icon-1");
  const previous_page = $("#previous_page");
  const next_page = $("#next_page");

  let backgroundImage = null;
  let playIcons = [];
  let currentIcon = null;
  let audio = null;
  let currentSoundNum = 0;
  let iconTransformers = new Map();

  // Khai báo stack undo/redo
const undoStack = [];
let currentActionId = 0;

let selectedIcons = new Set();
let ctrlKeyPressed = false;

// Theo dõi phím Ctrl
$(document).on('keydown', function(e) {
  if (e.ctrlKey || e.metaKey) {
    ctrlKeyPressed = true;
    document.body.style.cursor = 'crosshair';
  }
});

$(document).on('keyup', function(e) {
  if (!e.ctrlKey && !e.metaKey) {
    ctrlKeyPressed = false;
    document.body.style.cursor = 'default';
  }
});

  function createTransformerForIcon(icon) {
    const transformer = new Konva.Transformer({
      nodes: [icon],
      keepRatio: false,
      flipEnabled: false,
      boundBoxFunc: function(oldBox, newBox) {
        if (Math.abs(newBox.width) < 10 || Math.abs(newBox.height) < 10) {
          return oldBox;
        }
        return newBox;
      },
      borderEnabled: true,
      borderStroke: '#0099ff',
      borderStrokeWidth: 2,
      borderDash: [5, 5],
      anchorStroke: '#0099ff',
      anchorFill: '#ffffff',
      anchorStrokeWidth: 2,
      anchorSize: 8,
      rotateAnchorOffset: 20
    });

    icon.on('transform', () => {
      icon.setAttrs({
        scaleX: 1,
        scaleY: 1,
        width: Math.abs(icon.width() * icon.scaleX()),
        height: Math.abs(icon.height() * icon.scaleY()),
      });
      applyCrop(icon, icon.getAttr('lastCropUsed') || 'center-middle');
    });

    // Thêm sự kiện sau khi resize xong
    icon.on('transformend', () => {
      console.log('Resize completed', {
        x: icon.x(),
        y: icon.y(),
        width: icon.width(),
        height: icon.height(),
        rotation: icon.rotation()
      });
      
      // Gọi các hàm callback sau khi transform hoàn tất
      //saveIconState(icon);
      
      // Hoặc trigger custom event
      stage.fire('icon-transformed', { 
        target: icon,
        transformer: transformer 
      });
      
      // Update lại layer để đảm bảo hiển thị chính xác
      iconLayer.batchDraw();
    });

    iconLayer.add(transformer);
    iconTransformers.set(icon, transformer);
    transformer.nodes([]);
    
    return transformer;
}

// function saveIconState(icon) {
//   currentIcon = icon;
//   saveIcon(); 
// }

  function showTransformerForIcon(icon) {
    const transformer = iconTransformers.get(icon);
    if (transformer) {
      transformer.nodes([icon]);
      iconLayer.batchDraw();
    }
  }

  function hideAllTransformers() {
    iconTransformers.forEach((transformer) => {
      transformer.nodes([]);
    });
    iconLayer.batchDraw();
  }

function removeIconAndTransformer(icon) {
  // Xóa khỏi selectedIcons nếu có
  if (selectedIcons.has(icon)) {
    selectedIcons.delete(icon);
  }
  
  const transformer = iconTransformers.get(icon);
  if (transformer) {
    transformer.destroy();
    iconTransformers.delete(icon);
  }
  
  const index = playIcons.indexOf(icon);
  if (index > -1) {
    playIcons.splice(index, 1);
  }
  if (icon.destroy) {
    icon.destroy();
  }
  
  iconLayer.batchDraw();
}

  // ========== CROP FUNCTIONS ==========
  function applyCrop(img, pos) {
    if (!img.image()) return;
    
    img.setAttr('lastCropUsed', pos);
    const crop = getCrop(
      img.image(),
      { width: img.width(), height: img.height() },
      pos
    );
    img.setAttrs(crop);
  }

  function getCrop(image, size, clipPosition = 'center-middle') {
    const width = size.width;
    const height = size.height;
    const aspectRatio = width / height;

    let newWidth;
    let newHeight;

    const imageRatio = image.width / image.height;

    if (aspectRatio >= imageRatio) {
      newWidth = image.width;
      newHeight = image.width / aspectRatio;
    } else {
      newWidth = image.height * aspectRatio;
      newHeight = image.height;
    }

    let x = 0;
    let y = 0;
    if (clipPosition === 'left-top') {
      x = 0;
      y = 0;
    } else if (clipPosition === 'left-middle') {
      x = 0;
      y = (image.height - newHeight) / 2;
    } else if (clipPosition === 'left-bottom') {
      x = 0;
      y = image.height - newHeight;
    } else if (clipPosition === 'center-top') {
      x = (image.width - newWidth) / 2;
      y = 0;
    } else if (clipPosition === 'center-middle') {
      x = (image.width - newWidth) / 2;
      y = (image.height - newHeight) / 2;
    } else if (clipPosition === 'center-bottom') {
      x = (image.width - newWidth) / 2;
      y = image.height - newHeight;
    } else if (clipPosition === 'right-top') {
      x = image.width - newWidth;
      y = 0;
    } else if (clipPosition === 'right-middle') {
      x = image.width - newWidth;
      y = (image.height - newHeight) / 2;
    } else if (clipPosition === 'right-bottom') {
      x = image.width - newWidth;
      y = image.height - newHeight;
    }

    return {
      cropX: x,
      cropY: y,
      cropWidth: newWidth,
      cropHeight: newHeight,
    };
  }

  function showTransformerForMultipleIcons(icons) {
  if (icons.length === 0) {
    hideAllTransformers();
    return;
  }

  let transformer = iconTransformers.get('multiple');
  
  if (!transformer) {
    transformer = new Konva.Transformer({
      nodes: [],
      keepRatio: false,
      flipEnabled: false,
      boundBoxFunc: function(oldBox, newBox) {
        if (Math.abs(newBox.width) < 10 || Math.abs(newBox.height) < 10) {
          return oldBox;
        }
        return newBox;
      },
      borderEnabled: true,
      borderStroke: '#00ff00',
      borderStrokeWidth: 2,
      borderDash: [5, 5],
      anchorStroke: '#00ff00',
      anchorFill: '#ffffff',
      anchorStrokeWidth: 2,
      anchorSize: 8,
      rotateAnchorOffset: 20
    });

    iconLayer.add(transformer);
    iconTransformers.set('multiple', transformer);
  }

  transformer.nodes(icons);
  iconLayer.batchDraw();
}

  // ========== ICON FUNCTIONS ==========
  function addPlayIcon(iconData, x, y, width, height) {
    let icon_size = getIconSize(19);
    
    Konva.Image.fromURL(ICON_AUDIO, function (icon) {
      icon.setAttrs({
        x: x || stage.width() - 150,
        y: y || Math.random() * (stage.height() - 50),
        width: width || icon_size,
        height: height || icon_size,
        strokeWidth: 2,
        stroke : "blue",        
        opacity: 0.3
      });

      icon.setAttr("sound", iconData?.sound || "");
      icon.setAttr("icon_opacity", iconData?.icon_opacity || "1");
      icon.setAttr("icon_type", iconData?.icon_type || "1");
      icon.draggable(true);

       // Thêm vào undo stack
        const action = {
            id: currentActionId++,
            type: 'ADD_ICON',
            icon: icon,
            data: {
                x: icon.x(),
                y: icon.y(),
                width: icon.width(),
                height: icon.height(),
                iconData: iconData
            }
        };

        undoStack.push(action); // Clear redo stack khi có action mới


      createTransformerForIcon(icon);
      applyCrop(icon, 'center-middle');

      icon.on('dragmove', () => {
        const transformer = iconTransformers.get(icon);
        if (transformer) {
          transformer.forceUpdate();
        }
      });

function handleClick(e) {
  console.log("icon: handleClick");
  e.cancelBubble = true;
  
  if (ctrlKeyPressed) {
    // Ctrl + click: thêm/bỏ chọn icon
    if (selectedIcons.has(icon)) {
      selectedIcons.delete(icon);
      icon.stroke('blue'); // Trở về màu bình thường
    } else {
      selectedIcons.add(icon);
      icon.stroke('green'); // Đánh dấu đang chọn
    }
    
    // Hiển thị transformer cho các icon được chọn
    if (selectedIcons.size > 0) {
      showTransformerForMultipleIcons(Array.from(selectedIcons));
    } else {
      hideAllTransformers();
    }
    
    // Ẩn modal khi chọn nhiều icon
    if (selectedIcons.size !== 1) {
      currentIcon = null;
    } else {
      // Nếu chỉ chọn 1 icon, cập nhật currentIcon
      currentIcon = icon;
      updateIconControls(icon);
    }
  } else {
    // Click thường: chọn icon duy nhất (giữ nguyên logic cũ)
    hideAllTransformers();
    setSelectedIcon(icon);
    currentIcon = icon;
    updateIconControls(icon);
    showTransformerForIcon(icon);
    showModal(is_move_icon);
  }
  
  iconLayer.batchDraw();
}
 
        // Thêm sự kiện remove để cleanup
        icon.on('remove', function() {
            removeIconFromStacks(icon);
        });
      icon.on("click", handleClick);
      icon.on("touchend", handleClick); // handleClick

        // Tạo và cấu hình tooltip
        const tiptext = (String(iconData?.sound || 'Play Audio')).split('/').pop();
        const tooltip = createTooltip(tiptext);
        
        let tooltipTimeout;

        icon.on("mouseover", function (e) {
            document.body.style.cursor = "pointer";
            
            // Hiển thị tooltip sau một khoảng delay nhỏ
            tooltipTimeout = setTimeout(() => {
                updateTooltipPosition(tooltip, e.evt);
                tooltip.classList.add('visible');
            }, 100);
        });

        icon.on("mouseout", function () {
            document.body.style.cursor = "default";
            // Ẩn tooltip và clear timeout
            clearTimeout(tooltipTimeout);
            tooltip.classList.remove('visible');
        });

        icon.on("mousemove", function (e) {
            if (tooltip.classList.contains('visible')) {
                updateTooltipPosition(tooltip, e.evt);
            }
        });

        // Cleanup
        icon.on('remove', function() {
            clearTimeout(tooltipTimeout);
            if (tooltip.parentNode) {
                tooltip.parentNode.removeChild(tooltip);
            }
        });


      playIcons.push(icon);
      iconLayer.add(icon);
      icon.moveToTop();
      iconLayer.batchDraw();
    });
  }

  // Helper functions
function removeIconFromStage(icon) {
    // Xóa icon khỏi layer
    icon.remove();
    
    // Xóa khỏi mảng playIcons
    const index = playIcons.indexOf(icon);
    if (index > -1) {
        playIcons.splice(index, 1);
    }
    
    // Xóa transformer nếu có
    const transformer = iconTransformers.get(icon);
    if (transformer) {
        transformer.remove();
        iconTransformers.delete(icon);
    }
    
    iconLayer.batchDraw();
}

function addIconBackToStage(action) {
    const { icon, data } = action;
    
    // Thêm icon trở lại layer
    iconLayer.add(icon);
    playIcons.push(icon);
    
    // Tạo lại transformer
    createTransformerForIcon(icon);
    
    iconLayer.batchDraw();
}

function removeIconFromStacks(icon) {
    // Xóa icon khỏi undo/redo stacks
    removeFromStack(undoStack, icon);
}

function removeFromStack(stack, icon) {
    const index = stack.findIndex(action => action.icon === icon);
    if (index > -1) {
        stack.splice(index, 1);
    }
}

  // Hàm helper tạo tooltip
function createTooltip(text) {
    const tooltip = document.createElement('div');
    tooltip.className = 'icon-tooltip';
    tooltip.innerHTML = text;
    document.body.appendChild(tooltip);
    return tooltip;
}

// Hàm helper cập nhật vị trí tooltip
function updateTooltipPosition(tooltip, event, icon) {
    const stageRect = stage.container().getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    
    // Tính toán vị trí mong muốn
    const desired = calculateOptimalPosition(event, tooltipRect, stageRect, icon);
    
    // Áp dụng vị trí với transition
    tooltip.style.transform = `translate(${desired.x}px, ${desired.y}px)`;
}

function calculateOptimalPosition(event, tooltipRect, stageRect, icon) {
    const padding = 10;
    const mouseOffset = 15;
    
    // Vị trí mặc định (bên phải chuột)
    let x = event.clientX + mouseOffset;
    let y = event.clientY - mouseOffset;
    
    // Kiểm tra collision với các cạnh
    const collisions = {
        right: x + tooltipRect.width > stageRect.right - padding,
        left: x < stageRect.left + padding,
        bottom: y + tooltipRect.height > stageRect.bottom - padding,
        top: y < stageRect.top + padding
    };
    
    // Xử lý collision theo thứ tự ưu tiên
    if (collisions.right) {
        x = event.clientX - tooltipRect.width - mouseOffset;
    }
    
    if (collisions.left) {
        x = stageRect.left + padding;
    }
    
    if (collisions.bottom) {
        y = event.clientY - tooltipRect.height - mouseOffset;
    }
    
    if (collisions.top) {
        y = stageRect.top + padding;
    }
    
    return { x, y };
}

  function showModal(isShow = false) {
    // if (isShow) {
        // Không show modal khi mà đang moving 
        $("#settingsModal").modal("show");
    // }
  }

  function updateIconControls(icon) {
    iconSoundUrlInput.val(icon.getAttr("sound") || "");
    iconXInput.val(icon.x());
    iconYInput.val(icon.y());
    $('#icon-type').val(icon.getAttr("icon_type") || "1");
    $('#icon-opacity').val(icon.getAttr("icon_opacity") || "1");
    $('#icon-width').val(icon.width());
    $('#icon-height').val(icon.height());
  }

  function applySizeToSelectedIcons(icon) {
    
    if (!currentIcon) {
        alert("Vui lòng chọn một icon để sao chép kích thước!");
        return;
    }

    const sourceWidth = currentIcon.width();
    const sourceHeight = currentIcon.height();
    const icon_opacity = currentIcon.getAttr("icon_opacity");

    // Áp dụng cho icon đang chọn
    icon.setAttrs({
        width: sourceWidth,
        height: sourceHeight,
        icon_opacity: icon_opacity
    });
    applyCrop(icon, icon.getAttr('lastCropUsed') || 'center-middle');
    iconLayer.batchDraw();
}

  function setSelectedIcon(icon) {
    // let iconPathIdle = ICON_AUDIO;
    // let iconPathPlaying = ICON_PLAYING;

    if (currentIcon && !is_move_icon) {
      applySizeToSelectedIcons(icon);
    }

    currentIcon = icon;
     updateIconInputs(currentIcon);
  }

  function setIconImage(icon, url) {
    if (!icon) return;
    const newImg = new Image();
    newImg.onload = function () {
      icon.image(newImg);
      icon.getLayer() && icon.getLayer().batchDraw();
    };
    newImg.src = url;
  }

  // ========== SAVE FUNCTIONS ==========
  function saveIcon() {
    const originalBackgroundColor = saveIconButton.css("background-color");
    saveIconButton.css("background-color", "#cccccc");

    if (currentIcon) {
      const transformer = iconTransformers.get(currentIcon);
      const wasVisible = transformer && transformer.nodes().length > 0;

      currentIcon.setAttrs({
        x: parseInt(iconXInput.val()) || currentIcon.x(),
        y: parseInt(iconYInput.val()) || currentIcon.y(),
        width: parseInt($('#icon-width').val()) || currentIcon.width(),
        height: parseInt($('#icon-height').val()) || currentIcon.height(),        
        sound: iconSoundUrlInput.val(),
        icon_type: $('#icon-type').val() || "1",
        icon_opacity: $('#icon-opacity').val() || "1"
      });

      applyCrop(currentIcon, currentIcon.getAttr('lastCropUsed') || 'center-middle');

      if (transformer) {
        transformer.forceUpdate();
        if (wasVisible) {
          setTimeout(() => {
            transformer.nodes([currentIcon]);
            iconLayer.batchDraw();
          }, 10);
        }
      }

      iconLayer.batchDraw();
    }

    currentSoundNum = Number(iconSoundUrlInput.val());
    saveIconButton.css("background-color", originalBackgroundColor);
  }

  // ========== SOUND FUNCTIONS ==========
  function getSoundStartEnd(fileName) {
    var arr = fileName.split("/");
    if (arr.length > 1) {
      return [arr[0], arr[1], arr[2]];
    }
    return [arr[0]];
  }

  function playSound(soundFileName, icon) {
    if (soundFileName && "x" != soundFileName.trim()) {
      const [fileName, start, end] = getSoundStartEnd(soundFileName);
      console.log(fileName, start, end);

      let url =
        global_const.PATH_SOUND +
        fileName.trim() +
        (fileName.trim().endsWith(".mp3") ? "" : ".mp3");

      if (audio && !audio.paused) {
        audio.pause();
        audio.currentTime = 0;
      }

      audio = new Audio(url);

      if (start !== undefined && start !== null && start !== "") {
        audio.addEventListener("loadedmetadata", () => {
          audio.currentTime = parseFloat(start);

          if (end !== undefined && end !== null && end !== "") {
            const endTime = parseFloat(end);
            audio.addEventListener("timeupdate", () => {
              if (audio.currentTime >= endTime) {
                if (!audio.paused) {
                  audio.pause();
                  audio.currentTime = 0;
                }
              }
            });
          }
        });
      } else {
        audio.addEventListener("ended", (event) => {
          console.log("Audio completed");
        });
      }

      audio.play().catch((error) => {
        console.error("Playback failed:", error);
      });
    }
  }

  // ========== BACKGROUND & PAGE FUNCTIONS ==========
  function adjustBackgroundImage(imageObj) {
    const imageWidth = imageObj.width;
    const imageHeight = imageObj.height;
    const stageWidth = stage.width();
    const stageHeight = stage.height();
    const aspectRatio = imageWidth / imageHeight;
    let newWidth, newHeight;

    if (stageWidth / stageHeight > aspectRatio) {
      newWidth = stageHeight * aspectRatio;
      newHeight = stageHeight;
    } else {
      newWidth = stageWidth;
      newHeight = stageWidth / aspectRatio;
    }

    backgroundImage = new Konva.Image({
      x: (stageWidth - newWidth) / 2,
      y: (stageHeight - newHeight) / 2,
      image: imageObj,
      width: newWidth,
      height: newHeight,
    });

    backgroundLayer.add(backgroundImage);
    backgroundLayer.batchDraw();
    stage.find("Image").forEach((image) => {
      image.moveToBottom();
    });
    stage.on("resize", function () {
      fitStageIntoParentContainer();
    });
    fitStageIntoParentContainer();
  }

  function loadJsonBackgroundAndIcons(data) {
    if (data.background) {
      const imageObj = new Image();
      imageObj.onload = function () {
        if (backgroundImage) backgroundImage.destroy();
        adjustBackgroundImage(imageObj);

        playIcons.forEach((icon) => icon.destroy());
        playIcons = [];
        iconTransformers.clear();

        data.icons.forEach((iconData) => {
            const iconX = iconData.x * backgroundImage.width() + backgroundImage.x();
            const iconY = iconData.y * backgroundImage.height() + backgroundImage.y();
            var iconW, iconH;

            if (typeof iconData.width === "number" && typeof iconData.height === "number") {
            // Nếu là tỉ lệ nhỏ (<1) => hiểu là phần trăm
            if (iconData.width <= 1 && iconData.height <= 1) {
              iconW = iconData.width * backgroundImage.width();
              iconH = iconData.height * backgroundImage.height();
            } else {
              // Nếu là pixel => chuyển tỉ lệ theo ảnh nền thực tế
              iconW =(iconData.width / imageObj.naturalWidth) * backgroundImage.width();
              iconH =(iconData.height / imageObj.naturalHeight) * backgroundImage.height();
            }
          } else {
            // Nếu chưa có w/h, fallback theo ICON_SIZE
            var ICON_SIZE = 19;
            iconW =  (ICON_SIZE / imageObj.naturalWidth) * backgroundImage.width();
            iconH =  (ICON_SIZE / imageObj.naturalHeight) * backgroundImage.height();
          }

            //TODO:
            // const iconW = iconData.width * backgroundImage.width();
            // const iconH = iconData.height * backgroundImage.height();

            // const iconW = Math.min(19, iconData.width * backgroundImage.width());
            // const iconH = Math.min(19, iconData.height * backgroundImage.height());

            addPlayIcon(iconData, iconX, iconY, iconW, iconH);
        });
      };
      imageObj.src = global_const.PATH_ASSETS_IMG + data.background;
    }
  }

  function loadPage() {
    clearCanvas();
    CURRENT_PAGE_INDEX = parseInt($("#json-dropdown").val(), 10);
    if (CURRENT_PAGE_INDEX) {
      const urlJson = global_const.PATH_JSON.replace("X", CURRENT_PAGE_INDEX);
      fetch(urlJson)
        .then((response) => response.json())
        .then((data) => {
          backgroundLayer.clear();
          iconLayer.clear();
          loadJsonBackgroundAndIcons(data);
        })
        .catch((error) => console.error("Error loading JSON:", error));
    } else {
      CURRENT_PAGE_INDEX = 1;
      loadPage();
    }
    $("#settingsModal").modal("hide");
    fitStageIntoParentContainer();
  }

  // ========== UTILITY FUNCTIONS ==========
  function clearCanvas() {
    if (audio) audio.pause();
    
    iconTransformers.forEach((transformer, icon) => {
      transformer.destroy();
    });
    iconTransformers.clear();
    
    playIcons.forEach(function (icon) {
      icon.destroy();
    });
    playIcons = [];
    
    iconLayer.destroyChildren();
    iconLayer.batchDraw();

    backgroundLayer.destroyChildren();
    backgroundLayer.draw();

    fitStageIntoParentContainer();
  }

  function fitStageIntoParentContainer() {
    stage.width(window.innerWidth);
    stage.height(window.innerHeight);
    stage.batchDraw();
  }

  function getIconSize(ICON_SIZE) {
    let icon_size = ICON_SIZE;
    const width = window.innerWidth;
    const userAgent = navigator.userAgent.toLowerCase();

    if (width < 768 || /mobile|android|iphone|ipod|blackberry|iemobile|opera mini/i.test(userAgent)) {
      icon_size = 15;
    } else if ((width >= 768 && width <= 1024) || /tablet|ipad|playbook|silk/i.test(userAgent)) {
      icon_size = ICON_SIZE;
    } else {
      icon_size = ICON_SIZE;
    }
    return icon_size;
  }

  function getFileNameFromUrl(imageSrc) {
    try {
      const url = new URL(imageSrc);
      const pathname = url.pathname;
      const fileName = pathname.substring(pathname.lastIndexOf("/") + 1);
      return fileName;
    } catch (e) {
      console.error("Invalid URL:", e);
      return null;
    }
  }

  function updateIconInputs(icon) {
    if (!icon) return;
    // if (typeof iconXInput !== "undefined" && typeof iconYInput !== "undefined") {
    //   iconXInput.val(icon.x());
    //   iconYInput.val(icon.y());
    // }

    iconSoundUrlInput.val(icon.getAttr("sound") || "");
    iconXInput.val(icon.x());
    iconYInput.val(icon.y());
    $('#icon-type').val(icon.getAttr("icon_type") || "1");
    $('#icon-opacity').val(icon.getAttr("icon_opacity") || "1");
    $('#icon-width').val(icon.width());
    $('#icon-height').val(icon.height());
  }

   $(".undo-icon-from-clipborad").on("click", async function () {
          // Hàm undo

      if (undoStack.length === 0) return;

      const action = undoStack.pop();
      
      switch (action.type) {
          case 'ADD_ICON':
              removeIconFromStage(action.icon);
              break;
      }


   });
  


$(".add-home-icon").on("click", function () {

           const startX = 0.0025335059611293403; // Góc phải
           const startY = 0.0349620671313793; // Bắt đầu từ trên xuống (thay vì dưới lên)

          const width = 0.09085449735449735 * backgroundImage.width();
          const height = 0.07195767195767196 * backgroundImage.height();

          const obj = {"x":0.017387859562430354 * backgroundImage.width() + backgroundImage.x(),
                      "y":0.01273540959484802 * backgroundImage.height() + backgroundImage.y(),
                      "sound":"3",
                      "width":0.9659666804890022 * backgroundImage.width(),
                      "height":0.039751453516772825 * backgroundImage.height(),
                      "icon_type":5,
                      "icon_opacity":0.1};

    addPlayIcon({ sound: obj.sound, icon_type: obj.icon_type , icon_opacity: obj.icon_opacity}, obj.x, obj.y, obj.width, obj.height);
});  

$(".add-icon-from-clipborad").on("click", async function () {
    try {
        const text = (await navigator.clipboard.readText())?.trim() || "";
        
        const startX = stage.width() - 150; // Góc phải
        const startY = 50; // Bắt đầu từ trên xuống (thay vì dưới lên)

        // home của 6 - 12          
        var width = 0.09085449735449735 * backgroundImage.width();
        var height = 0.02708422630849887 * backgroundImage.height();

        // home của 2 - 6
        // width = 0.08013317053915248 * backgroundImage.width();
        // height = 0.07611239247815975 * backgroundImage.height();

        const parts = text
            .split(text.includes(';') ? ';' : '\n')
            .map((t) => t.trim())
            .filter((t) => t.length > 0)
            // Thêm bước lọc để bỏ qua các phần tử không có chữ sau dấu / cuối cùng
            .filter((t) => {
                // Kiểm tra xem có chứa dấu / không
                if (!t.includes('/')) return true;
                
                // Lấy phần sau dấu / cuối cùng
                const lastPart = t.split('/').pop();
                
                // Kiểm tra phần cuối cùng có chứa chữ cái không
                const hasLetters = /[a-zA-ZÀ-ỹ]/.test(lastPart);
                
                return hasLetters;
            });
        
        if (parts.length > 0) {
            let currentY = startY;
            
            parts.forEach((t) => {
                addPlayIcon({ sound: t, x: startX, y: currentY, width:width, height:height, icon_opacity: 0.1}, startX, currentY, width, height);
                currentY += 40; // Xuống dòng cho icon tiếp theo
            });
        } else {
            addPlayIcon({ x: startX, y: startY, width:width, height:height, icon_opacity: 0.1});
        }
    } catch (err) {
        console.error("Không thể đọc clipboard:", err);
        addPlayIcon({ x: stage.width() - 150, y: 50 });
    }
});

  // ========== EVENT HANDLERS ==========
  $(".add-icon").on("click", function () {

    var max = parseInt($(this).data("param"), 10);
    for (var i = 0; i < max; i++) {
      addPlayIcon();
    }

  });

  function clearSelection() {
  selectedIcons.forEach(icon => {
    icon.stroke('blue'); // Trở về màu bình thường
  });
  selectedIcons.clear();
}

  stage.on("click tap", function(e) {
    if (e.target === stage) {
       clearSelection(); // Thêm dòng này
      hideAllTransformers();
      currentIcon = null;
    }
  });

  $("#delete-icon").on("click", function () {
    if (currentIcon) {
      removeIconAndTransformer(currentIcon);
      iconSoundUrlInput.val("");
      currentIcon = null;
      $("#settingsModal").modal("hide");
    }
  });

  playIconButton.on("click", function () {
    saveIcon();
    playSound(iconSoundUrlInput.val());
  });

  saveIconButton.off("click").on("click", function (e) {
    saveIcon();
    checkSoundPath();
    $("#settingsModal").modal("hide");
  });

  saveSendIconButton.off("click").on("click", function (e) {
    saveIcon();
    sendJsonToServer();
    // checkSoundPath();
    $("#settingsModal").modal("hide");
    // processNextPage();
  });

  saveSendIconButton2.off("click").on("click", function (e) {
    // saveIcon();
    sendJsonToServer();
    // processNextPage();
    // checkSoundPath();
    $("#settingsModal").modal("hide");
  });

  
  cloneButton.on('click', function() {
    $("#settingsModal").modal("hide");
    cloneIconFull(currentIcon);
  });    


function cloneIconFull(sourceIcon) {
    // Kiểm tra nếu sourceIcon là null hoặc undefined thì không làm gì
    if (!sourceIcon) {
        console.warn('Source icon is invalid, cannot clone');
        return;
    }

    // Clone tất cả attributes
    const attrs = { ...sourceIcon.getAttrs() };
    
    // Tính toán vị trí dưới góc phải của icon gốc
    const offsetX = sourceIcon.width(); // Đặt clone icon bên phải icon gốc
    const offsetY = sourceIcon.height(); // Đặt clone icon bên dưới icon gốc
    
    // Điều chỉnh vị trí
    attrs.x += offsetX;
    attrs.y += offsetY;
    
    // Tạo icon mới với cùng image
    const newIcon = new Konva.Image({
        ...attrs,
        listening: true  // Đảm bảo có thể tương tác
    });

    // Copy image từ icon gốc
    newIcon.image(sourceIcon.image());

    // Copy tất cả custom attributes
    const customAttrs = sourceIcon.getAttrs();
    Object.keys(customAttrs).forEach(key => {
        if (key.startsWith('_') || ['id', 'name'].includes(key)) {
            // Bỏ qua các thuộc tính đặc biệt
            return;
        }
        newIcon.setAttr(key, customAttrs[key]);
    });

    // SET THUỘC TÍNH SOUND THÀNH "clone"
    const sound = sourceIcon.getAttr("sound");
    const soundNum = Number(sound);
    const newSound = !isNaN(soundNum) ? soundNum + 1 : sound + "xx";
    newIcon.setAttr("sound", newSound);

    // Thêm vào layer trước khi tạo transformer
    iconLayer.add(newIcon);
    playIcons.push(newIcon);

    // TẠO TRANSFORMER MỚI CHO ICON CLONE - ĐÂY LÀ PHẦN QUAN TRỌNG
    createTransformerForIcon(newIcon);

    // Áp dụng crop
    applyCrop(newIcon, newIcon.getAttr('lastCropUsed') || 'center-middle');

    // THÊM EVENT LISTENERS SAU KHI ĐÃ CÓ TRANSFORMER
    function handleClick() {
        console.log("newIcon: handleClick");
        hideAllTransformers();
        setSelectedIcon(newIcon);
        currentIcon = newIcon;
        updateIconControls(newIcon);
        showTransformerForIcon(newIcon);
        showModal(is_move_icon); // bật(xanh) thì show và không copy                
    }

    // newIcon.on("dblclick", handleDoubleClick);
    // newIcon.on("dbltap", handleDoubleClick); // Cho mobile


    newIcon.on("click", handleClick);
    newIcon.on("touchend", handleClick);

    newIcon.on("mouseover", function () {
        document.body.style.cursor = "pointer";
    });
    newIcon.on("mouseout", function () {
        document.body.style.cursor = "default";
    });

    newIcon.on('dragmove', () => {
        const transformer = iconTransformers.get(newIcon);
        if (transformer) {
            transformer.forceUpdate();
        }
    });

    iconLayer.batchDraw();
    return newIcon;
}

  // ========== JSON FUNCTIONS ==========
  function sendJsonToServer() {
    const backgroundSize = {
      width: backgroundImage.width(),
      height: backgroundImage.height(),
    };

    const fileName = getFileNameFromUrl(backgroundImage.image().src);
    const jsonData = {
      background: fileName,
      icons: playIcons.map((icon) => ({
        x: (icon.x() - backgroundImage.x()) / backgroundSize.width,
        y: (icon.y() - backgroundImage.y()) / backgroundSize.height,
        sound: icon.getAttr("sound"),
        width: icon.width() / backgroundSize.width,        // LƯU TỈ LỆ
        height: icon.height() / backgroundSize.height,     // LƯU TỈ LỆ
        icon_type: icon.getAttr("icon_type"),
        icon_opacity: 0.1,
        // icon_opacity: icon.getAttr("icon_opacity"),
      })),
      backgroundSize: backgroundSize,
    };

    const saveFileName = $("#json-dropdown").val() + ".json";
    const dataToSend = {
      file_name: saveFileName,
      folder_name: SAVE_FOLDER,
      json: JSON.stringify(jsonData),
    };

    fetch(SERVER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dataToSend),
    })
      .then((response) => response)
      .then((data) => {
        console.log("Success:", data);
        alert("JSON data sent successfully!");
        $("#settingsModal").modal("hide");
      })
      .catch((error) => {
        console.log("Error:", error);
        alert("Failed to send JSON data.");
      });
  }

  saveJsonButton.off("click").on("click", function (e) {
    e.preventDefault();
    e.stopPropagation();

    if (!backgroundImage) return false;

    const backgroundSize = {
      width: backgroundImage.width(),
      height: backgroundImage.height(),
    };

    const fileName = getFileNameFromUrl(backgroundImage.image().src);
    const jsonData = {
      background: fileName,
      icons: playIcons.map((icon) => ({
        x: (icon.x() - backgroundImage.x()) / backgroundSize.width,
        y: (icon.y() - backgroundImage.y()) / backgroundSize.height,
        sound: icon.getAttr("sound"),
        width: icon.width(),
        height: icon.height(),
        icon_type: icon.getAttr("icon_type"),
        icon_opacity: icon.getAttr("icon_opacity"),
      })),
      backgroundSize: backgroundSize,
    };

    const saveFileName = ($("#json-dropdown").val() || "config") + ".json";
    const payload = {
      file_name: saveFileName,
      folder_name: SAVE_FOLDER,
      json: JSON.stringify(jsonData),
    };

    fetch(SERVER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then((resp) => {
        if (!resp.ok) throw new Error("Server error " + resp.status);
        return resp.json();
      })
      .then((j) => {
        console.log("Server response", j);
        if (j.ok) {
          alert("Lưu thành công: " + j.path);
        } else {
          alert("Lưu thất bại: " + j.message);
        }
        $("#settingsModal").modal("hide");
        return false;
      })
      .catch((err) => {
        console.error("Save failed", err);
        alert("Lỗi khi lưu: " + err.message);
      });

    return false;
  });

  // ========== OTHER FUNCTIONS ==========
  function checkSoundPath() {
    playIcons.forEach((icon, index) => {
      const sound = icon.getAttr("sound") || "";
      if ("" == sound) {
         icon.setAttrs({
            strokeWidth: 2,
            stroke : "red",
          });
      } else {
        icon.setAttrs({
            strokeWidth: 2,
            stroke : "blue",
        });
      }
    });

    iconLayer.batchDraw();
  }

  function popDropdown(dropdown, text, start, end) {
    dropdown.empty();
    for (var i = start; i <= end; i++) {
      var option = $("<option>", {
        value: i,
        text: text + " " + i,
      });
      if (i === start) {
        option.prop("selected", true);
      }
      dropdown.append(option);
    }
  }

  function processNextPage() {
    CURRENT_PAGE_INDEX = CURRENT_PAGE_INDEX + 1;
    if (CURRENT_PAGE_INDEX > MAX_PAGE_NUM) {
      CURRENT_PAGE_INDEX = 1;
    }
    $("#json-dropdown").val(CURRENT_PAGE_INDEX).change();
  }

  // ========== INITIALIZATION ==========
  popDropdown($("#json-dropdown"), "Page", MIN_PAGE_NUM, MAX_PAGE_NUM);
  popDropdown($("#image-dropdown"), "Image", MIN_PAGE_NUM, MAX_PAGE_NUM);
   $("#json-dropdown").val(CURRENT_PAGE_INDEX).change();
  loadPage();

  // $("#settingsModal").on("show.bs.modal", function () {
  //   const iconNode = currentIcon || playIcons?.[0];
  //   const val = iconNode?.getAttr("sound") || "";
  //   if (!val) {
  //     currentSoundNum = currentSoundNum + 1;
  //   }
  //   $("#icon-sound-url").val(val || currentSoundNum);
  // });

  // Other event listeners
  $("#json-dropdown").change(function () {
    loadPage();
  });

  $("#image-dropdown").change(function () {
    var selectedImage = $("#image-dropdown").val();
    if (selectedImage) {
      loadBackgroundImage(selectedImage);
    }
  });

  $("#move-icon").on("click", function () {
    is_move_icon = !is_move_icon;
    $(this)
      .toggleClass("btn-success", is_move_icon)
      .toggleClass("btn-dark", !is_move_icon);
  });

  previous_page.on("click", function () {
    CURRENT_PAGE_INDEX = CURRENT_PAGE_INDEX - 1;
    if (CURRENT_PAGE_INDEX < 1) {
      CURRENT_PAGE_INDEX = MAX_PAGE_NUM;
    }
    $("#json-dropdown").val(CURRENT_PAGE_INDEX).change();
  });

  next_page.on("click", function () {
    processNextPage();
  });

  $("#clearButton").on("click", function () {
    clearCanvas();
  });

  $("#send-json").click(function () {
    sendJsonToServer();
  });

  window.addEventListener("beforeunload", function (event) {
    event.preventDefault();
    event.returnValue = "";
    return "Bạn có chắc chắn muốn rời khỏi trang? Các thay đổi chưa lưu sẽ bị mất.";
  });

  window.addEventListener("resize", loadPage);
});