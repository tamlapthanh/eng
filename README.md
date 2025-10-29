Zizi App Project
This guide provides instructions to set up the environment, build, and deploy the Zizi App project.
Prerequisites

JDK 17.0.10: Ensure JDK 17.0.10 is installed at D:\Working\Installed\jdk-17.0.10.
Maven: Maven must be installed and configured in your system.
Windows Environment: The commands below are tailored for Windows using PowerShell.

Setup Instructions

1. Navigate to the Project Directory
cd D:\Working\Study\KHoi\zizi\zizi-app

2. Configure JAVA_HOME Environment Variable
[Environment]::SetEnvironmentVariable("JAVA_HOME", "D:\Working\Installed\jdk-17.0.10")
[System.Environment]::SetEnvironmentVariable("Path", [System.Environment]::GetEnvironmentVariable('Path', [System.EnvironmentVariableTarget]::Machine) + ";$($env:JAVA_HOME)\bin")
$env:JAVA_HOME

3. Build the Project with Maven
mvn clean package -DskipTests

4. Copy the JAR File
copy .\target\zizi-app-0.0.1-SNAPSHOT.jar D:\Working\Study\KHoi\zizi\zizi-app-render-tamlapthanh

Notes

The Maven build will generate the zizi-app-0.0.1-SNAPSHOT.jar file in the target directory.
Ensure all paths specified in the commands match your local setup.
If you encounter issues, verify that Maven and JDK are correctly installed and accessible in the command line.






    // --- load và swap an toàn (với fade-in) ---
    // async function loadJsonBackgroundAndIcons(page, data) {
      
    //   if (!data || !data.background) {
    //     hideSpinner();
    //     return;
    //   }

    //   const basePath =
    //     cfg.global_const && cfg.global_const.PATH_ASSETS_IMG
    //       ? cfg.global_const.PATH_ASSETS_IMG
    //       : "";
    //   const bgUrl = basePath + data.background;

    //   showSpinner("spinnerOverlay", "#F54927");

    //   try {
    //     // 1) preload background image
    //     const imageObj = await preloadImage(bgUrl);

    //     // 2) tạo Konva.Image mới (opacity 0 để fade-in)
    //     const newBg = new Konva.Image({
    //       x: 0,
    //       y: 0,
    //       image: imageObj,
    //       width: imageObj.width,
    //       height: imageObj.height,
    //       id: "backgroundImage_tmp",
    //       opacity: 0,
    //     });

    //     // add vào layer
    //     backgroundLayer.add(newBg);
    //     adjustBackgroundImageNode(newBg); // resize/fit nếu bạn có logic này

    //     // 3) clear icons cũ
    //     playIcons.forEach((i) => {
    //       try {
    //         i.destroy();
    //       } catch (e) {}
    //     });
    //     playIcons = [];
    //     iconLayer.clear();

    //     // 4) preload icons (nếu icons có image assets) - optional
    //     // nếu addPlayIcon tự tạo hình từ sprite/static icon thì bỏ khối preload này
    //     const iconPreloads = [];
    //     (data.icons || []).forEach((iconData) => {
    //       if (iconData.img) {
    //         // giả sử iconData có trường img nếu icon riêng
    //         const iconUrl = basePath + iconData.img;
    //         iconPreloads.push(preloadImage(iconUrl).catch(() => null));
    //       }
    //     });
    //     // chờ preload icons xong (không block nếu lỗi)
    //     if (iconPreloads.length) await Promise.all(iconPreloads);

    //     // 5) add icons mới (toạ độ dựa trên kích thước newBg)
    //     const bgX = newBg.x();
    //     const bgY = newBg.y();
    //     const bgW = newBg.width();
    //     const bgH = newBg.height();

    //     (data.icons || []).forEach((iconData) => {
    //       const iconX =
    //         typeof iconData.x === "number" ? iconData.x * bgW + bgX : bgX;
    //       const iconY =
    //         typeof iconData.y === "number" ? iconData.y * bgH + bgY : bgY;
    //       addPlayIcon(iconX, iconY, iconData.sound, iconData); // truyền iconData nếu addPlayIcon cần img path
    //     });

    //     // 6) batch draw
    //     backgroundLayer.batchDraw();
    //     iconLayer.batchDraw();

    //     // 7) fade-in new background, remove old
    //     const oldBackground = backgroundImage;
    //     const tween = new Konva.Tween({
    //       node: newBg,
    //       duration: 0.22,
    //       opacity: 1,
    //       easing: Konva.Easings.EaseInOut,
    //     });
    //     tween.play();
    //     tween.onFinish = function () {
    //       try {
    //         tween.destroy();
    //       } catch (e) {}
    //       if (oldBackground) {
    //         try {
    //           oldBackground.destroy();
    //         } catch (e) {}
    //       }
    //       backgroundImage = newBg;
    //       backgroundImage.id("backgroundImage");
    //       backgroundLayer.batchDraw();
    //       iconLayer.batchDraw();
    //       drawingLayer.batchDraw();

    //       if (typeof cfg.onLoadLines === "function") cfg.onLoadLines(page);
    //     };
    //   } catch (err) {
    //     console.error("Error loading background/icons:", err);
    //     if (typeof cfg.showToast === "function")
    //       cfg.showToast("Error loading background image", "danger");
    //   } finally {
    //     hideSpinner();
    //   }
    // }

    // // --- điều chỉnh kích thước + vị trí cho 1 Konva.Image node (KHÔNG reset stage) ---
    // function adjustBackgroundImageNode(konvaImageNode) {
    //   const imageObj = konvaImageNode.image();
    //   if (!imageObj) return;

    //   const imageWidth = imageObj.width;
    //   const imageHeight = imageObj.height;
    //   const stageWidth = stage.width();
    //   const stageHeight = stage.height();
    //   const aspectRatio = imageWidth / imageHeight;
    //   let newWidth, newHeight;
    //   if (stageWidth / stageHeight > aspectRatio) {
    //     newWidth = stageHeight * aspectRatio;
    //     newHeight = stageHeight;
    //   } else {
    //     newWidth = stageWidth;
    //     newHeight = stageWidth / aspectRatio;
    //   }

    //   let x = 0,
    //   y = 0;


    //   x = (stageWidth - newWidth) / 2;
    //   y = 0;      

    //   konvaImageNode.width(newWidth);
    //   konvaImageNode.height(newHeight);
    //   konvaImageNode.x(x);
    //   konvaImageNode.y(y);

    //   // đảm bảo các image khác (ví dụ icon) nằm trên background mới
    //   // chú ý: moveToBottom ảnh hưởng trong layer; vì backgroundLayer nằm dưới, icons trong iconLayer vẫn hiện lên
    //   // chỉ cần vẽ lại các layers
    //   backgroundLayer.batchDraw();
    //   iconLayer.batchDraw();
    //   drawingLayer.batchDraw();
    // }
