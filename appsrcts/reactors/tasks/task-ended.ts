
import {values, findWhere} from "underscore";

import {getGlobalMarket} from "../market";

import {startTask} from "./start-task";
import {log, opts} from "./log";

import * as actions from "../../actions";

import {IStore, ICaveRecord} from "../../types/db";
import {IAction, ITaskEndedPayload} from "../../constants/action-types";

export async function taskEnded (store: IStore, action: IAction<ITaskEndedPayload>) {
  const {taskOpts, result, err} = action.payload;
  const {name} = taskOpts;

  if (err) {
    log(opts, `Error in task ${name}: ${err}`);
    if (name === "install") {
      log(opts, "Install failed, attempting to destroy cave");
      const {gameId} = taskOpts;
      const cave = findWhere(values(getGlobalMarket().getEntities("caves")), {gameId}) as ICaveRecord;
      if (cave && cave.fresh) {
        store.dispatch(actions.implodeCave({caveId: cave.id}));
      }
    }
    return;
  }

  if (name === "install") {
    const {game, gameId, upload} = taskOpts;
    const {caveId} = result;

    const cave = getGlobalMarket().getEntities("caves")[caveId];

    const {err: taskErr} = await startTask(store, {
      name: "configure",
      gameId,
      game,
      cave,
      upload,
    });
    if (taskErr) {
      log(opts, `Error in task ${name}: ${taskErr}`);
      return;
    }
  } else if (name === "launch") {
    const {gameId} = taskOpts;
    const state = store.getState();
    const tab = state.session.navigation.tabData[state.session.navigation.id];
    log(opts, `game ${gameId} just exited!`);

    if (tab && tab.path === `games/${gameId}`) {
      log(opts, "encouraging generosity!");
      store.dispatch(actions.encourageGenerosity({gameId: gameId, level: "discreet"}));
    }
  }
}
