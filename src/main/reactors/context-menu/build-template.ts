import { IMenuTemplate, IMenuItem, IStore } from "common/types";
import { actions } from "common/actions";

import { isEmpty } from "underscore";
import getGameStatus, {
  Access,
  OperationType,
  IOperation,
} from "common/helpers/get-game-status";
import { showInExplorerString } from "common/format/show-in-explorer";
import { formatOperation } from "common/format/operation";
import { Game } from "common/butlerd/messages";
import { actionForGame } from "common/util/action-for-game";

export function concatTemplates(
  a: IMenuTemplate,
  b: IMenuTemplate
): IMenuTemplate {
  if (isEmpty(a)) {
    return b;
  }

  if (isEmpty(b)) {
    return a;
  }

  return [...a, { type: "separator" }, ...b];
}

export function newTabControls(
  store: IStore,
  window: string,
  tab: string
): IMenuTemplate {
  return [
    {
      localizedLabel: ["menu.file.new_tab"],
      accelerator: "CmdOrCtrl+T",
      action: actions.newTab({ window }),
    },
  ];
}

export function closeTabControls(
  store: IStore,
  window: string,
  tab: string
): IMenuTemplate {
  // TODO: disable some menu items if last transient tab, or constant tab
  const rs = store.getState();
  const { constant } = rs.windows[window].navigation.openTabs;
  const isEssential = constant.indexOf(tab) !== -1;

  return [
    {
      localizedLabel: ["menu.file.close_tab"],
      accelerator: "CmdOrCtrl+W",
      action: actions.closeTab({ window, tab }),
      enabled: !isEssential,
    },
    {
      localizedLabel: ["menu.file.close_other_tabs"],
      action: actions.closeOtherTabs({ window, tab }),
      enabled: !isEssential,
    },
    {
      localizedLabel: ["menu.file.close_tabs_below"],
      action: actions.closeTabsBelow({ window, tab }),
      enabled: !isEssential,
    },
  ];
}

export function gameControls(store: IStore, game: Game): IMenuTemplate {
  let template: IMenuTemplate = [];

  const status = getGameStatus(store.getState(), game);
  const { cave, numCaves, operation } = status;

  const mainAction = actionForGame(game, cave);

  let statusItems: IMenuTemplate = [];

  const itemForOperation = (operation: IOperation): IMenuItem => {
    const localizedLabel = formatOperation(operation);
    if (operation.name === "launch") {
      return {
        localizedLabel,
        submenu: [
          {
            localizedLabel: ["prompt.action.force_close"],
            action: actions.forceCloseGameRequest({ game }),
          },
        ],
      };
    } else {
      const item: IMenuItem = {
        localizedLabel,
        enabled: false,
      };

      if (operation.type === OperationType.Download && operation.id) {
        item.submenu = [
          {
            localizedLabel: ["grid.item.discard_download"],
            action: actions.discardDownload({ id: operation.id }),
          },
        ];
      }
      return item;
    }
  };

  if (cave) {
    let busy = false;

    if (operation) {
      busy = true;
      statusItems.push(itemForOperation(operation));
    } else {
      statusItems.push({
        localizedLabel: [`grid.item.${mainAction}`],
        action: actions.queueGame({ game }),
      });
    }

    let updateAndLocalItems: IMenuTemplate = [];

    if (!busy) {
      updateAndLocalItems.push({
        localizedLabel: ["grid.item.check_for_update"],
        action: actions.checkForGameUpdate({ caveId: cave.id, noisy: true }),
      });
    }

    updateAndLocalItems.push({
      localizedLabel: showInExplorerString(),
      action: actions.exploreCave({ caveId: cave.id }),
    });

    template = concatTemplates(template, updateAndLocalItems);

    if (!busy) {
      let uninstallReinstallItems: IMenuTemplate = [];
      uninstallReinstallItems.push({
        id: "context--grid-item-manage",
        localizedLabel: ["grid.item.manage"],
        action: actions.manageGame({ game }),
      });

      if (numCaves === 1) {
        uninstallReinstallItems.push({
          type: "separator",
        });
        uninstallReinstallItems.push({
          id: "context--grid-item-uninstall",
          localizedLabel: ["grid.item.uninstall"],
          action: actions.requestCaveUninstall({ caveId: cave.id }),
        });
      }

      template = concatTemplates(template, uninstallReinstallItems);
    }
  } else {
    if (operation) {
      statusItems.push(itemForOperation(operation));
    } else {
      if (status.access === Access.None) {
        if (game.canBeBought) {
          statusItems.push({
            localizedLabel: ["grid.item.buy_now"],
            action: actions.initiatePurchase({ game }),
          });
        } else {
          // welp
        }
      } else {
        // we have any kind of access
        statusItems.push({
          localizedLabel: ["grid.item.install"],
          action: actions.queueGame({ game }),
        });
      }
    }
  }

  // prepend status items
  template = concatTemplates(statusItems, template);

  return template;
}
