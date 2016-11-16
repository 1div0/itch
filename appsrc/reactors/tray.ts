
import {Watcher} from "./watcher";

import * as ospath from "path";
import os from "../util/os";
import localizer from "../localizer";
import {app, Menu, Tray, IMenuTemplate} from "../electron";

import {createSelector} from "reselect";

import * as actions from "../actions";

import {IStore, IState, II18nState} from "../types";
import {IAction, IBootPayload, INotifyPayload} from "../constants/action-types";
import {Action} from "redux-actions";

import {EventEmitter} from "events";

// used to glue balloon click with notification callbacks
let lastNotificationAction: Action<any>;

interface IBalloonOpts {
  title: string;
  icon: string;
  content: string;
}

interface ITray extends EventEmitter {
  setToolTip(message: string): void;
  setContextMenu(menu: IMenuTemplate): void;
  displayBalloon(opts: IBalloonOpts): void;
}
let tray: ITray;

function makeTray (store: IStore) {
  // cf. https://github.com/itchio/itch/issues/462
  // windows still displays a 16x16, whereas
  // some linux DEs don't know what to do with a @x2, etc.
  const iconName = os.platform() === "linux" ? `${app.getName()}.png` : `${app.getName()}-small.png`;
  const iconPath = ospath.resolve(`${__dirname}/../static/images/tray/${iconName}`);
  tray = new Tray(iconPath);
  tray.setToolTip("itch.io");
  tray.on("click", () => store.dispatch(actions.focusWindow({toggle: true})));
  tray.on("double-click", () => store.dispatch(actions.focusWindow({})));
  tray.on("balloon-click", () => {
    if (lastNotificationAction) {
      store.dispatch(lastNotificationAction);
    }
  });
}

function setMenu (trayMenu: IMenuTemplate, store: IStore) {
  if (os.platform() === "darwin") {
    app.dock.setMenu(trayMenu);
  } else {
    if (!tray) {
      makeTray(store);
    }
    tray.setContextMenu(trayMenu);
  }
}

async function go (store: IStore, path: string) {
  store.dispatch(actions.focusWindow({}));
  store.dispatch(actions.navigate(path));
}

function refreshTray (store: IStore, i18n: II18nState) {
  const t = localizer.getT(i18n.strings, i18n.lang);
  const menuTemplate: IMenuTemplate = [
    {label: t("sidebar.owned"), click: () => go(store, "library")},
    {label: t("sidebar.dashboard"), click: () => go(store, "dashboard")},
  ];

  if (os.platform() !== "darwin") {
    menuTemplate.push({type: "separator"});
    menuTemplate.push({
      label: t("menu.file.quit"),
      click: () => store.dispatch(actions.quit({})),
    });
  }

  const trayMenu = Menu.buildFromTemplate(menuTemplate);
  setMenu(trayMenu, store);
}

// TODO: make the tray a lot more useful? that'd be good.
// (like: make it display recent stuff / maybe the last few tabs)

let traySelector: (state: IState, props?: any) => void;
const makeTraySelector = (store: IStore) => createSelector(
  (state: IState) => state.i18n,
  (i18n) => {
    setImmediate(() => {
      refreshTray(store, i18n);
    });
  }
);

let hasBooted = false;

export function getTray () {
  return tray;
}

export default function (watcher: Watcher) {
  watcher.on(actions.boot, async (store, action) => {
    hasBooted = true;
  });

  watcher.onAll(async (store, action) => {
    if (!hasBooted) {
      return;
    }
    if (!traySelector) {
      traySelector = makeTraySelector(store);
    }
    traySelector(store.getState());
  });

  watcher.on(actions.notify, async (store, action) => {
    lastNotificationAction = action.payload.onClick;
  });
}
