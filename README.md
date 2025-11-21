Zizi App Project
This guide provides instructions to set up the environment, build, and deploy the Zizi App project.
Prerequisites

JDK 17.0.10: Ensure JDK 17.0.10 is installed at D:\Working\Installed\jdk-17.0.10.
Maven: Maven must be installed and configured in your system.
Windows Environment: The commands below are tailored for Windows using PowerShell.

# Spring boot
cd D:\Working\Study\KHoi\zizi\zizi-app
mvn spring-boot:run

# CMD window, addmin
mklink /D "D:\Working\Study\KHoi\zizi\eng\assets\books\27\first_work_sheet" "D:\Working\Study\KHoi\zizi\store_images\assets\books\27\first_work_sheet"



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

# mklink, Command Prompt (CMD) bằng Admin nhé
mklink /D "D:\Working\Study\KHoi\zizi\eng\assets\books\27\Young_Children_2_5" "D:\Working\Study\KHoi\zizi\store_images\assets\books\27\Young_Children_2_5"



$SourceDir = "D:\Working\Study\KHoi\zizi\store_images\assets\books\27\Young_Children_6_12\sound\"  # THAY ĐỔI ĐƯỜNG DẪN NÀY
$DestDir = "D:\Working\Study\KHoi\zizi\store_images\assets\books\27\Young_Children_6_12\sound\Audio_Da_Loc\" # THAY ĐỔI ĐƯỜNG DẪN NÀY

# 2. Đảm bảo thư mục đích tồn tại
If (-not (Test-Path $DestDir)) {
    New-Item -Path $DestDir -ItemType Directory | Out-Null
}

# 3. Lọc file: Nhóm theo Topic (T01, T02,...) và chọn file đầu tiên của mỗi nhóm.
Get-ChildItem -Path $SourceDir -Filter "T*k*.mp3" | 
    Group-Object { $_.Name.Substring(0, 3) } |  # Nhóm theo 3 ký tự đầu (ví dụ: T01)
    ForEach-Object {
        # Sắp xếp các file trong nhóm theo tên (ví dụ: T01k01 trước T01k02)
        $FirstFile = $_.Group | Sort-Object Name | Select-Object -First 1

        # Copy file đầu tiên sang thư mục đích
        Copy-Item -Path $FirstFile.FullName -Destination $DestDir -Force
        
        # In ra tên file đã được copy để kiểm tra
        Write-Host "Đã copy: $($FirstFile.Name)" -ForegroundColor Green
    }

Write-Host "Hoàn thành việc lọc và sao chép!" -ForegroundColor Yellow