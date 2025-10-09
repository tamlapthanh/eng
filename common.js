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
            icon_size = 11;
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


