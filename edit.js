$(document).ready(function () {

    let PATH_ROOT = "assets/books/27/";
        
    // let DATA_TYPE = "student"
    // let CURRENT_PAGE_INDEX = 4;
    // let MAX_PAGE_NUM = 66;
    // let MIN_PAGE_NUM = 4;

    // let DATA_TYPE = "work"
    // let CURRENT_PAGE_INDEX = 1;
    // let MAX_PAGE_NUM = 65;
    // let MIN_PAGE_NUM = 1;

    // let DATA_TYPE = "student37"
    // let CURRENT_PAGE_INDEX = 5;
    // let MAX_PAGE_NUM = 107;
    // let MIN_PAGE_NUM = 5;


    let DATA_TYPE = "dict"
    let CURRENT_PAGE_INDEX = 1;
    let MAX_PAGE_NUM = 87;
    let MIN_PAGE_NUM = 1;

    

    let SERVER_URL = "http://localhost:8080/api/file/save-json";
    // const SAVAE_FOLDER = "D:/Working/Study/KHoi/zizi/english27/" + PATH_ROOT + "/data/";
    const SAVAE_FOLDER = DATA_TYPE + "/data/";

    const global_const = {
        get PATH_ASSETS_IMG() {
            //   PATH_ASSETS_IMG = "assets/img/";
            return PATH_ROOT + DATA_TYPE +  "/img/";
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
    const saveSendIconButton = $('#save-icon-send');    
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
            return [arr[0], arr[1], arr[2]];
        }
        return [arr[0]]; // Chỉ trả về tên file
    }

    function playSound(soundFileName, icon) {
        if (soundFileName && "x" != soundFileName.trim()) {
            const [fileName, start, end] = getSoundStartEnd(soundFileName);
            console.log(fileName, start, end);

            let url = global_const.PATH_SOUND + fileName.trim() + (fileName.trim().endsWith('.mp3') ? '' : '.mp3');

            // Kiểm tra và dừng âm thanh nếu đang phát
            if (audio && !audio.paused) {
                audio.pause();
                audio.currentTime = 0;
            }

            // Tạo đối tượng âm thanh mới
            audio = new Audio(url);

            // Chỉ set currentTime và timeupdate listener nếu có start time
            if (start !== undefined && start !== null && start !== '') {
                audio.addEventListener('loadedmetadata', () => {
                    audio.currentTime = parseFloat(start);

                    // Chỉ theo dõi timeupdate nếu có end time
                    if (end !== undefined && end !== null && end !== '') {
                        const endTime = parseFloat(end);
                        audio.addEventListener('timeupdate', () => {
                            if (audio.currentTime >= endTime) {
                                console.log("addEventListener timeupdate - reached end time");
                                if (!audio.paused) {
                                    audio.pause();
                                    audio.currentTime = 0;
                                }
                            }
                        });
                    }
                });
            } else {
                // Nếu chỉ có tên file, phát toàn bộ
                audio.addEventListener("ended", (event) => {
                    console.log("addEventListener ended - full audio completed");
                });
            }

            // Phát âm thanh
            audio.play().then(() => {
                console.log("Audio playback started");
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

    function checkSoundPath() {
        // Kiểm tra tất cả icon trong playIcons và thay đổi hình ảnh nếu sound rỗng
        playIcons.forEach((icon, index) => {
            const sound = icon.getAttr('sound') || '';
            const imageUrl = (!sound || sound.trim() === '') ? 'assets/music_icon.svg' : 'assets/play_icon.png';

            // Nếu cần thay đổi icon
            if (imageUrl !== icon.image().src) {
                Konva.Image.fromURL(imageUrl, function (newImage) {
                    newImage.setAttrs({
                        x: icon.x(),
                        y: icon.y(),
                        width: icon.width(),
                        height: icon.height(),
                        sound: sound,
                        draggable: true
                    });

                    // Gắn lại các sự kiện cho icon mới
                    newImage.on('click', function () {
                        currentIcon = newImage;
                        iconSoundUrlInput.val(newImage.getAttr('sound') || '');
                        iconXInput.val(newImage.x());
                        iconYInput.val(newImage.y());
                        $('#settingsModal').modal('show');
                    });
                    newImage.on('touchend', function () {
                        currentIcon = newImage;
                        iconSoundUrlInput.val(newImage.getAttr('sound') || '');
                        iconXInput.val(newImage.x());
                        iconYInput.val(newImage.y());
                        $('#settingsModal').modal('show');
                    });
                    newImage.on('mouseover', function () {
                        document.body.style.cursor = 'pointer';
                    });
                    newImage.on('mouseout', function () {
                        document.body.style.cursor = 'default';
                    });

                    // Thay thế icon cũ bằng icon mới trong playIcons và layer
                    playIcons[index] = newImage;
                    icon.destroy();
                    iconLayer.add(newImage);
                    iconLayer.batchDraw();
                });
            }
        });
    }

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


    // Thêm sự kiện beforeunload để hiển thị confirm khi reload hoặc rời khỏi trang
    window.addEventListener('beforeunload', function (event) {
        // Hiển thị thông báo xác nhận
        event.preventDefault(); // Ngăn hành động mặc định (tùy thuộc vào trình duyệt)
        event.returnValue = ''; // Yêu cầu trình duyệt hiển thị hộp thoại xác nhận
        return 'Bạn có chắc chắn muốn rời khỏi trang? Các thay đổi chưa lưu sẽ bị mất.';
    });

    window.addEventListener('resize', loadPage);

    $('#setting').on('click', function () {
        const controls = document.querySelector('.controls');
        if (controls.style.display === 'none' || controls.style.display === '') {
        controls.style.display = 'flex';
        } else {
        controls.style.display = 'none';
        toggleDrawIcon(true);
        }

    });    

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

            //$('#settingsModal').modal('hide');
        }
    });

    playIconButton.on('click', function () {
        saveIcon();
        playSound(iconSoundUrlInput.val());
    });

    saveSendIconButton.off('click').on('click', function (e) {
        saveIcon();
        sendJsonToServer();
        checkSoundPath();
        $('#settingsModal').modal('hide');
    });

    function saveIcon() {
        // Lưu màu ban đầu của nút
        const originalBackgroundColor = saveIconButton.css('background-color');
        
        // Thay đổi màu nút trước khi thực thi (ví dụ: màu xám)
        saveIconButton.css('background-color', '#cccccc'); // Màu xám, bạn có thể thay đổi màu khác
        
        if (currentIcon) {
            currentIcon.setAttrs({
                x: parseFloat(iconXInput.val()) || currentIcon.x(),
                y: parseFloat(iconYInput.val()) || currentIcon.y(),
                sound: iconSoundUrlInput.val()
            });
            iconLayer.batchDraw();
        }

        // Hoàn lại màu ban đầu sau khi lưu
        saveIconButton.css('background-color', originalBackgroundColor);
    }

    saveIconButton.off('click').on('click', function (e) {
        //$('#settingsModal').modal('hide');
        // alert('Lưu thành công: ' + iconSoundUrlInput.val());
        saveIcon();
        checkSoundPath();
        $('#settingsModal').modal('hide');
    });

    saveJsonButton.off('click').on('click', function (e) {
        e.preventDefault();
        e.stopPropagation();

        if (!backgroundImage) return false;

        const backgroundSize = {
            width: typeof backgroundImage.width === 'function' ? backgroundImage.width() : backgroundImage.width,
            height: typeof backgroundImage.height === 'function' ? backgroundImage.height() : backgroundImage.height,
        };

        const fileName = (backgroundImage && backgroundImage.image && typeof backgroundImage.image === 'function' && backgroundImage.image())
            ? getFileNameFromUrl(backgroundImage.image().src)
            : 'background';

        const jsonData = {
            background: fileName,
            icons: (Array.isArray(playIcons) ? playIcons : []).map(icon => ({
                x: ((typeof icon.x === 'function' ? icon.x() : icon.x) - (typeof backgroundImage.x === 'function' ? backgroundImage.x() : backgroundImage.x)) / (backgroundSize.width || 1),
                y: ((typeof icon.y === 'function' ? icon.y() : icon.y) - (typeof backgroundImage.y === 'function' ? backgroundImage.y() : backgroundImage.y)) / (backgroundSize.height || 1),
                sound: (typeof icon.getAttr === 'function' ? (icon.getAttr('sound') || '') : (icon.sound || ''))
            })),
            backgroundSize
        };

        const saveFileName = ($('#json-dropdown').val() || 'config') + '.json';

        const payload = {
            file_name: saveFileName,
            folder_name: SAVAE_FOLDER,
            json: JSON.stringify(jsonData)
        };

        fetch(SERVER_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
            .then(resp => {
                if (!resp.ok) throw new Error('Server error ' + resp.status);
                return resp.json();
            })
            .then(j => {
                console.log('Server response', j);
                if (j.ok) {
                    alert('Lưu thành công: ' + j.path);
                } else {
                    alert('Lưu thất bại: ' + j.message);
                }
                $('#settingsModal').modal('hide');
                return false;
            })
            .catch(err => {
                console.error('Save failed', err);
                alert('Lỗi khi lưu: ' + err.message);
            });

         
        return false;
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
            folder_name: SAVAE_FOLDER,
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
                 $('#settingsModal').modal('hide');
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

    popDropdown($('#json-dropdown'), "Page", MIN_PAGE_NUM, MAX_PAGE_NUM);
    popDropdown($('#image-dropdown'), "Image", MIN_PAGE_NUM, MAX_PAGE_NUM)

    loadPage();

});