// Keep update networking and installation in the main process. The renderer
// receives no new privileges, and downloading/restarting both require a choice.
function createUpdateController({ updater, showMessage, openRelease, canInstall, arch }) {
  updater.autoDownload = false;
  updater.autoInstallOnAppQuit = false;
  updater.allowPrerelease = false;
  updater.channel = `latest-${arch}`;
  // Setting channel enables downgrades in electron-updater; restore our policy.
  updater.allowDowngrade = false;
  updater.disableWebInstaller = true;

  let busy = false;
  let downloaded = false;
  let installing = false;

  const showFailure = () => showMessage({
    type: "info",
    message: "Could not update Journal Today",
    detail: "Check your connection and try again later. You can also download the latest version from GitHub.",
    buttons: ["OK"],
  });

  // Update methods can reject and emit an error for the same failure. Handle
  // check/download rejections below, and installation failures here.
  updater.on("error", () => {
    if (installing) {
      installing = false;
      void showFailure().catch(() => {});
    }
  });

  async function offerRestart() {
    const { response } = await showMessage({
      type: "info",
      message: "Your update is ready",
      detail: "Restart Journal Today to install it. Your journal is saved when the window closes.",
      buttons: ["Later", "Restart and install"],
      defaultId: 0,
      cancelId: 0,
    });
    if (response === 1) {
      installing = true;
      // Normal Electron quit/close events flush the renderer's pending save.
      updater.quitAndInstall(false, true);
    }
  }

  async function check(manual = false) {
    if (busy) {
      if (manual) await showMessage({ type: "info", message: "An update check or download is already in progress", buttons: ["OK"] });
      return;
    }
    busy = true;
    let downloading = false;
    try {
      if (downloaded) {
        if (manual) await offerRestart();
        return;
      }
      const result = await updater.checkForUpdates();
      if (!result) {
        if (manual) {
          const { response } = await showMessage({
            type: "info",
            message: "Get the latest Journal Today from GitHub",
            detail: "This copy cannot check for updates automatically. Open downloads to install the latest version.",
            buttons: ["Later", "Open downloads"],
            defaultId: 0,
            cancelId: 0,
          });
          if (response === 1) await openRelease();
        }
        return;
      }
      if (!result.isUpdateAvailable) {
        if (manual) await showMessage({ type: "info", message: "Journal Today is up to date", buttons: ["OK"] });
        return;
      }
      const { response } = await showMessage({
        type: "info",
        message: `Journal Today ${result.updateInfo.version} is available`,
        detail: canInstall
          ? "Download the update now and choose when to restart."
          : "Download and install the new version from GitHub.",
        buttons: ["Later", canInstall ? "Download update" : "Open downloads"],
        defaultId: 0,
        cancelId: 0,
      });
      if (response !== 1) return;
      if (!canInstall) {
        await openRelease();
        return;
      }
      downloading = true;
      await updater.downloadUpdate();
      downloaded = true;
      await offerRestart();
    } catch {
      // Offline background checks should never interrupt writing.
      if (manual || downloading || installing) await showFailure();
      installing = false;
    } finally {
      busy = false;
    }
  }

  return { check };
}

module.exports = { createUpdateController };
