
  let ICON_VIDEO         = "assets/video_icon.png";
  let ICON_AUDIO         = "assets/audio_icon.png";
  let ICON_PLAYING       = "assets/playing_icon.svg";

    // basic app config mirrored from your original index.js
  const ASSETS_URL ="https://tamlapthanh.github.io/store_images/";
  const PATH_ROOT = "assets/books/27/";
  let APP_DATA = null;
  let IS_EANBLE_SWIPE = true;
  

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