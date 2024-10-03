window.addEventListener('load', function () {

    var correctAnswer;
    var recognitionTimeout;
    var spokenText;
    var questionText;
    var responseTimeout; // Timeout for user response
    var countdownInterval; // Interval for countdown timer
    var countdownDuration = 4; // Set the countdown duration (in seconds)
    let recognitionActive = false; // Track the state of recognition

    // Khởi tạo SpeechRecognition để nhận diện giọng nói
    const recognition = new webkitSpeechRecognition() || new SpeechRecognition();

    // Cấu hình recognition
    recognition.continuous = true; // Không nhận diện liên tục
    recognition.interimResults = true; // Không nhận kết quả tạm thời
    recognition.lang = 'vi-VN';

    // Tạo Konva Stage và Layer
    var stage = new Konva.Stage({
        container: 'konva-canvas',
        width: window.innerWidth,
        height: window.innerHeight
    });

    var equationText = new Konva.Text({
        x: stage.width() / 2,
        y: stage.height() / 2 - 60,
        text: 'Đang tải...',
        fontSize: 55,
        fontFamily: 'Calibri',
        fill: 'salmon',
        align: 'center'
    });

    var feedbackText = new Konva.Text({
        x: stage.width() / 2,
        y: stage.height() / 2 + 20,
        text: '',
        fontSize: 30,
        fontFamily: 'Calibri',
        fill: 'blue',
        align: 'center'
    });

    var countdownText = new Konva.Text({
        x: stage.width() / 2,
        y: stage.height() / 2 + 80,
        text: '',
        fontSize: 30,
        fontFamily: 'Calibri',
        fill: 'red',
        align: 'center',
        visible: false  // Hidden initially
    });


    var debugText = new Konva.Text({
        x: stage.width() / 2,
        y: stage.height() / 2 + 120,
        text: '',
        fontSize: 54,
        fontFamily: 'Calibri',
        fill: 'green',
        align: 'center'
    });

    var layer = new Konva.Layer();
    stage.add(layer);

    layer.add(equationText);
    layer.add(feedbackText);
    layer.add(countdownText);
    layer.add(debugText);

    layer.draw();

    function stopRecognition() {
        recognition.stop(); // Stop recognition after timeout
    }

    // Hàm tạo phép tính
    function generateEquation() {
        console.log("Generate Equation");
        recognitionActive = false;

        // Clear feedback text
        questionText = "";
        spokenText = "";
        debugText.text('');
        feedbackText.text('');
        countdownText.text('');
        countdownText.visible(false);
        layer.draw();

        // Clear any existing response timeout and countdown interval
        clearTimeout(responseTimeout);
        clearInterval(countdownInterval);

        // Generate Random Equation
        const resultRandom = generateRandomEquation();

        // Tính toán đáp án
        correctAnswer = eval(resultRandom.equation);

        // Cập nhật văn bản trên canvas
        questionText = getQuestionText(resultRandom.equation);
        equationText.text(questionText);
        equationText.x((stage.width() - equationText.getClientRect().width) / 2);
        feedbackText.x((stage.width() - feedbackText.getClientRect().width) / 2);
        debugText.x((stage.width() - debugText.getClientRect().width) / 2);
        layer.draw();

        // Đọc phép tính
        speakEquation(resultRandom.text);
    }
    
    function generateTwoNumbers(operation) {
        while (true) {
          // Tạo hai số ngẫu nhiên từ 0 đến 99
          const num1 = Math.floor(Math.random() * 100);
          const num2 = Math.floor(Math.random() * 100);
          
          // Tách hàng chục và hàng đơn vị của mỗi số
          const num1Tens = Math.floor(num1 / 10);  // Hàng chục của số 1
          const num1Ones = num1 % 10;              // Hàng đơn vị của số 1
          const num2Tens = Math.floor(num2 / 10);  // Hàng chục của số 2
          const num2Ones = num2 % 10;              // Hàng đơn vị của số 2
          
          // Kiểm tra điều kiện
          if ("+" == operation) {
            if (
                (num1 + num2) < 100 && 
                (num1Ones + num2Ones < 10) &&  // Tổng hàng đơn vị nhỏ hơn 10
                (num1Tens + num2Tens < 10)     // Tổng hàng chục nhỏ hơn 10
              ) {
                return [num1, num2];  // Trả về hai số nếu thỏa mãn điều kiện
              }
          } else {
            if (
                (num1 + num2) < 100 && 
                (num1Ones - num2Ones > 0 && num1Ones - num2Ones < 10 &&  // Hiệu hàng đơn vị nhỏ hơn 10
                num1Tens - num2Tens > 0 && num1Tens - num2Tens < 10)     // Hiệu hàng chục nhỏ hơn 10
              ) {
                return [num1, num2];  // Trả về hai số nếu thỏa mãn điều kiện
              }
            }
        }
      }

    function generateRandomEquation() { 

        // Chọn phép toán ngẫu nhiên
        const operation = Math.random() > 0.5 ? '+' : '-';
        let equation, text;

        let [num1, num2] = generateTwoNumbers(operation);
  
        if (operation === '+') {
            equation = `${num1} + ${num2}`;
            text = `${num1} cộng ${num2} bằng bao nhiêu ?`;
        } else {
            equation = `${num1} - ${num2}`;
            text = `${num1} trừ ${num2} bằng bao nhiêu ?`;
        }
    
        return { equation, text };
    }

    function getQuestionText(equation) {
        return (equation + " = ?");
    }

    function replaceAnswerText(answerVal) {
        return questionText.replace("?", answerVal);
    }

    function speakEquation(equation) {
        var utteranceSpeak = new SpeechSynthesisUtterance(equation);
        utteranceSpeak.lang = 'vi-VN';

        updateText('Đang chuẩn bị...', feedbackText);

        // Dùng setTimeout để chắc chắn sự kiện được kích hoạt
        setTimeout(() => { window.speechSynthesis.speak(utteranceSpeak);}, 2000);

        // Lắng nghe sự kiện "start" khi bắt đầu đọc
        utteranceSpeak.onstart = function () {
            updateText('Đang đọc câu hỏi...', feedbackText);
        };

        // ** Automatically start speech recognition after question is spoken **
        utteranceSpeak.onend = function () {
            startSpeechRecognition();  // Bắt đầu nhận diện giọng nói khi đọc xong
        };
    }

    function speakResult(text) {
        var utteranceResult = new SpeechSynthesisUtterance();
        utteranceResult.text = text;
        utteranceResult.lang = 'vi-VN';
        window.speechSynthesis.speak(utteranceResult);

        // ** Automatically start speech recognition after question is spoken **
        utteranceResult.onend = function () {
            // Dùng setTimeout để chắc chắn sự kiện được kích hoạt
            setTimeout(() => {
                console.log("setTimeout, speakResult")
               generateEquation();
            }, 1000);
        };
    }

    // Ensure you are handling the recognition events correctly
    recognition.onend = function () {
        console.log('onend, Recognition đã dừng.');
        clearInterval(countdownInterval);  // Clear the countdown interval
        countdownText.visible(false);  // Hide countdown after recognition ends
        layer.draw();
        processResult();
        recognitionActive = false;
    };

    recognition.onresult = function (event) {
        console.log("onresult");
           // Biến lưu kết quả tạm thời hoặc kết quả cuối cùng
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = 0; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
    
            if (event.results[i].isFinal) {
                // Nếu đây là kết quả cuối cùng
                spokenText = transcript;
            } else {
                // Nếu đây là kết quả tạm thời
                spokenText = transcript;
            }
        }

        updateText(spokenText, debugText);
        console.log("spokenText::" + spokenText);
    };

    recognition.onnomatch = () => {
        console.log('onnomatch, Không nhận diện được giọng nói.');
        updateText('Không nhận diện được giọng nói.' + spokenText,  feedbackText);
    };

    recognition.onaudiostart = () => {
        updateText('Đọc lớn kết quả ?', feedbackText);
    };

    recognition.onspeechend = function () {
        console.log('onspeechend, Người dùng ngừng nói.');
    };

    function updateText(text, obj) {
        obj.text(text);
        obj.x((stage.width() - obj.getClientRect().width) / 2);
        layer.draw();
    }

    function processResult() {
        try {
            updateText("Spoken Text::" + spokenText, feedbackText);
            let text = "";
            if (spokenText.length > 0) {
                var spokenNumber = keepNumbersAndSigns(spokenText);
                if (spokenNumber && parseInt(spokenNumber) === correctAnswer) {
                    text = `Con ai giỏi vậy ta, đúng là bằng ${parseInt(spokenNumber)}`;
                    updateText("", debugText);
                } else {
                    text = `Sai rồi, bạn nói ${spokenText}, nhưng đúng thì phải là ${parseInt(correctAnswer)}`;
                }
            }  else {
                text = `Sao không trả lời, bằng ${correctAnswer} nhé`;
            }
            updateText(text, feedbackText);
            speakResult(text);
        } catch (error) {
            console.log("Có lỗi xảy ra:", error.message);
            alert(error.message);
            speakResult(error.message);
        }
    }

    recognition.onerror = function (event) {
        updateText('onerror, Không nhận diện giọng nói!', feedbackText);
        speakResult('Bỏ qua, câu tiếp theo.');
        generateEquation();
    };

    recognition.onstart = function () {
        console.log('Recognition đã bắt đầu.');
        // Start countdown only after recognition starts
        // playBeep();
        startCountdown(countdownDuration);
        recognitionActive = true; // Set recognition state to active
    };

    function playBeep() {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)(); // Tạo ngữ cảnh âm thanh
        const oscillator = audioContext.createOscillator(); // Tạo bộ dao động (oscillator)
        oscillator.type = 'triangle'; // Đặt loại âm thanh là sine (có thể dùng 'square', 'sawtooth', 'triangle')
        oscillator.frequency.setValueAtTime(400, audioContext.currentTime); // Đặt tần số âm thanh (440Hz là "A")
        
        // Kết nối với đầu ra (loa)
        oscillator.connect(audioContext.destination);
        
        // Phát âm thanh bíp trong 0.5 giây
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.4); // Âm thanh kéo dài 0.5 giây
    }

