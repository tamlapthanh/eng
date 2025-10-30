const AUTO_PLAY_TIME = 6; // 4 
let countdownTimeout = null;
let countdownElement = null;
let coverRectsArray = [];
let TEXT_DEFAULT = "...."

let OPTIONS_ARRAY = [];
let DEFAULT_DATA_TYPE = "student37";

async function loadOptions() {
  try {
    const response = await fetch("options.json");
    const json = await response.json();
    // 👉 Lưu mảng và giá trị mặc định
    OPTIONS_ARRAY = json.data || [];
    DEFAULT_DATA_TYPE = json.default_data_type || null;

    createRadioButtons();
  } catch (error) {
    console.error("Lỗi khi load options.json:", error);
  }
}

  let ICON_VIDEO         = "assets/video_icon.png";
  let ICON_AUDIO         = "assets/audio_icon.png";
  let ICON_PLAYING       = "assets/playing_icon.svg";

    // basic app config mirrored from your original index.js  
  const PATH_ROOT = "assets/books/27/";
  let APP_DATA = null;
  let IS_EANBLE_SWIPE = true;
  
  let ASSET_URL = {};
  let DATA_TYPE = "student37";
  let CURRENT_PAGE_INDEX = 1;
  let MAX_PAGE_NUM = 107;
  let MIN_PAGE_NUM = 1;
  let FETCH_DRAW_INFO = false;

  // const RUN_URL_SERVER = "https://zizi-app.onrender.com/";                          
  const RUN_URL_SERVER = "https://zizi-app-render.onrender.com/api";                          
  const RUN_URL_LOCAL = "http://localhost:8080/api";
  const API_LINE_KEY_METHOD = "/sheets/line_by_key";
  const API_LINE_ALL_METHOD = "/sheets/line_all";
  
  // const LOCAL_IP = "xx.127.0.0.1";
  const LOCAL_IP = "127.0.0.1";

  const global_const = {
    get PATH_IMG() {
      return  ASSET_URL.IMG_URL + PATH_ROOT + DATA_TYPE + "/img/";
    },
    get PATH_SOUND() {
      return  ASSET_URL.SOUND_URL + PATH_ROOT + DATA_TYPE + "/sound/";
    },
    get PATH_VIDEO() {
      return ASSET_URL.VIDEO_URL + PATH_ROOT + DATA_TYPE + "/video/";
    },    
    get PATH_JSON() {
      return  ASSET_URL.JSON_URL + PATH_ROOT + DATA_TYPE + "/data/X.json";
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