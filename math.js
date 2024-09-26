window.addEventListener('load', function () {

    // Tạo Konva Stage và Layer
    var stage = new Konva.Stage({
        container: 'konva-canvas',
        width: window.innerWidth,
        height: window.innerHeight
    });

    var layer = new Konva.Layer();
    stage.add(layer);

    var equationText = new Konva.Text({
        x: stage.width() / 2,
        y: stage.height() / 2 - 60,
        text: 'Đang tải...',
        fontSize: 30,
        fontFamily: 'Calibri',
        fill: 'black',
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

    layer.add(equationText);
    layer.add(feedbackText);

    // Tải icon PNG cho "loa" và "micro"
    var questionIcon = new Image();
    questionIcon.src = 'assets/sound-100.png';  // Đường dẫn tới icon PNG loa

    var answerIcon = new Image();
    answerIcon.src = 'assets/record-100.png';  // Đường dẫn tới icon PNG micro

    var questionImage = new Konva.Image({
        x: stage.width() / 2 - 100,
        y: stage.height() / 2 + 100,
        image: questionIcon,
        width: 50,
        height: 50,
        visible: false
    });

    var answerImage = new Konva.Image({
        x: stage.width() / 2 -25,
        y: stage.height() / 2 + 100,
        image: answerIcon,
        width: 50,
        height: 50,
        visible: false
    });


    answerImage.on('click', clickAnswer);
    answerImage.on('touchend', clickAnswer);

   // layer.add(questionImage);
    layer.add(answerImage);
    layer.draw();

    var correctAnswer;
    var recognitionTimeout;
    var spokenText;
    var questionText;

    // Hàm tạo phép tính
    function generateEquation() {
        // Clear feedback text
        questionText = "";
        spokenText = "";
        feedbackText.text('');
        layer.draw();

        // Generate random numbers ensuring no negative results
        let num1 = 1;
        let num2 = 2;
        while (num1 < num2) {
            num1 = Math.floor(Math.random() * 10); // Số thứ nhất
            num2 = Math.floor(Math.random() * 10); // Số thứ hai 
        }

        // Chọn phép toán ngẫu nhiên
        const operation = Math.random() > 0.5 ? '+' : '-';
        let equation, text;

        if (operation === '+') {
            equation = `${num1} + ${num2}`;
            text = `${num1} cộng ${num2} bằng bao nhiêu ?`;
        } else {
            equation = `${num1} - ${num2}`;
            text = `${num1} trừ ${num2} bằng bao nhiêu ?`;
        }

        // Tính toán đáp án
        correctAnswer = eval(equation);

        // Cập nhật văn bản trên canvas
        questionText = getQuestionText(equation);
        equationText.text(questionText);
        equationText.x((stage.width() - equationText.getClientRect().width) / 2);
        feedbackText.x((stage.width() - feedbackText.getClientRect().width) / 2);
        layer.draw();

        // Đọc phép tính
        speakEquation(text);
    }

    function getQuestionText(equation) {
        return ('Câu hỏi: ' + equation + " = ?");
    }

    function replaceAnswerText(answerVal) {
        return questionText.replace("?", answerVal);
    }

    function speakEquation(equation) {

        var utterance = new SpeechSynthesisUtterance();
        utterance.text = equation
        utterance.lang = 'vi-VN';
        window.speechSynthesis.speak(utterance);

        // Lắng nghe sự kiện "start" khi bắt đầu đọc
        utterance.onstart = function () {
            questionImage.visible(true);
            answerImage.visible(false);

            feedbackText.text('Đang đọc câu hỏi...');
            feedbackText.x((stage.width() - feedbackText.getClientRect().width) / 2);
            layer.draw();
        };

        utterance.onend = function () {
            startSpeechRecognition();  // Bắt đầu nhận diện giọng nói khi đọc xong
        };
    }

    function speakResult(text) {
        var utterance = new SpeechSynthesisUtterance();
        utterance.text = text;
        utterance.lang = 'vi-VN';
        window.speechSynthesis.speak(utterance);

        // Sau khi phản hồi kết thúc, tạo câu hỏi mới sau 1 giây
        utterance.onend = function () {
            console.log("speakResult, utterance.onend");
        };
    }

    // Khởi tạo SpeechRecognition để nhận diện giọng nói
    const recognition = new webkitSpeechRecognition() || new SpeechRecognition();

    // Cấu hình recognition
    recognition.continuous = false; // Không nhận diện liên tục
    recognition.interimResults = false; // Không nhận kết quả tạm thời
    recognition.lang = 'vi-VN';


    // Xử lý sự kiện khi nhận diện giọng nói kết thúc (sau khi stop)
    recognition.onend = function () {
        console.log('Recognition đã dừng.');
    };

    recognition.onresult = function (event) {
        console.log("onresult");
        if (event.results.length > 0) {

            spokenText = event.results[0][0].transcript;
            var answerFullText = keepNumbersAndSigns(answerFullText);
            answerFullText = replaceAnswerText(spokenText)
            equationText.text(answerFullText);
            equationText.x((stage.width() - equationText.getClientRect().width) / 2);
            layer.draw();

            processResult();


        } else {

            console.log('Không có kết quả.');
        }
    };


    recognition.onnomatch = () => {
        console.log('Không nhận diện được giọng nói.');
    };

    recognition.onaudiostart = () => {
        console.log("onaudiostart::");
        feedbackText.text('Đọc lớn kết quả ?');
        feedbackText.fill('orange');
        feedbackText.x((stage.width() - feedbackText.getClientRect().width) / 2);
        layer.draw();

       
    };


    // Xử lý khi người dùng ngừng nói
    recognition.onspeechend = function () {

        console.log('Người dùng ngừng nói.');
        if (!spokenText || "" == spokenText) {
   
            var text = "Không trả lời, hỏi tiếp";
            feedbackText.text(text);
            feedbackText.x((stage.width() - feedbackText.getClientRect().width) / 2);
            layer.draw();
            speakResult(text);
            setTimeout(generateEquation, 2000);
        }
    };

    function processResult() {
        if (spokenText.length > 0) {

            spokenNumber = keepNumbersAndSigns(spokenText);

            if (spokenNumber && parseInt(spokenNumber) === correctAnswer) {
                feedbackText.text('Đúng! Kết quả là: ' + spokenNumber);
                feedbackText.fill('green');
                speakResult('Đúng rồi, bằng ' + + correctAnswer);  // Nói "Đúng" rồi sau đó gọi hàm tạo câu hỏi mới
            } else {
                feedbackText.text(`Sai! Bạn nói: ${spokenNumber}, đúng là: ${correctAnswer}`);
                feedbackText.fill('red');
                speakResult('Sai, đúng phải là ' + correctAnswer);  // Nói "Sai" rồi sau đó gọi hàm tạo câu hỏi mới
            }

            feedbackText.x((stage.width() - feedbackText.getClientRect().width) / 2);
            layer.draw();

            // đọc câu hỏi khác
            setTimeout(generateEquation, 2000);
        } else {
            generateEquation();
        }
    }


    recognition.onerror = function (event) {
        console.log("onerror::");
        feedbackText.text('Có lỗi trong việc nhận diện giọng nói!');
        feedbackText.fill('red');
        feedbackText.x((stage.width() - feedbackText.getClientRect().width) / 2);
        layer.draw();
        speakResult('Bỏ qua, câu tiếp theo.');  // Nếu lỗi, bỏ qua và tiếp tục câu hỏi tiếp theo
        generateEquation();
    };


    // Lắng nghe sự kiện "start" khi bắt đầu nhận diện giọng nói
    recognition.onstart = function (event) {
        console.log("onstart::");
        answerImage.visible(false);
        layer.draw();
    };

    // Bắt đầu nhận diện giọng nói
    function startSpeechRecognition() {

        feedbackText.text("Nhấn vào micro.")
        feedbackText.x((stage.width() - feedbackText.getClientRect().width) / 2);
        questionImage.visible(false);
        answerImage.visible(true);
        layer.draw();
    }

    // click vào answer button để nói.     
    function clickAnswer() {
        stopRecognition();
        recognition.start();
    }

    // Hàm để dừng nhận diện
    function stopRecognition() {
        spokenText = "";
        recognition.stop(); // Dừng recognition
        console.log('Đã dừng nhận diện.');
    }

    // Khởi động chương trình
    generateEquation();

    // Đảm bảo canvas tự động điều chỉnh kích thước khi thay đổi kích thước cửa sổ
    window.addEventListener('resize', function () {
        stage.width(window.innerWidth);
        stage.height(window.innerHeight);
        equationText.x((stage.width() - equationText.getClientRect().width) / 2);
        feedbackText.x((stage.width() - feedbackText.getClientRect().width) / 2);
        layer.draw();
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
        "năm": 5,
        "sáu": 6,
        "bảy": 7,
        "tám": 8,
        "chín": 9,
        "chính": 9,
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

        let firstWord = text.split(' ')[0];

        // Loại bỏ khoảng trắng dư thừa
        firstWord = firstWord.trim().toLowerCase();

        // Tìm số tương ứng trong map
        text = numbersMap[firstWord] || text; // Trả về null nếu không tìm thấy

        if (text) {
            return text.replace(/[^0-9+-]/g, '');
        }
    }

    return null;
}