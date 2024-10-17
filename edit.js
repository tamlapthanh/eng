$(document).ready(function () {

    let PATH_ROOT = "assets/books/27/student";
    let CURRENT_PAGE_INDEX = 4;
    let MAX_PAGE_NUM = 66;
    let MIN_PAGE_NUM = 4;

    // let PATH_ROOT = "assets/books/27/work";
    // let CURRENT_PAGE_INDEX = 1;
    // let MAX_PAGE_NUM = 65;
    // let MIN_PAGE_NUM = 1;

    let SERVER_URL = "http://localhost:8080/api/save-json";
    const SAVAE_FOLDER = "D:/Working/Study/KHoi/zizi/english27/" + PATH_ROOT + "/data/";

    const global_const = {
        get PATH_ASSETS_IMG() {
            //   PATH_ASSETS_IMG = "assets/img/";
            return PATH_ROOT + "/img/";
        },
        get PATH_IMG() {
            //  PATH_IMG = "assets/img/X.webp";
            return PATH_ROOT + "/img/X.webp";
        },
        get PATH_SOUND() {
            //  PATH_SOUND = "assets/sound/student/";
            return PATH_ROOT + "/sound/";
        },
        get PATH_JSON() {
            //  PATH_JSON = "assets/data/X.json";
            return PATH_ROOT + "/data/X.json";
        }
    };




    const stage = new Konva.Stage({
        container: 'canvas',
        width: window.innerWidth,
        height: window.innerHeight,
    });
    

    const backgroundLayer = new Konva.Layer();
    const iconLayer = new Konva.Layer();
    stage.add(backgroundLayer);
    stage.add(iconLayer);

    //const imageDropdown = $('#imageDropdown');
    const imageFileInput = $('#upload-image');
    // const addIconButton = $('#add-icon');
    // const jsonDropdown = $('#json-dropdown');
    const iconSoundUrlInput = $('#icon-sound-url');
    const iconXInput = $('#icon-x');
    const iconYInput = $('#icon-y');
    const playIconButton = $('#play-icon');
    const saveIconButton = $('#save-icon');
    const saveJsonButton = $('#save-json');

    const previous_page = $('#previous_page');
    const next_page = $('#next_page');


    let backgroundImage = null;
    let playIcons = [];
    let currentIcon = null;
    let audio = null;



    function getSoundStartEnd(fileName) {
        var arr = fileName.split("/");
        if (arr.length > 1) {
          return [ arr[0], arr[1], arr[2] ];
        }
    
        return arr ;
      }
      function playSound(soundFileName, icon) {
        
        
    
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
                    }
                });
            } else {
                audio.addEventListener("ended", (event) => {
                    console.log("addEventListener ended");
                    

                });
            }
    
            // Phát âm thanh nếu không có lỗi
            audio.play().then(() => {
                
            }).catch(error => {
                console.error('Playback failed:', error);
            });
        }
    }

    function addPlayIcon(x, y, sound) {
        icon_size = 18;
        Konva.Image.fromURL('assets/play_icon.png', function (icon) {
            icon.setAttrs({
                x: x || (stage.width() - 150),
                y: y || Math.random() * (stage.height() - 50),
                width: icon_size,
                height: icon_size,
            });

            icon.setAttr('sound', sound || '');
            icon.draggable(true);

            function handleInteraction() {
                currentIcon = icon;
                iconSoundUrlInput.val(icon.getAttr('sound') || '');
                iconXInput.val(icon.x());
                iconYInput.val(icon.y());
                $('#settingsModal').modal('show');
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
            iconLayer.batchDraw();
        });
    }


    $('.add-icon').on('click', function () {
        var max = parseInt($(this).data('param'), 10);
        for (var i = 0; i < max; i++) {
            addPlayIcon();
        }
    });

    function loadJsonBackgroundAndIcons(data) {
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
            };
            imageObj.src = global_const.PATH_ASSETS_IMG + data.background;
        }
    }

    // Đảm bảo gọi adjustBackgroundImage khi tải hình ảnh mới
    imageFileInput.change(function () {
        clearCanvas();
        const file = this.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function (e) {
                const imageObj = new Image();
                imageObj.onload = function () {
                    if (backgroundImage) backgroundImage.destroy();
                    adjustBackgroundImage(imageObj);
                };
                imageObj.src = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    });

    function loadPage() {
        clearCanvas();
        CURRENT_PAGE_INDEX = parseInt($('#json-dropdown').val(), 10);

        if (CURRENT_PAGE_INDEX) {
            const urlJson = global_const.PATH_JSON.replace("X", CURRENT_PAGE_INDEX);
            fetch(urlJson)
                .then(response => response.json())
                .then(data => {
                    backgroundLayer.clear();
                    iconLayer.clear();
                    loadJsonBackgroundAndIcons(data);
                })
                .catch(error => console.error('Error loading JSON:', error));
        } else {
            CURRENT_PAGE_INDEX = 1;
            loadPage();
        }
        $('#settingsModal').modal('hide');
        fitStageIntoParentContainer();
    }

    $('#json-dropdown').change(function () {
        loadPage();
    });

    $('#image-dropdown').change(function () {
        var selectedImage = $('#image-dropdown').val();
        if (selectedImage) {
            loadBackgroundImage(selectedImage);
        }
    });

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

    $('#delete-icon').on('click', function () {
        if (currentIcon) {
            // Xóa biểu tượng khỏi danh sách và từ layer
            const index = playIcons.indexOf(currentIcon);
            if (index > -1) {
                playIcons.splice(index, 1);
            }
            currentIcon.destroy();
            iconLayer.batchDraw();

            // Reset các giá trị trong modal sau khi xóa
            iconSoundUrlInput.val('');
            currentIcon = null;

            $('#settingsModal').modal('hide');
        }
    });

    playIconButton.on('click', function () {
        playSound(iconSoundUrlInput.val());
    });

    saveIconButton.on('click', function () {
        if (currentIcon) {
            currentIcon.setAttrs({
                x: parseFloat(iconXInput.val()) || currentIcon.x(),
                y: parseFloat(iconYInput.val()) || currentIcon.y(),
                sound: iconSoundUrlInput.val()
            });
            iconLayer.batchDraw();
           // $('#settingsModal').modal('hide');
        }
    });


    saveJsonButton.on('click', function () {
        if (!backgroundImage) return;

        const backgroundSize = {
            width: backgroundImage.width(),
            height: backgroundImage.height(),
        };

        const data = {
            background: backgroundImage.image().src.replace(global_const.PATH_ASSETS_IMG, ""),
            icons: playIcons.map(icon => ({
                x: (icon.x() - backgroundImage.x()) / backgroundSize.width,
                y: (icon.y() - backgroundImage.y()) / backgroundSize.height,
                sound: icon.getAttr('sound')
            })),
            backgroundSize: backgroundSize // Lưu kích thước hình nền hiện tại
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        var saveFileName = $('#json-dropdown').val() + ".json";
        $('<a></a>')
            .attr('href', url)
            .attr('download', saveFileName)
            .appendTo('body')[0].click();
    });


    // Hàm để xóa tất cả các play icon và làm lại từ đầu, bao gồm cả hình nền
    function clearCanvas() {
        if (audio)
            audio.pause();
        // Xóa tất cả các play icons
        playIcons.forEach(function (icon) {
            icon.destroy();  // Xóa biểu tượng khỏi layer
        });
        playIcons = [];  // Xóa danh sách biểu tượng
        iconLayer.destroyChildren();
        iconLayer.batchDraw();  // Vẽ lại layer để cập nhật sự thay đổi

        // Xóa hình nền
        backgroundLayer.destroyChildren();  // Xóa tất cả các thành phần trên backgroundLayer
        backgroundLayer.draw();  // Vẽ lại để cập nhật sự thay đổi

        // Thiết lập lại kích thước canvas nếu cần
        fitStageIntoParentContainer();  // Đảm bảo canvas phù hợp với kích thước mới

        // Nếu cần reset thêm gì đó như là dữ liệu hay trạng thái thì thêm vào đây
    }

    // Thêm sự kiện cho nút Clear
    function addClickAndTouchEvents(element, handler) {
        element.on('click', handler);
        element.on('touchend', handler);
    }

    function loadBackgroundImage(imageUrl) {
        clearCanvas();
        const imageObj = new Image();
        imageObj.onload = function () {
            if (backgroundImage) backgroundImage.destroy();
            adjustBackgroundImage(imageObj);
        };
        imageUrl = global_const.PATH_IMG.replace("X", imageUrl);
        imageObj.src = imageUrl;
    }

    function populateDropdown(dropdown, dataFileName) {

        $.ajax({
            url: dataFileName,
            dataType: 'json',
            success: function (data) {
                // Iterate over the items and append them to the dropdown
                $.each(data.items, function (key, value) {
                    $(dropdown).append($('<option></option>').attr('value', value.id).text(value.name));
                });
            },
            error: function (jqXHR, textStatus, errorThrown) {
                console.error("Failed to load JSON data: " + textStatus, errorThrown);
            }
        });
    }

    function popDropdown(dropdown, text, start, end) {
        dropdown.empty();
        // Add options dynamically
        for (var i = start; i <= end; i++) {
            var option = $('<option>', {
                value: i,
                text: text + " " + i
            });

            // Set the default selected option
            if (i === start) {
                option.prop('selected', true);
            }

            dropdown.append(option);
        }

    }

    previous_page.on('click', function () {
        CURRENT_PAGE_INDEX = CURRENT_PAGE_INDEX - 1;
        if (CURRENT_PAGE_INDEX < 1) {
            CURRENT_PAGE_INDEX = MAX_PAGE_NUM;
        }
        $('#json-dropdown').val(CURRENT_PAGE_INDEX).change();
        // loadPage();
    });

    next_page.on('click', function () {
        CURRENT_PAGE_INDEX = CURRENT_PAGE_INDEX + 1;
        if (CURRENT_PAGE_INDEX > MAX_PAGE_NUM) {
            CURRENT_PAGE_INDEX = 1;
        }
        $('#json-dropdown').val(CURRENT_PAGE_INDEX).change();
        // loadPage();
    });

    $('#clearButton').on('click', function () {
        clearCanvas();
    });

    $('#jump-to-index-jso').on('change', function () {
        var inputValue = $(this).val();
        $('#json-dropdown').val(inputValue).change();
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
        const jsonData = {
            background: fileName,
            icons: playIcons.map(icon => ({
                x: (icon.x() - backgroundImage.x()) / backgroundSize.width,
                y: (icon.y() - backgroundImage.y()) / backgroundSize.height,
                sound: icon.getAttr('sound')
            })),
            backgroundSize: backgroundSize
        };

        console.log('Data to send:', JSON.stringify(jsonData, null, 2)); // Kiểm tra dữ liệu trước khi gửi


        const saveFileName = $('#json-dropdown').val() + ".json";

        // Tạo đối tượng dữ liệu JSON
        const dataToSend = {
            file_name: saveFileName,
            save_folder: SAVAE_FOLDER,
            json: JSON.stringify(jsonData) // Chuyển đổi đối tượng thành chuỗi JSON
        };

        fetch(SERVER_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(dataToSend)
        })
            .then(response => response)
            .then(data => {
                console.log('Success:', data);
                alert('JSON data sent successfully!');
            })
            .catch(error => {
                console.log('Error:', error);
                alert('Failed to send JSON data.');
            });
    }





    // Event listener for the "Send JSON to Server" button
    $('#send-json').click(function () {
        sendJsonToServer();
    });

    // Load page 1
    // populateDropdown(jsonDropdown, "/assets/page.json");
    // populateDropdown(imageDropdown, "/assets/img.json");

    popDropdown($('#json-dropdown'), "Page", 4, MAX_PAGE_NUM);
    popDropdown($('#image-dropdown'), "Image", 4, MAX_PAGE_NUM)

    loadPage();

});