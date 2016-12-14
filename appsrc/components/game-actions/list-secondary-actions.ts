
import {findWhere} from "underscore";

import * as actions from "../../actions";
import format, {DATE_FORMAT} from "../../util/format";
import store from "../../store";

import {
  IGameRecord, ICaveRecord, IDownloadKey, ClassificationAction,
  ILocalizedString, IStore
} from "../../types";

import {IAction} from "../../constants/action-types";

import {ILocalizer} from "../../localizer";

export type ActionType = "secondary" | "separator" | "info";

export interface IActionOpts {
  type?: ActionType;
  label?: ILocalizedString;
  icon?: string;
  action?: IAction<any>;
  classes?: string[];
  hint?: string;
}

function browseAction (caveId: string): IActionOpts {
  return {
    type: "secondary",
    label: ["grid.item.show_local_files"],
    icon: "folder-open",
    action: actions.exploreCave({caveId}),
  };
}

function purchaseAction (game: IGameRecord, downloadKey: IDownloadKey, t: ILocalizer): IActionOpts {
  const donate = (game.minPrice === 0);
  const againSuffix = downloadKey ? "_again" : "";
  const hint = downloadKey ? format.date(downloadKey.createdAt, DATE_FORMAT, t.lang) : null;

  if (donate) {
    return {
      label: ["grid.item.donate" + againSuffix],
      icon: "heart-filled",
      action: actions.initiatePurchase({game}),
      classes: ["generous"],
      hint,
    };
  } else {
    return {
      label: ["grid.item.buy_now" + againSuffix],
      icon: "shopping_cart",
      action: actions.initiatePurchase({game}),
      classes: ["generous"],
      hint,
    };
  }
}

function shareAction (game: IGameRecord): IActionOpts {
  return {
    label: ["grid.item.share"],
    icon: "share",
    classes: ["generous"],
    action: actions.initiateShare({url: game.url}),
  };
}

function uninstallAction (caveId: string): IActionOpts {
  return {
    label: ["grid.item.uninstall"],
    icon: "uninstall",
    action: actions.requestCaveUninstall({caveId}),
  };
}

interface IListSecondaryActionsProps {
  game: IGameRecord;
  cave: ICaveRecord;
  downloadKey: IDownloadKey;

  mayDownload: boolean;
  canBeBought: boolean;

  action: ClassificationAction;

  t: ILocalizer;
}

export default function listSecondaryActions (props: IListSecondaryActionsProps) {
  const {game, cave, mayDownload, canBeBought, downloadKey, action, t} = props;
  let error = false;

  const items: IActionOpts[] = [];

  if (cave) {
    // No errors
    if (canBeBought) {
      items.push(purchaseAction(game, downloadKey, t));
    }
    items.push(shareAction(game));

    items.push({
      type: "separator",
    });

    if (action !== "open") {
      items.push(browseAction(cave.id));
    }

    let version = "";
    if (cave.buildUserVersion) {
      version = `${cave.buildUserVersion}`;
    } else if (cave.buildId) {
      version = `#${cave.buildId}`;
    }

    const upload = findWhere(cave.uploads, {id: cave.uploadId});
    if (upload && upload.displayName) {
      version += ` (${upload.displayName})`;
    } else if (cave.channelName) {
      version += ` (${cave.channelName})`;
    } else if (cave.uploadId) {
      version += ` #${cave.uploadId}`;
    }

    // FIXME: this will display the wrong date for builds
    const hint = `${format.date(cave.installedArchiveMtime, DATE_FORMAT, t.lang)}`;

    items.push({
      type: "info",
      icon: "checkmark",
      label: ["grid.item.version", {version}],
      hint: hint,
      action: actions.copyToClipboard({text: `game ${game.id}, version ${version}`}),
    });

    let busy = false;

    const state = store.getState();
    const tasksForGame = state.tasks.tasksByGameId[game.id];
    if (tasksForGame && tasksForGame.length > 0) {
      busy = true;
    }

    if (!busy) {
      items.push({
        type: "secondary",
        icon: "repeat",
        label: ["grid.item.check_for_update"],
        action: actions.checkForGameUpdate({caveId: cave.id, noisy: true}),
      });

      items.push(uninstallAction(cave.id));
    }
  } else {
    // No cave
    const hasMinPrice = game.minPrice > 0;
    const mainIsPurchase = !mayDownload && hasMinPrice && canBeBought;

    if (!mainIsPurchase && canBeBought) {
      items.push(purchaseAction(game, downloadKey, t));
    }

    items.push(shareAction(game));

    items.push({
      type: "separator",
    });
  }

  return {error, items};
}
