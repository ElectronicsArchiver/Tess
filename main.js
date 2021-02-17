const time1 = new Date().getTime()

const { app, BrowserWindow, ipcMain : ipc} = require('electron')

const pty = require("node-pty");
const RPC = require('discord-rpc')

const rpc = new RPC.Client({
    transport : "ipc"
});

rpc.on('ready',() => {
    rpc.setActivity({
        details : "Writting command...",
        largeImageKey : "icon",
        startTimestamp : new Date()
    })
})

rpc.login({
    clientId : "811294906517422130"
})


let mainWindow;
let shells = []

function openWindow() {
    mainWindow = new BrowserWindow({
        webPreferences: {
            nodeIntegration: true
        }
    });
    mainWindow.removeMenu()
    mainWindow.loadFile("src/index.html")
    mainWindow.on("closed", function() {
        mainWindow = null;
    });
    mainWindow.on('resize',() =>{
        try {
            mainWindow.webContents.send('resize')
        } catch (err) {
            console.log(err)
        }
    })


    ipc.on("load-end", (e, ea) => {
        time2 = new Date().getTime()
        time = time2 - time1
        console.log("launch in :" + time + "ms")
    })
}


ipc.on('new-term', (e, data) => {
    let shell = pty.spawn("bash", [], {
        name: "xterm-color",
        cols : data.cols,
        rows : data.rows,
        cwd: process.env.HOME,
        env: process.env,
    })

    shell.on('data', (datas) => {
        try {
            mainWindow.webContents.send('pty-data', {
                index : data.index,
                data : datas
            })
        } catch (err) {
            console.log(err)
        }
    })

    let s = {
        index : data.index,
        shell : shell
    }

    shells.push(s)
})

ipc.on('terminal-data', (e, data) => {
    shells.forEach((el) => {
        if (el.index == data.index) {
            el.shell.write(data.data)
        } 
    })
})


// App events
app.on("ready", openWindow);

app.on("window-all-closed", function() {
    if (process.platform !== "darwin") {
        app.quit();
    }
});

app.on("activate", function() {
    if (mainWindow == null) {
        createWindow();
    }
});


ipc.on("close-terminal", (e, data) => {
    let y = 0
    shells.forEach((el) => {
        if (el.index == data) {
            el.shell.kill()
            shells.splice(y, 1)
        }
        y++;
    })
})

ipc.on('close', (e,data) => {
    app.quit()
})

ipc.on('resize', (e, data) => {
    shells.forEach((el) => {
        el.shell.resize(data.cols, data.rows)
    })
})