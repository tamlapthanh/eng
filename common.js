
    let ICON_VIDEO         = "assets/video_icon.png";
    let ICON_AUDIO         = "assets/audio_icon.png";
    let ICON_PLAYING       = "assets/playing_icon.svg";

    // basic app config mirrored from your original index.js
  const ASSETS_URL ="https://tamlapthanh.github.io/store_images/";
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
    get PATH_VIDEO() {
      return ASSETS_URL + PATH_ROOT + DATA_TYPE + "/video/";
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


    function createRadioButtons(defaultIndex  = 0) {
        const options = [
            { id: 'radio_student_37_book', data_type: 'student37', label: 'Student book 37',  max: 107, min: 1, current: 2 }, // 0
            { id: 'radio_work_37_book', data_type: 'work37', label: 'Work book 37' , max: 97, min: 1, current: '1' }, // 1
            { id: 'radio_btbt_37_book', data_type: 'btbt37', label: 'BTBT 3' , max: 140, min: 1, current: '1' }, // 2
            { id: 'radio_student_book', data_type: 'student', label: 'Student book 27' , max: 66, min: 1, current: 1 }, // 3
            { id: 'radio_work_book', data_type: 'work', label: 'Workbook 27' , max: 65, min: 1, current: 1 }, // 4
            { id: 'radio_dict_book', data_type: 'dict', label: 'Dictionary' , max: 87, min: 1, current: 2 }, // 5
            { id: 'radio_math', data_type: 'math_page', label: 'Math Game' }, // 6
        ];
        
        const container = document.getElementById('radioContainer');
        
        let idx = 0;
        let data_type = "student37";
        let current = 1;
        let max = 107;
        let min = 1;
        let checkedVal = false;        

        options.forEach(option => {
            if (defaultIndex == idx) {
                data_type = option.data_type;
                current = option.current;
                max = option.max;
                min = option.min;
                checkedVal = true;
            } else {
                checkedVal = false;
            }
            const divElement = document.createElement('div');
            divElement.className = 'form-check me-3';
            
            const inputElement = document.createElement('input');
            inputElement.className = 'form-check-input';
            inputElement.type = 'radio';
            inputElement.name = 'options';
            inputElement.id = option.id + '_1';
            inputElement.value = option.data_type;
            inputElement.checked = checkedVal;
             // Adding custom attributes
            inputElement.setAttribute('data-current-page-index', option.current);
            inputElement.setAttribute('data-max-page-num',  option.max);
            inputElement.setAttribute('data-min-page-num', option.min);
            
            const labelElement = document.createElement('label');
            labelElement.className = 'form-check-label';
            labelElement.htmlFor = option.id + '_1';
            labelElement.textContent = option.label;
            
            divElement.appendChild(inputElement);
            divElement.appendChild(labelElement);
            container.appendChild(divElement);
            idx = idx + 1 ;
        });

        return [data_type, current, max, min];
    }


    function showToast(message, type = 'success') {
        let toastContainer = document.querySelector('.toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.classList.add('toast-container', 'position-fixed', 'top-50', 'start-50', 'translate-middle');
            document.body.appendChild(toastContainer);
        }

        const toast = document.createElement('div');
        toast.classList.add('toast', 'fade'); // Giữ fade
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'assertive');
        toast.setAttribute('aria-atomic', 'true');
        toast.setAttribute('data-bs-autohide', 'true');
        toast.setAttribute('data-bs-delay', '1500');

        const toastHeader = document.createElement('div');
        toastHeader.classList.add('toast-header');
        toastHeader.innerHTML = `
        <strong class="me-auto">Thông báo</strong>
        <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
    `;

        const toastBody = document.createElement('div');
        toastBody.classList.add('toast-body');
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

        toast.addEventListener('hidden.bs.toast', () => {
            toast.remove();
        });
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

    function isUnLockStage() {
        if ($('#lock-icon').hasClass('bi-unlock-fill')) {
            console.log('The lock button is in the unlocked state (bi-unlock-fill).');
            return false;
        } else {
            console.log('The lock button is in the locked state (bi-lock-fill).');
            return true;
        }

        
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

    function removeLine(arr, element) {
        return arr.filter(item => item !== element);
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
  


