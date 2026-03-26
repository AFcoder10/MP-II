"use strict";
const electron = require("electron");
const path$1 = require("node:path");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const dataFolderPath = path.join(__dirname, "data");
const userFile = path.join(__dirname, "userData.txt");
const pythonDir = path.join(__dirname, "python/utility2.py");
const recordingDirectory = path.join(__dirname, "sysAudioRecorder");
function setUpShortcut(keyCombination, win2) {
  electron.globalShortcut.register(keyCombination, () => {
    if (win2 == null ? void 0 : win2.isVisible()) {
      win2.hide();
    } else {
      win2 == null ? void 0 : win2.show();
      win2 == null ? void 0 : win2.maximize();
    }
  });
}
function setUpMouseListeners(win2) {
  electron.ipcMain.handle("mouseEnter", () => {
    win2 == null ? void 0 : win2.setIgnoreMouseEvents(false);
  });
  electron.ipcMain.handle("mouseLeave", () => {
    win2 == null ? void 0 : win2.setIgnoreMouseEvents(true, { forward: true });
  });
}
function createDataFolder() {
  console.log(dataFolderPath);
  if (!fs.existsSync(userFile)) {
    try {
      fs.writeFileSync(userFile, "");
    } catch (err) {
      console.log("Error Creating userData.txt", err);
    }
  }
  if (!fs.existsSync(dataFolderPath)) {
    try {
      fs.mkdirSync(dataFolderPath);
      console.log("No Data Folder Found, Creating one now.");
    } catch (err) {
      console.log("Error Creating Data folders", err);
    }
  }
}
function fetchAllPlaylists() {
  try {
    const fileData = fs.readFileSync(userFile, "utf-8");
    const playlist = fileData.split("\n");
    const fileDataJSON = [];
    playlist.forEach((item) => {
      const MetaData = item.split("|sep|");
      if (MetaData.length === 0) {
        return;
      }
      if (MetaData[0] === "" || MetaData[1] === void 0)
        return;
      const url = MetaData[1];
      const name = MetaData[0];
      fileDataJSON.push({ name, url });
    });
    return fileDataJSON;
  } catch (err) {
    console.log(err);
  }
}
function fetchSongs(playlist) {
  const playlistFolder = path.join(dataFolderPath, playlist);
  const playlistDataFile = path.join(playlistFolder, `downloaded_files.txt`);
  try {
    const fileData = fs.readFileSync(playlistDataFile, "utf-8");
    const fileDataJSON = [];
    const songs = fileData.split("\n");
    songs.forEach((song) => {
      if (song.length === 0)
        return;
      const songPath = song;
      const songName = path.basename(song);
      fileDataJSON.push({ name: songName, path: songPath });
    });
    return fileDataJSON;
  } catch (err) {
    console.log(err);
  }
}
async function downloadPlaylist(url, name, win2) {
  if (url.length == 0 || name.length == 0) {
    console.log("Empty fields, stopping creation of creation of subprocess");
    return;
  }
  const dataToAdd = "\n" + name + "|sep|" + url;
  const downloadScript = pythonDir.replace(/\\/g, "/");
  try {
    console.log("Reading userdata attempt");
    const fileContent = await fs.promises.readFile(userFile, "utf8");
    const alreadyExists = fileContent.includes(dataToAdd);
    if (alreadyExists) {
      console.log("Shit ain't new fam");
    } else {
      await fs.promises.appendFile(userFile, dataToAdd);
      console.log("writing new shit");
    }
    console.log("calling process...");
    const pythonProcess = spawn("python", [downloadScript, name, url], {
      stdio: ["inherit", "inherit", "inherit"],
      encoding: "utf8"
    });
    console.log("calling script: ", downloadScript);
    pythonProcess.on("exit", (code, signal) => {
      console.log(
        `Python process exited with code ${code} and signal ${signal}`
      );
      win2 == null ? void 0 : win2.webContents.send("Downloaded");
    });
    pythonProcess.on("error", (err) => {
      console.error("Failed to start Python process:", err);
      console.log(win2, win2 == null ? void 0 : win2.webContents);
      win2 == null ? void 0 : win2.webContents.send(`Failed`);
    });
  } catch (err) {
    console.log(err);
  }
}
async function recogniseAudio(win2) {
  const recordedAudioPath = path.join(recordingDirectory);
  const pathToRecorder = path.join(recordingDirectory, "Rec.exe");
  let pythonOutput = "";
  console.log("calling Rec.exe");
  const recorder = spawn(pathToRecorder, [recordingDirectory + "\\"], {
    stdio: ["pipe", "pipe", "pipe"],
    encoding: "utf8"
  });
  recorder.on("error", (err) => {
    console.error("Recorder encountered an error");
  });
  recorder.on("exit", (code, signal) => {
    console.log("Recorder Finished Recording");
    console.log(pythonDir);
    setTimeout(() => {
      const audio_sample_path = path.join(recordedAudioPath, "myRecording.wav");
      const pythonRecogniseScript = path.join(__dirname, "python/acrCloud/acrTest.py");
      const pythonProcess = spawn("python", [pythonRecogniseScript, audio_sample_path], {
        stdio: ["pipe", "pipe", "pipe"],
        encoding: "utf8"
      });
      pythonProcess.on("error", (err) => {
        console.error("Recorder encountered an error");
      });
      pythonProcess.on("exit", (code2, signal2) => {
        console.log("Finished without errors");
        console.log(pythonOutput);
        win2 == null ? void 0 : win2.webContents.send("found-song", pythonOutput.toString());
      });
      if (pythonProcess.stdout) {
        pythonProcess.stdout.on("data", (data) => {
          console.log("data:", data);
          pythonOutput = data.toString("utf8").trim();
          console.log(pythonOutput);
          console.log("Sending 'found-song' signal");
        });
      }
    }, 500);
  });
}
function openBrowser(url) {
  electron.shell.openExternal(url);
}
function limitListeners() {
  electron.ipcMain.setMaxListeners(1);
}
function exposeToFrontEnd(functions, window) {
  functions.forEach((func) => {
    electron.ipcMain.handle(func.name, async (event, ...args) => {
      try {
        if (func == downloadPlaylist || func == recogniseAudio) {
          return func(...args, window);
        }
        return await func(...args);
      } catch (err) {
        console.log("Error bc: ", err);
      }
    });
  });
}
function setUpDirectoryManager(win2) {
  const functions = [
    fetchAllPlaylists,
    downloadPlaylist,
    fetchSongs,
    recogniseAudio,
    openBrowser
  ];
  exposeToFrontEnd(functions, win2 = win2);
}
process.env.DIST = path$1.join(__dirname, "../dist");
process.env.VITE_PUBLIC = electron.app.isPackaged ? process.env.DIST : path$1.join(process.env.DIST, "../public");
let win;
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
function createWindow() {
  win = new electron.BrowserWindow({
    icon: path$1.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    webPreferences: {
      preload: path$1.join(__dirname, "preload.js"),
      webSecurity: false,
      nodeIntegration: true
    },
    frame: false,
    transparent: true,
    skipTaskbar: true,
    fullscreen: true,
    show: true
    //when starting 
  });
  win == null ? void 0 : win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  win.setAlwaysOnTop(true, "normal");
  win.webContents.on("did-finish-load", () => {
    win == null ? void 0 : win.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  });
  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path$1.join(process.env.DIST, "index.html"));
  }
}
electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    electron.app.quit();
    win = null;
  }
});
electron.app.on("activate", () => {
  if (electron.BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
function startApp() {
  console.log("Starting App Initialization...");
  createDataFolder();
  console.log("Data folders verified.");
  createWindow();
  console.log("Window created.");
  setUpDirectoryManager(win);
  console.log("Directory manager set up.");
  limitListeners();
  console.log("Listeners limited.");
  setUpShortcut("Alt+M", win);
  console.log("Shortcut registered.");
  setUpMouseListeners(win);
  console.log("Mouse listeners set up. Initialization complete.");
}
electron.app.whenReady().then(startApp);
