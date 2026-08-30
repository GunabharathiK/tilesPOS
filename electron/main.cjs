const { app, BrowserWindow, dialog } = require("electron");
const path = require("path");
const { fork } = require("child_process");
const http = require("http");

const SERVER_PORT = Number(process.env.PORT || 5000);
let mainWindow = null;
let serverProcess = null;

const isDev = !app.isPackaged;

const resolveAppPath = (...parts) => path.join(__dirname, "..", ...parts);

const getServerEntry = () => {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "server", "src", "server.js");
  }
  return resolveAppPath("server", "src", "server.js");
};

const getServerCwd = () => {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "server");
  }
  return resolveAppPath("server");
};

const getClientIndex = () => {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "client-dist", "index.html");
  }
  return resolveAppPath("client", "dist", "index.html");
};

const waitForServer = (timeoutMs = 20000) =>
  new Promise((resolve, reject) => {
    const startedAt = Date.now();

    const tryConnect = () => {
      const req = http.get(`http://127.0.0.1:${SERVER_PORT}/api/license/status`, (res) => {
        res.resume();
        resolve();
      });

      req.on("error", () => {
        if (Date.now() - startedAt > timeoutMs) {
          reject(new Error("Server did not start in time"));
          return;
        }
        setTimeout(tryConnect, 500);
      });
    };

    tryConnect();
  });

const createWindow = async () => {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 760,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  await mainWindow.loadFile(getClientIndex());
};

const startServer = () => {
  const env = {
    ...process.env,
    PORT: String(SERVER_PORT),
  };

  serverProcess = fork(getServerEntry(), {
    cwd: getServerCwd(),
    env,
    stdio: "inherit",
  });

  serverProcess.on("exit", (code) => {
    if (code !== 0) {
      dialog.showErrorBox(
        "Tiles POS Server Error",
        `The local backend stopped with exit code ${code}. Check MongoDB and your server environment variables.`
      );
    }
  });
};

app.whenReady().then(async () => {
  try {
    startServer();
    await waitForServer();
    await createWindow();
  } catch (error) {
    dialog.showErrorBox(
      "Tiles POS Startup Failed",
      `${error.message}\n\nMake sure MongoDB and server environment variables are configured correctly.`
    );
    app.quit();
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
});
