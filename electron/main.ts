import { app, BrowserWindow } from 'electron'

import path from 'node:path'
import { createDataFolder, setUpMouseListeners, setUpShortcut } from './util/util'
import { setUpDirectoryManager } from './util/expose'
import { limitListeners } from './util/util'
// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.js
// │
process.env.DIST = path.join(__dirname, '../dist')
process.env.VITE_PUBLIC = app.isPackaged ? process.env.DIST : path.join(process.env.DIST, '../public')


let win: BrowserWindow | null
// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']

function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      webSecurity:false,
      nodeIntegration:true,
    },
    frame:false,
    transparent:true, 
    skipTaskbar:true,
    fullscreen:true,
    show:true, //when starting 
  })

  win?.setVisibleOnAllWorkspaces(true, {visibleOnFullScreen:true})
  win.setAlwaysOnTop(true, "normal")

  
  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(process.env.DIST, 'index.html'))
  }
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})


function startApp(){
  console.log("Starting App Initialization...");
  createDataFolder()
  console.log("Data folders verified.");

  createWindow()
  console.log("Window created.");

  setUpDirectoryManager(win)
  console.log("Directory manager set up.");
  
  limitListeners()
  console.log("Listeners limited.");

  // Opening dev tools in detached mode can sometimes cause hangs on some systems
  // win?.webContents.openDevTools({mode:"detach"})

  setUpShortcut("Alt+M", win)
  console.log("Shortcut registered.");

  setUpMouseListeners(win)
  console.log("Mouse listeners set up. Initialization complete.");
}




app.whenReady().then(startApp)
