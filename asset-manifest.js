// asset-manifest.js
let ASSET_MANIFEST = [
    '/',
    'index.html',
    'styles.css',
    'assets/icons/icon-192x192.png',
    'assets/icons/icon-512x512.png',
    'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css',
    'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css',
    'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js',
    'https://code.jquery.com/jquery-3.5.1.min.js',
    'https://unpkg.com/konva@9/konva.min.js'
  ];

  for (let i = 1; i <= 67; i++) {
    ASSET_MANIFEST.push(`assets/img/image${i}.png`);
 }

 for (let i = 1; i <= 9; i++) {
    ASSET_MANIFEST.push(`assets/sound/student/0${i}.mp3`);
 }

 for (let i = 10; i <= 108; i++) {
    ASSET_MANIFEST.push(`assets/sound/student/${i}.mp3`);
 }
