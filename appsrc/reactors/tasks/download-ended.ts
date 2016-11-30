
import {Watcher} from "../watcher";
import * as actions from "../../actions";

import {startTask} from "./start-task";
import {log, opts} from "./log";

import {omit} from "underscore";

import localizer from "../../localizer";

export default function (watcher: Watcher) {
  watcher.on(actions.downloadEnded, async (store, action) => {
    const {downloadOpts} = action.payload;
    let {err} = action.payload;

    const {reason, incremental} = downloadOpts;
    if (reason === "install" || reason === "update" || reason === "reinstall"
        || reason === "revert" || reason === "heal") {
      if (err) {
        if (incremental) {
          log(opts, "Incremental didn\'t work, doing full download");
          const newDownloadOpts = Object.assign({}, omit(downloadOpts, "upgradePath", "incremental"), {
            totalSize: downloadOpts.upload.size,
          });
          store.dispatch(actions.queueDownload(newDownloadOpts));
        } else {
          log(opts, "Download had an error, should notify user");
        }
      } else {
        if (incremental) {
          // install folder was patched directly, no further steps needed
          return;
        }
        log(opts, `Download finished, starting ${reason}..`);

        const taskOpts = {
          name: "install",
          reinstall: (reason as string === "reinstall"),
          becauseHeal: downloadOpts.heal,
          gameId: downloadOpts.game.id,
          game: downloadOpts.game,
          upload: downloadOpts.upload,
          archivePath: downloadOpts.destPath,
          downloadKey: downloadOpts.downloadKey,
          handPicked: downloadOpts.handPicked,
        };

        const {err: installErr} = await startTask(store, taskOpts);
        if (installErr) {
          log(opts, `Error in install: ${installErr}`);
          return;
        }

        const prefs = store.getState().preferences || {readyNotification: true};
        const {readyNotification} = prefs;

        if (readyNotification) {
          let notificationMessage: string = null;
          let notificationOptions: any = {
            title: downloadOpts.game.title,
          };
          switch (reason) {
            case "install":
              notificationMessage = "notification.download_installed";
              break;
            case "update":
              notificationMessage = "notification.download_updated";
              break;
            case "revert":
              notificationMessage = "notification.download_reverted";
              notificationOptions.version = `#${downloadOpts.upload.buildId}`;
              break;
            case "heal":
              notificationMessage = "notification.download_healed";
              break;
            default:
              // make the typescript compiler happy
          }

          if (notificationMessage) {
            const i18n = store.getState().i18n;
            const t = localizer.getT(i18n.strings, i18n.lang);
            const message = t(notificationMessage, notificationOptions);
            store.dispatch(actions.notify({
              body: message,
              onClick: actions.navigateToGame(downloadOpts.game),
            }));
          }
        }
      }
    } else {
      log(opts, `Downloaded something for reason ${reason}`);
    }
  });
}
