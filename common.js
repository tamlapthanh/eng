
// Cách 1: Sử dụng mảng dữ liệu đơn giản
    function createRadioButtons() {
        const options = [
            { id: 'radio_student_37_book', value: 'student37', label: 'Student book 37', checked: true },
            { id: 'radio_work_37_book', value: 'work37', label: 'Work book 37' },
            { id: 'radio_student_book', value: 'student', label: 'Student book 27' },
            { id: 'radio_work_book', value: 'work', label: 'Workbook 27' },
            { id: 'radio_dict_book', value: 'dict', label: 'Dictionary' },
            { id: 'radio_math', value: 'math_page', label: 'Math Game' }
        ];
        
        const container = document.getElementById('radioContainer');
        
        options.forEach(option => {
            const divElement = document.createElement('div');
            divElement.className = 'form-check me-3';
            
            const inputElement = document.createElement('input');
            inputElement.className = 'form-check-input';
            inputElement.type = 'radio';
            inputElement.name = 'options1';
            inputElement.id = option.id + '_1';
            inputElement.value = option.value;
            if (option.checked) inputElement.checked = true;
            
            const labelElement = document.createElement('label');
            labelElement.className = 'form-check-label';
            labelElement.htmlFor = option.id + '_1';
            labelElement.textContent = option.label;
            
            divElement.appendChild(inputElement);
            divElement.appendChild(labelElement);
            container.appendChild(divElement);
        });
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


    function getIconSize(ICON_SIZE) {
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

    function removeLine(arr, element) {
        return arr.filter(item => item !== element);
    }

    // Function to handle line deletion
    function deleteSelectedLine() {
        if (selectedLine) {
            lines = removeLine(lines, selectedLine);
            selectedLine.remove(); // Remove line from layer
            selectedLine = null; // Reset selected line
            drawingLayer.draw(); // Redraw the layer
        }
    }
