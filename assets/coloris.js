$(document).ready(function () {

Coloris({
    el: '.coloris',
    swatches: [
      'Tomato',
      'Orange',
      'DodgerBlue',
      'MediumSeaGreen',
      'Gray',
      'SlateBlue',
      'Violet',
      'LightGray',
      '#0096c7',
      '#00b4d8',
      '#48cae4'
    ]
  });
  
  Coloris.setInstance('.instance1', {
    theme: 'pill',
    themeMode: 'dark',
    formatToggle: true,
    closeButton: true,
    clearButton: true,
    swatches: [
      '#067bc2',
      '#84bcda',
      '#80e377',
      '#ecc30b',
      '#f37748',
      '#d56062'
    ]
  });
  
  Coloris.setInstance('.instance2', { theme: 'polaroid' });

  Coloris.setInstance('.instance3', {
    theme: 'polaroid',
    swatchesOnly: true
  });

  document.addEventListener('coloris:pick', event => {
    line_color = event.detail.color;
    console.log('New color', line_color);
  });

});