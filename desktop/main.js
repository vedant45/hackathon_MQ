const { app, BrowserWindow } = require("electron");

function createWindow() {
  const win = new BrowserWindow({
    width: 1440, height: 900, minWidth: 1100, minHeight: 700,
    title: "CampusNest", autoHideMenuBar: true,
  });
  // Keep retrying until the Next.js server is up
  const load = () => win.loadURL("http://localhost:3000").catch(() => setTimeout(load, 1500));
  load();
}

app.whenReady().then(createWindow);
app.on("window-all-closed", () => app.quit());