// ** Start speech recognition without user clicking **
function startSpeechRecognition() {

    //updateText("startSpeechRecognition", feedbackText);
           
        // Check if the recognition object is initialized
        if (recognition) {
            // Start recognition only if it's not already active
            if (!recognitionActive) {
                recognition.start(); // Start listening for speech
                // Start a timeout for user response (e.g., 15 seconds)
                responseTimeout = setTimeout(() => {
                    stopRecognition();
                }, countdownDuration * 1000); // countdownDuration * 1000 Set the timeout to duration (in seconds)
            } else {
                console.warn("Recognition is already active.");
            }
        } else {
            // If recognition is not available, provide feedback
            updateText("Nhận diện giọng nói không khả dụng.", feedbackText);
        }

    }

    // ** Countdown Function **
    function startCountdown(duration) {
        var remainingTime = duration;
        countdownText.text(`${remainingTime} giây`);
        countdownText.x((stage.width() - countdownText.getClientRect().width) / 2);
        countdownText.visible(true);  // Ensure countdown is visible
        layer.draw();
    
        countdownInterval = setInterval(() => {
            remainingTime--;
            countdownText.text(`${remainingTime} giây`);
            countdownText.x((stage.width() - countdownText.getClientRect().width) / 2);
            layer.draw();
    
            if (remainingTime <= 0) {
                clearInterval(countdownInterval);  // Stop countdown when time is up
                countdownText.visible(false);  // Hide countdown
            }
        }, 1000); // Update countdown every second
    }
    

    // Khởi động chương trình
    generateEquation();

    // Đảm bảo canvas tự động điều chỉnh kích thước khi thay đổi kích thước cửa sổ
    window.addEventListener('resize', function () {
        stage.width(window.innerWidth);
        stage.height(window.innerHeight);
        equationText.x((stage.width() - equationText.getClientRect().width) / 2);
        feedbackText.x((stage.width() - feedbackText.getClientRect().width) / 2);
        countdownText.x((stage.width() - countdownText.getClientRect().width) / 2);
        layer.draw();
    });

        // Zoom In button
    $('#reboot-app').on('click', function () {
        generateEquation();
    });
});

