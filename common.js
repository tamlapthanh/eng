    function createRadioButtons(defaultIndex  = 0) {
        const container = document.getElementById('radioContainer');
        
        let idx = 0;
        let data_type = "student37";
        let current = 1;
        let max = 107;
        let min = 1;
        let checkedVal = false;        
        let assetUrl = "";
        let fetchInfo = false;

        OPTIONS_ARRAY.forEach(option => {
            if (defaultIndex == idx) {
                data_type = option.data_type;
                current = option.current;
                max = option.max;
                min = option.min;
                fetchInfo = option.fetch ? true : false;
                checkedVal = true;
                assetUrl = getLinkByType(data_type);
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
            inputElement.setAttribute('data-fetch', option.fetch ? true : false);
            
            const labelElement = document.createElement('label');
            labelElement.className = 'form-check-label';
            labelElement.htmlFor = option.id + '_1';
            labelElement.textContent = option.label;
            
            divElement.appendChild(inputElement);
            divElement.appendChild(labelElement);
            container.appendChild(divElement);
            idx = idx + 1 ;
        });

        return [data_type, current, max, min, assetUrl, fetchInfo];
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

    function isMobile() {
      const ret = isNotMobile() 
      return !ret;
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

  function showColorisPopup(textNode) {
  // remove old popup if exists
  const old = document.getElementById('coloris-popup');
  if (old) old.remove();

  const wrapper = document.createElement('div');
  wrapper.id = 'coloris-popup';
  wrapper.style.position = 'fixed';
  wrapper.style.left = '50%';
  wrapper.style.top = '50%';
  wrapper.style.transform = 'translate(-50%, -50%)';
  wrapper.style.background = '#fff';
  wrapper.style.padding = '16px';
  wrapper.style.borderRadius = '8px';
  wrapper.style.boxShadow = '0 4px 20px rgba(0,0,0,0.2)';
  // wrapper.style.zIndex = '2147483647';
  wrapper.style.display = 'flex';
  wrapper.style.flexDirection = 'column';
  wrapper.style.alignItems = 'center';
  wrapper.style.gap = '10px';

  const label = document.createElement('label');
  label.textContent = 'Select Color:';
  label.style.fontWeight = '600';
  wrapper.appendChild(label);

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'coloris instance1';
  input.value = textNode.fill ? (textNode.fill().toString() || '#000000') : '#000000';
  input.style.width = '120px';
  input.dataset.target = "app";
  wrapper.appendChild(input);

  const row = document.createElement('div');
  row.style.display = 'flex';
  row.style.gap = '8px';
  row.style.marginTop = '6px';
  wrapper.appendChild(row);

 


const deleteBtn = document.createElement('button');
deleteBtn.innerHTML = `<i class="bi bi-trash3"></i> Delete`; // thêm icon
deleteBtn.style.display = 'flex';
deleteBtn.style.alignItems = 'center';
deleteBtn.style.gap = '6px';
deleteBtn.style.padding = '6px 12px';
deleteBtn.style.border = '1px solid #d9534f';
deleteBtn.style.background = '#d9534f';
deleteBtn.style.color = '#fff';
deleteBtn.style.cursor = 'pointer';
deleteBtn.style.borderRadius = '6px';
deleteBtn.addEventListener('click', (ev) => {
    ev.stopPropagation();    
    try {
      // remove any Transformer nodes attached to this textNode
      try {
        const transformers = iconLayer.find('Transformer');
        transformers.forEach(tr => {
          try {
            if (tr.node && tr.node() === textNode) {
              tr.destroy();
            }
          } catch (e) {}
        });
      } catch (e) {}

      // remove container dblclick handler if attached
      try {
        if (textNode._containerDbl && stage && stage.container) {
          try { stage.container().removeEventListener('dblclick', textNode._containerDbl, true); } catch(e) {}
        }
      } catch (e) {}

      // destroy the text node
      try { textNode.destroy(); } catch (e) { console.warn('destroy textNode err', e); }

      // redraw layer
      try { iconLayer.batchDraw(); } catch (e) {}

    } catch (err) {
      console.warn('Failed to delete textNode', err);
    } finally {
      // close popup
      wrapper.remove();
    }
  }, { passive: false });
  row.appendChild(deleteBtn);

   const closeBtn = document.createElement('button');
  closeBtn.innerHTML = `<i class="bi bi-x-circle"></i> Close`; // thêm icon
  closeBtn.style.display = 'flex';
  closeBtn.style.alignItems = 'center';
  closeBtn.style.gap = '6px';
  closeBtn.style.padding = '6px 12px';
  closeBtn.style.border = '1px solid #ddd';
  closeBtn.style.background = '#f5f5f5';
  closeBtn.style.cursor = 'pointer';
  closeBtn.style.borderRadius = '6px';
  closeBtn.addEventListener('click', () => wrapper.remove(), { passive: false });
  row.appendChild(closeBtn);

  document.body.appendChild(wrapper);

  // initialize Coloris
  Coloris({
    el: '.coloris.instance1',
    themeMode: 'light',
    swatches: [
      '#000000', '#444444', '#7f8c8d', '#c0392b', '#e74c3c', '#ff6b6b',
      '#f39c12', '#f1c40f', '#27ae60', '#2ecc71', '#2980b9', '#3498db',
      '#8e44ad', '#9b59b6', '#ffffff'
    ],
    onChange: (color, inputEl) => {
      if (!inputEl) return;

      // lấy data-target từ input
      const target = inputEl.dataset.target;
    
      if (target === "app") {
       console.log("Chọn màu cho:", target, "=>", color);
        textNode.fill(color);
        iconLayer.batchDraw();
      } 

      // đóng popup Coloris sau khi chọn
      Coloris.close();      
      wrapper.remove();
    },    
  });

  // make sure the Coloris picker appears centered (Coloris might position it below input)
  // listen once for the open event and force center
  function onOpenOnce() {
    const picker = document.querySelector('.clr-picker');
    if (picker) {
      picker.style.position = 'fixed';
      picker.style.top = '50%';
      picker.style.left = '50%';
      picker.style.transform = 'translate(-50%, -50%)';
      picker.style.zIndex = '2147483648';
    }
    document.removeEventListener('coloris:open', onOpenOnce);
  }
  document.addEventListener('coloris:open', onOpenOnce);

  return wrapper;
}

function isDebugMode() {
  const hostname = window.location.hostname;
  return hostname === "localhost" || hostname === "127.0.0.1"  ? true : false;
}


function getLinkByType(data_type) {
  const item = ASSET_URL_ARRAY.find(obj => obj.data_type === data_type);
  return item ? item.link : "";
}

$(document).on("click", ".group-controls .toggle-btn", function () {
  const $group = $(this).closest(".group-controls");
  $group.find(".btn").not(this).fadeToggle(200);
});

function startCountdownHTML(seconds) {
  stopCountdownHTML();

  const overlay = document.getElementById('countdown-overlay');
  if (!overlay) return;

  let timeLeft = seconds - 1;
  overlay.textContent = timeLeft;
  overlay.classList.add('show');
  overlay.classList.remove('vibrate');

  const update = () => {
    timeLeft--;

    if (timeLeft <= 0) {
      overlay.classList.remove('show', 'vibrate');
      setTimeout(() => {
        overlay.textContent = '';
      }, 300);
      processNextPrePage(true);
      return;
    }

    overlay.textContent = timeLeft;
    overlay.style.opacity = Math.max(0.6, timeLeft / 3);  

    // THÊM HIỆU ỨNG RUNG + VIBRATE KHI CÒN 1 GIÂY
    if (timeLeft < 3) {
      overlay.classList.add('vibrate');
        // playTickSound(); // gọi hàm
        // if (navigator.vibrate) {
        //   navigator.vibrate([200, 100, 200]);
        // }
    } else {
      overlay.classList.remove('vibrate');
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
  const overlay = document.getElementById('countdown-overlay');
  if (overlay) {
    overlay.classList.remove('show', 'vibrate');
    setTimeout(() => {
      overlay.textContent = '';
    }, 300);
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
    tickAudio = new Audio('assets/sound/tick.mp3');
    tickAudio.preload = 'auto'; // tải trước
  }

  // Reset về đầu (để play lại)
  tickAudio.currentTime = 0;
  tickAudio.play().catch(() => {});
}


