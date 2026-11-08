const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const { test } = require("node:test");
const { createUpdateController } = require("../../electron/updates.cjs");

function setup({ responses = [], available = true, canInstall = true, failCheck = false, failDownload = false } = {}) {
  const updater = new EventEmitter();
  const calls = { checks: 0, downloads: 0, installs: 0, links: 0, dialogs: [] };
  updater.checkForUpdates = async () => {
    calls.checks++;
    if (failCheck) {
      const error = new Error("sensitive diagnostic that must not reach the dialog");
      updater.emit("error", error);
      throw error;
    }
    return { isUpdateAvailable: available, updateInfo: { version: "0.2.0" } };
  };
  updater.downloadUpdate = async () => {
    calls.downloads++;
    if (failDownload) throw new Error("download failed");
  };
  updater.quitAndInstall = () => { calls.installs++; };
  const controller = createUpdateController({
    updater, arch: "arm64", canInstall,
    showMessage: async (options) => { calls.dialogs.push(options); return { response: responses.shift() ?? 0 }; },
    openRelease: async () => { calls.links++; },
  });
  return { updater, calls, controller };
}

test("checks use the correct architecture and require download/restart consent", async () => {
  const { updater, calls, controller } = setup();
  assert.equal(updater.channel, "latest-arm64");
  assert.equal(updater.autoDownload, false);
  assert.equal(updater.autoInstallOnAppQuit, false);
  assert.equal(updater.allowDowngrade, false);
  assert.equal(updater.allowPrerelease, false);
  await controller.check();
  assert.equal(calls.downloads, 0);
  assert.equal(calls.installs, 0);
});

test("deferring restart preserves the ready update for a later menu check", async () => {
  const { calls, controller } = setup({ responses: [1, 0, 1] });
  await controller.check(true);
  assert.equal(calls.downloads, 1);
  assert.equal(calls.installs, 0);
  await controller.check(true);
  assert.equal(calls.checks, 1);
  assert.equal(calls.downloads, 1);
  assert.equal(calls.installs, 1);
});

test("unsigned Mac or unpacked Linux opens downloads without running an installer", async () => {
  const { calls, controller } = setup({ canInstall: false, responses: [1] });
  await controller.check(true);
  assert.equal(calls.links, 1);
  assert.equal(calls.downloads, 0);
  assert.equal(calls.installs, 0);
});

test("offline background checks stay silent and manual errors hide diagnostics", async () => {
  const { calls, controller } = setup({ failCheck: true });
  await controller.check();
  assert.equal(calls.dialogs.length, 0);
  await controller.check(true);
  assert.equal(calls.dialogs.length, 1);
  assert.doesNotMatch(JSON.stringify(calls.dialogs), /sensitive diagnostic/);
  assert.equal(calls.installs, 0);
});

test("failed downloads never offer restart and can be retried", async () => {
  const { calls, controller } = setup({ failDownload: true, responses: [1, 0, 1] });
  await controller.check(true);
  await controller.check(true);
  assert.equal(calls.downloads, 2);
  assert.equal(calls.installs, 0);
  assert.equal(calls.dialogs.filter(({ message }) => message === "Your update is ready").length, 0);
});

test("repeated checks cannot start concurrent downloads", async () => {
  const { updater, calls, controller } = setup({ responses: [1, 0] });
  let finish;
  updater.downloadUpdate = () => { calls.downloads++; return new Promise((resolve) => { finish = resolve; }); };
  const first = controller.check();
  await new Promise(setImmediate);
  await controller.check();
  assert.equal(calls.checks, 1);
  assert.equal(calls.downloads, 1);
  finish();
  await first;
});

test("an unchanged release stays silent except for explicit menu checks", async () => {
  const { calls, controller } = setup({ available: false });
  await controller.check();
  assert.equal(calls.dialogs.length, 0);
  await controller.check(true);
  assert.equal(calls.dialogs[0].message, "Journal Today is up to date");
});

test("an inactive updater offers manual downloads instead of claiming to be current", async () => {
  const { updater, calls, controller } = setup({ responses: [1] });
  updater.checkForUpdates = async () => null;
  await controller.check();
  assert.equal(calls.dialogs.length, 0);
  await controller.check(true);
  assert.equal(calls.links, 1);
  assert.equal(calls.downloads, 0);
  assert.doesNotMatch(JSON.stringify(calls.dialogs), /is up to date/);
});
