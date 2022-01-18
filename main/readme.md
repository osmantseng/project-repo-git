# How to build up UVCCamCtrl.node

# 1. Install node-gyp:
npm install -g node-gyp

# 2. Open Powershell and go to `main` folder

# 3. install required packages
yarn install

# 4. Add electron-rebuild package
npm i -D electron-rebuild

# 5. Remove node-modules folder and the packages-lock.json file.

# 6. Run npm i to install all modules
npm i

# 7. Run Electron-rebuild to build addon project
.\node_modules\\.bin\electron-rebuild

# 8. copy addon file to root\build folder
yarn cp

# 9. Just start:desktop to run the main project!

# The electron-rebuild command is to create Visual Studio project only. After modified any .cpp in the addon folder, you can just issue command:
node-gyp build

# Sometime compilation error occurs, you can issue following step to rebuild addon:
node-gyp clean
.\node_modules\.bin\electron-rebuild