function keepNumbersAndSigns(text) {
    const numbersMap = {
        "không": 0,
        "một": 1,
        "hai": 2,
        "hài": 2,
        "ba": 3,
        "bà": 3,
        "bốn": 4,
        "bún": 4,
        "nam": 4,
        "nằm": 5,
        "năm": 5,
        "sáo": 6,
        "sáu": 6,
        "bảy": 7,
        "tám": 8,
        "chín": 9,
        "chính": 9,
        "chí": 9,
        "mười": 10,
        "mười một": 11,
        "mười hai": 12,
        "hai mươi": 20,
        "ba mươi": 30,
        "bốn mươi": 40,
        "năm mươi": 50,
        "sáu mươi": 60,
        "bảy mươi": 70,
        "tám mươi": 80,
        "chín mươi": 90
    };

    if (text) {
        // Convert text to lowercase and split by spaces
        console.log(text);
        const words = text.toLowerCase().split(' ');
        const word = words[words.length - 1];

        // Convert each word using the numbersMap
        let convertedText = numbersMap[word] !== undefined ? numbersMap[word] : word;
        console.log(convertedText);

        // Filter out non-numeric characters, keeping digits and signs
        return String(convertedText).replace(/[^0-9+-]/g, '');
    }
    return ''; // Return an empty string if the input is null or empty
}
