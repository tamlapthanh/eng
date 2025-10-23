// auth.js

const AuthService = {
    API_BASE_URL: 'https://zizi-app-render.onrender.com/api', 
    // API_BASE_URL: 'http://localhost:8080/api',
    
    // Lưu token vào localStorage
    setToken(token) {
        localStorage.setItem('jwt_token', token);
    },
    
    // Lấy token
    getToken() {
        return localStorage.getItem('jwt_token');
    },
    
    // Xóa token (logout)
    removeToken() {
        localStorage.removeItem('jwt_token');
    },
    
    // Kiểm tra đã login chưa
    isAuthenticated() {
        const token = this.getToken();
        if (!token) return false;
        
        // Kiểm tra token có hết hạn không
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const exp = payload.exp * 1000; // convert to milliseconds
            return Date.now() < exp;
        } catch (e) {
            return false;
        }
    },
    
    // Login
    async login(email, password) {
        try {
            const response = await fetch(`${this.API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });
            
            if (!response.ok) {
                throw new Error('Login failed');
            }
            
            const data = await response.json();
            this.setToken(data.token);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    // Logout
    logout() {
        this.removeToken();
        window.location.href = 'login.html';
    },
    
    // Redirect to login nếu chưa authenticate
    requireAuth() {
        if (!this.isAuthenticated()) {
            window.location.href = 'login.html';
        }
    },
    
    // Thêm Authorization header vào fetch request
    getAuthHeaders() {
        const token = this.getToken();
        return {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : ''
        };
    }
};

// Login form handler (chỉ chạy trên trang login)
$(document).ready(function() {
    if ($('#loginForm').length) {
        $('#loginForm').on('submit', async function(e) {
            e.preventDefault();
            
            const email = $('#email').val();
            const password = $('#password').val();
            const errorMsg = $('#errorMessage');
            
            errorMsg.addClass('d-none');
            
            const result = await AuthService.login(email, password);
            
            if (result.success) {
                window.location.href = 'index.html';
            } else {
                errorMsg.text('Invalid email or password').removeClass('d-none');
            }
        });
    }
});