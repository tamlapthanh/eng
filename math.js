window.addEventListener('load', function () {

    var correctAnswer;
    var recognitionTimeout;
    // var spokenText;
    // var questionText;

    var responseTimeout; // Timeout for user response
    var countdownInterval; // Interval for countdown timer
    var countdownDuration = 5; // Set the countdown duration (in seconds)
    let recognitionActive = false; // Track the state of recognition
    let num1 = 0;
    let num2 = 0;
    let operationStr = "";
    let maxNum = 10; // phạm vi 10
    let mathType = 1; // 1: plus, 2: multi
    let multiplication = 2; // phép tính nhân
    let rightAnswerNum = 0;
    let wrongAnswerNum = 0;
    let isCancel = false;

    
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

    var layer = new Konva.Layer();
    stage.add(layer);

    let rightAnswerText = new Konva.Text({
        x: 10,
        y: 80,
        text: `Đúng: ${rightAnswerNum}`,
        fontSize: 20,
        fontFamily: 'Calibri',
        fill: 'green',
        align: 'center'
    });
    layer.add(rightAnswerText);

    let wrongAnswerText = new Konva.Text({
        x: 10,
        y: 50,
        text: `Sai: ${wrongAnswerNum}`,
        fontSize: 20,
        fontFamily: 'Calibri',
        fill: 'red',
        align: 'center'
    });
    layer.add(wrongAnswerText);

    let num1OnesText = new Konva.Text({
        x: stage.width() / 2,
        y: stage.height() / 2 - 180,
        text: '0',
        fontSize: 55,
        fontFamily: 'Calibri',
        fill: 'red',
        align: 'center'
    });
    layer.add(num1OnesText);

    let num1TensText = new Konva.Text({
        x: stage.width() / 2  - 30,
        y: stage.height() / 2 - 180,
        text: '3',
        fontSize: 55,
        fontFamily: 'Calibri',
        fill: 'red',
        align: 'center'
    });
    layer.add(num1TensText);


    let num2OnesText = new Konva.Text({
        x: stage.width() / 2 ,
        y: stage.height() / 2 - 125,
        text: '6',
        fontSize: 55,
        fontFamily: 'Calibri',
        fill: 'red',
        align: 'center'
    });
    layer.add(num2OnesText);

    let num2TensText = new Konva.Text({
        x: stage.width() / 2  - 30,
        y: stage.height() / 2 - 125,
        text: '5',
        fontSize: 55,
        fontFamily: 'Calibri',
        fill: 'red',
        align: 'center'
    });
    layer.add(num2TensText);


    let resultOnesText = new Konva.Text({
        x: stage.width() / 2 ,
        y: stage.height() / 2 - 60,
        text: '?',
        fontSize: 55,
        fontFamily: 'Calibri',
        fill: 'green',
        align: 'center'
    });
    layer.add(resultOnesText);

    let resultTensText = new Konva.Text({
        x: stage.width() / 2  - 30,
        y: stage.height() / 2 - 60,
        text: '?',
        fontSize: 55,
        fontFamily: 'Calibri',
        fill: 'green',
        align: 'center'
    });
    layer.add(resultTensText);

    let operationText = new Konva.Text({
        x: stage.width() / 2  - 70,
        y: stage.height() / 2 - 150,
        text: '+',
        fontSize: 55,
        fontFamily: 'Calibri',
        fill: 'red',
        align: 'center'
    });
    layer.add(operationText);

    //text: '--------',
    let lineText = new Konva.Text({
        x: stage.width() / 2  - 70,
        y: stage.height() / 2 - 95,
        text: '------------',
        fontSize: 40,
        fontFamily: 'Calibri',
        fill: 'red',
        align: 'center', 
        visible: true
    });
    layer.add(lineText);
    layer.draw();

    let equationText = new Konva.Text({
        x: stage.width() / 2,
        y: stage.height() / 2 - 60,
        text: 'Đang tải...',
        fontSize: 55,
        fontFamily: 'Calibri',
        fill: 'salmon',
        align: 'center'
    });

    let feedbackText = new Konva.Text({
        x: stage.width() / 2,
        y: stage.height() / 2 + 20,
        text: '',
        fontSize: 20,
        fontFamily: 'Calibri',
        fill: 'blue',
        align: 'center'
    });

    let countdownText = new Konva.Text({
        x: stage.width() / 2,
        y: stage.height() / 2 + 80,
        text: '',
        fontSize: 50,
        fontFamily: 'Calibri',
        fill: 'red',
        align: 'center',
        visible: false  // Hidden initially
    });


    let debugText = new Konva.Text({
        x: stage.width() / 2,
        y: stage.height() / 2 + 140,
        text: '',
        fontSize: 20,
        fontFamily: 'Calibri',
        fill: 'green',
        align: 'center'
    });

    //layer.add(equationText);
    layer.add(feedbackText);
    layer.add(countdownText);
    layer.add(debugText);
    layer.draw();

    

    function stopRecognition() {
        recognition.stop(); // Stop recognition after timeout
    }

    // Hàm tạo phép tính
    function generateEquation(init) {
        console.log("Generate Equation");
        

        if (recognitionActive) {
            recognitionActive = false;
            isCancel = true;
            recognition.stop();
            recognition.abort();
        } else {
            recognitionActive = false;
            isCancel = false;
        }

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

    function updateAllNumberText(operation, num1Tens, num1Ones, num2Tens, num2Ones) {
        updateNumberText(operation, operationText, false);
        updateNumberText(num1Tens, num1TensText, true);
        updateNumberText(num1Ones, num1OnesText, false);
        updateNumberText(num2Tens, num2TensText, true);
        updateNumberText(num2Ones, num2OnesText, false);

        updateNumberText("?", resultOnesText,  false);
        if (100 == maxNum) {
            updateNumberText("?", resultTensText,  true);
        } else {
            updateNumberText(" ", resultTensText,  true);
        }
        
        layer.draw();
    }
    
    function generateMultiplication(operation) {
        let num1 = multiplication;
        let num2 = Math.floor(Math.random() * 9) + 1;
        updateAllNumberText(operation, 0, num1, 0, num2);
        return [num1, num2]; 
    }

    function generatePlusTwoNumbers(operation) {
        while (true) {
          // Tạo hai số ngẫu nhiên từ 0 đến maxNum (10 or 100)
          let num1 = Math.floor(Math.random() * maxNum);
          let num2 = Math.floor(Math.random() * maxNum);
          
          let num1Tens, num1Ones, num2Tens, num2Ones;
          // Tách hàng chục và hàng đơn vị của mỗi số
          if (10 == maxNum) {
            if ("-" == operation && num1 < num2) {
                const num = num1;
                num1 = num2;
                num2 = num;
            } 
            updateAllNumberText(operation, 0, num1, 0, num2);
            return [num1, num2];

          } else {
           num1Tens = Math.floor(num1 / 10);  // Hàng chục của số 1
           num1Ones = num1 % 10;              // Hàng đơn vị của số 1
           num2Tens = Math.floor(num2 / 10);  // Hàng chục của số 2
           num2Ones = num2 % 10;              // Hàng đơn vị của số 2
        }

        updateAllNumberText(operation, num1Tens, num1Ones, num2Tens, num2Ones);
          
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
        let operation = Math.random() > 0.5 ? '+' : '-';
        let equation, text;

        if (mathType == 1) {
            // phep cong
            [num1, num2] = generatePlusTwoNumbers(operation);
        } else {
            // phep nhan
            operation = "x";
            [num1, num2] = generateMultiplication(operation);
        }
        
        if (operation === '+') {
            equation = `${num1} + ${num2}`;
            operationStr = "cộng";
        } else if (operation === '-') {
            equation = `${num1} - ${num2}`;
            operationStr = "trừ";
        } else {
            equation = `${num1} * ${num2}`;
            operationStr = "nhân";
        }
    
        text = `${num1} ${operationStr} ${num2} bằng bao nhiêu ?`;
        return { equation, text };
    }

    function getQuestionText(equation) {
        return (equation + " = ?");
    }

    function replaceAnswerText(answerVal) {
        return questionText.replace("?", answerVal);
    }
 

    function speakEquation(equation) {
        var utteranceSpeak = new SpeechSynthesisUtterance();
        utteranceSpeak.text = equation
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
               generateEquation(false);
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

    function updateNumberText(text, obj, isCheckZero) {
        if (isCheckZero) {
            if ("0" == text || 0 == text) {
                obj.text(" ");
            } else {
                obj.text(text);
            }
        } else {
            obj.text(text);
        }

        layer.draw();
    }

    function updateResultText(correctAnswer) {
 
        const resultTens = Math.floor(correctAnswer / 10);  // Hàng chục của số 1
        const resultOnes = correctAnswer % 10;              // Hàng đơn vị của số 1

        updateNumberText(resultOnes, resultOnesText,  false);
        updateNumberText(resultTens, resultTensText,  true);
    }


    function processResult() {
        try {
            if (isCancel == false) {
                updateText("Spoken Text::" + spokenText, feedbackText);
                let text = "";
                if (spokenText.length > 0) {
                    var spokenNumber = keepNumbersAndSigns(spokenText);
                    if (spokenNumber && parseInt(spokenNumber) === correctAnswer) {
                        text = `Giỏi quá, đúng rồi, ${num1} ${operationStr} ${num2} bằng ${correctAnswer} `;
                        updateText("", debugText);
                        updateNumberText(`Đúng: ${rightAnswerNum++}`, rightAnswerText);
                    } else {
                        text = `Sai, trả lời là ${spokenText}, nhưng ${num1} ${operationStr} ${num2} phải bằng ${correctAnswer} `;
                        updateNumberText(`Sai: ${++wrongAnswerNum}`, wrongAnswerText);
                    }
                }  else {
                    text = `Sao không trả lời, bằng ${correctAnswer} nhé`;
                }
                updateResultText(correctAnswer);
                updateText(text, feedbackText);
                speakResult(text);
            }
        } catch (error) {
            console.log("Có lỗi xảy ra:", error.message);
            alert(error.message);
            speakResult(error.message);
        }
    }

    recognition.onerror = function (event) {
        updateText('onerror, Không nhận diện giọng nói!', feedbackText);
        speakResult('Bỏ qua, câu tiếp theo.');
        generateEquation(false);
    };

    recognition.onstart = function () {
        console.log('Recognition đã bắt đầu.');
        startCountdown(countdownDuration);
        recognitionActive = true; // Set recognition state to active
    };

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
    generateEquation(true);

    
    // Lắng nghe sự kiện resize của window
    window.addEventListener('resize', function() {
        isCancel = true;
        recognition.stop();
        // Tải lại trang
        location.reload();
    });


        // reboot
    $('#reboot-app').on('click', function () {
        isCancel = true;
        recognition.stop();
        generateEquation(false);
    });

    // Event listener for radio button click/change
    $('input[name="options_plus"]').on('click', function() {
        maxNum = $(this).val();
    });

    $('input[name="options_math_type"]').on('click', function() {
        mathType = $(this).val();
    });

    $('#multi-dropdown').change(function () {
        multiplication = $(this).val();
    });  

    $('#duration-dropdown').change(function () {
        countdownDuration = $(this).val();
    });    

    $('#id_close_modal').on('click', function () {
        isCancel = true;
        recognition.stop();
        generateEquation(true);
        $('#settingsModal').modal('hide');
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

        if (text !== undefined) {

            // Convert text to lowercase and split by spaces
            console.log(text);

            text = String(text).trim();

            if (numbersMap[text] !== undefined) {
                return numbersMap[text];
            }

            return getLastNumberFromString(numbersMap, text);
        }
        return ''; // Return an empty string if the input is null or empty
    }

    function extractNumbersFromString(str) {
        // Sử dụng regex để loại bỏ tất cả ký tự không phải số
        const numbers = str.replace(/[^\d]/g, ''); 
        return numbers; // Trả về chuỗi chỉ chứa số
    }

    function hasNumbers(str) {
        // Kiểm tra xem chuỗi có chứa ký tự số không
        const regex = /\d/; // \d đại diện cho bất kỳ chữ số nào từ 0 đến 9
        return regex.test(str); // Trả về true nếu có số, false nếu không có
    }

    function getLastNumberFromString(numbersMap, str) {
        // Tách chuỗi bằng khoảng trắng
        const parts = str.trim().split(/\s+/);
        // Duyệt từ cuối mảng về đầu
        for (let i = parts.length - 1; i >= 0; i--) {
            const part = String(parts[i]).trim();
            // Kiểm tra xem phần tử có phải là số không
            if (!isNaN(part)) {
                return Number(part); // Trả về số nếu tìm thấy
            } else if (numbersMap[part] !== undefined) {
               return numbersMap[part];
            } else {
                if (hasNumbers(part)) {
                    return extractNumbersFromString(part);
                }
            }
        }
        return str; // Nếu không tìm thấy số nào, trả về null
    }


}); // emd of load
