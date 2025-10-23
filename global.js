
const OPTIONS_ARRAY  = [
    { id: 'radio_student_37_book', data_type: 'student37', label: 'Student book 37',  max: 107, min: 1, current: 2 }, // 0
    { id: 'radio_work_37_book', data_type: 'work37', label: 'Work book 37' , max: 97, min: 1, current: '1' }, // 1
    { id: 'radio_btbt_37_book', data_type: 'btbt37', label: 'BTBT 3' , max: 140, min: 1, current: '1' }, // 2
    { id: 'radio_student_book', data_type: 'student', label: 'Student book 27' , max: 66, min: 1, current: 1 }, // 3
    { id: 'radio_work_book', data_type: 'work', label: 'Workbook 27' , max: 65, min: 1, current: 1 }, // 4
    { id: 'radio_dict_book', data_type: 'dict', label: 'Dictionary' , max: 87, min: 1, current: 2 }, // 5
    { id: 'radio_first_work_sheet', data_type: 'first_work_sheet', label: 'Vocabulary Work Sheet' , max: 14, min: 1, current: 2 }, // 6
    { id: 'radio_math', data_type: 'math_page', label: 'Math Game' }, // 7
];

const ASSET_URL_ARRAY = [
    { data_type: 'student37', link: 'https://tamlapthanh.github.io/store_images/' }
];    

  let ICON_VIDEO         = "assets/video_icon.png";
  let ICON_AUDIO         = "assets/audio_icon.png";
  let ICON_PLAYING       = "assets/playing_icon.svg";

    // basic app config mirrored from your original index.js  
  const PATH_ROOT = "assets/books/27/";
  let APP_DATA = null;
  let IS_EANBLE_SWIPE = true;
  
  let ASSETS_URL ="https://tamlapthanh.github.io/store_images/";
  let DATA_TYPE = "student37";
  let CURRENT_PAGE_INDEX = 1;
  let MAX_PAGE_NUM = 107;
  let MIN_PAGE_NUM = 1;

  // const RUN_URL_SERVER = "https://zizi-app.onrender.com/";                          
  const RUN_URL_SERVER = "https://zizi-app-render.onrender.com/api";                          
  const RUN_URL_LOCAL = "http://localhost:8080/api";
  const API_LINE_KEY_METHOD = "/sheets/line_by_key";
  const API_LINE_ALL_METHOD = "/sheets/line_all";
  
//   const LOCAL_IP = "xx.127.0.0.1";
  const LOCAL_IP = "127.0.0.1";

  const global_const = {
    get PATH_ASSETS_IMG() {
      return  PATH_ROOT + DATA_TYPE + "/img/";
    },
    get PATH_IMG() {
      return  PATH_ROOT + DATA_TYPE + "/img/";
    },
    get PATH_SOUND() {
      return  PATH_ROOT + DATA_TYPE + "/sound/";
    },
    get PATH_VIDEO() {
      return ASSETS_URL + PATH_ROOT + DATA_TYPE + "/video/";
    },    
    get PATH_JSON() {
      return  PATH_ROOT + DATA_TYPE + "/data/X.json";
    },
    get RUN_URL_SERVER() {
      const hostname = window.location.hostname;
      return hostname === "localhost" || hostname === LOCAL_IP
        ? RUN_URL_LOCAL  
        : RUN_URL_SERVER;
    },    
    get SERVER_API_ALL_METHOD() {
      const hostname = window.location.hostname;
      return hostname === "localhost" || hostname === LOCAL_IP
        ? RUN_URL_LOCAL  + API_LINE_ALL_METHOD
        : RUN_URL_SERVER + API_LINE_ALL_METHOD;
    },
    get API_LINE_KEY_METHOD() { //SERVER_URL
      const hostname = window.location.hostname;
      return hostname === "localhost" || hostname === LOCAL_IP
        ? RUN_URL_LOCAL  + API_LINE_KEY_METHOD
        : RUN_URL_SERVER + API_LINE_KEY_METHOD;
    },
  };