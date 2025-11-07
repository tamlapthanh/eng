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

# mklink, Command Prompt (CMD) bằng Admin nhé
mklink /D "D:\Working\Study\KHoi\zizi\eng\assets\books\27\Young_Children_2_5" "D:\Working\Study\KHoi\zizi\store_images\assets\books\27\Young_Children_2_5"

