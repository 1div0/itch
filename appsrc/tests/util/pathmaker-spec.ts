
// tslint:disable:no-shadowed-variable

import * as ospath from "path";
import test = require("zopf");
import pathmaker from "../../util/pathmaker";
import {app} from "../../electron";

import {IUploadRecord} from "../../types";

test("pathmaker", t => {
  t.case("downloadPath", t => {
    t.same(pathmaker.downloadPath({
      filename: "voices.tar.gz",
      id: 1990,
    } as any as IUploadRecord), ospath.join(app.getPath("userData"), "downloads", "1990.tar.gz"));
    t.same(pathmaker.downloadPath({
      filename: "FACES OF WRATH.TAR.BZ2",
      id: 1997,
    } as any as IUploadRecord), ospath.join(app.getPath("userData"), "downloads", "1997.tar.bz2"));
    t.same(pathmaker.downloadPath({
      filename: "2019.07.21.zip",
      id: 1990,
    } as any as IUploadRecord), ospath.join(app.getPath("userData"), "downloads", "1990.zip"));
    t.same(pathmaker.downloadPath({
      filename: "the-elusive-extless-file",
      id: 1994,
    } as any as IUploadRecord), ospath.join(app.getPath("userData"), "downloads", "1994"));
  });
});
