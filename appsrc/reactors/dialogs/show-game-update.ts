
import * as actions from "../../actions";

import makeUploadButton from "../make-upload-button";

import {map} from "underscore";
import {Watcher} from "../watcher";

import {ILocalizedString, IModalButtonSpec} from "../../types";

export default function (watcher: Watcher) {
  watcher.on(actions.showGameUpdate, async (store, action) =>  {
    const update = action.payload.update;
    const {game} = update;

    const {title} = game;

    let dialogTitle: ILocalizedString;
    let dialogMessage: ILocalizedString;
    let dialogDetail: ILocalizedString;

    const dialogButtons = [] as IModalButtonSpec[];
    const single = update.recentUploads.length === 1;

    if (single) {
      dialogTitle = ["pick_update_upload.single.title", {title}];
      dialogMessage = ["pick_update_upload.single.message", {title}];
      dialogDetail = ["pick_update_upload.single.detail"];

      const upload = update.recentUploads[0];
      dialogButtons.push({
        icon: "download",
        label: ["pick_update_upload.buttons.update"],
        action: actions.queueGameUpdate(Object.assign({}, action.payload, {upload})),
      });
    } else {
      dialogTitle = ["pick_update_upload.title", {title}];
      dialogMessage = ["pick_update_upload.message", {title}];
      dialogDetail = ["pick_update_upload.detail"];
    }

    dialogButtons.push({
      icon: "rocket",
      label: ["pick_update_upload.buttons.just_launch"],
      action: actions.queueGame({game}),
      className: "secondary",
    });
    dialogButtons.push("cancel");

    store.dispatch(actions.openModal({
      title: dialogTitle,
      message: dialogMessage,
      detail: dialogDetail,
      bigButtons: map(update.recentUploads, (upload) => {
        return Object.assign({}, makeUploadButton(upload, {showSize: false}), {
          timeAgo: {
            label: ["prompt.updated_ago"],
            date: Date.parse(upload.updatedAt),
          },
          action: actions.queueGameUpdate(Object.assign({}, action.payload, {upload, handPicked: (!single)})),
        });
      }),
      buttons: dialogButtons,
    }));
  });
};
