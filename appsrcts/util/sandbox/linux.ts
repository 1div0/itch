
import * as tmp from "tmp";
import * as ospath from "path";

import spawn from "../spawn";
import sf from "../sf";
// import ibrew from '../ibrew'
const ibrew = require("../ibrew").default;

import mklog from "../log";
const log = mklog("sandbox-linux");

import common from "./common";

import { ICheckResult, INeed } from "./types";

export async function check(opts: any): Promise<ICheckResult> {
  const needs: INeed[] = [];
  const errors: Error[] = [];

  log(opts, "Testing firejail");
  const firejailCheck = await spawn.exec({ command: "firejail", args: ["--noprofile", "--", "whoami"] });
  if (firejailCheck.code !== 0) {
    needs.push({
      type: "firejail",
      code: firejailCheck.code,
      err: firejailCheck.err,
    });
  }

  return { needs, errors };
}

export async function install(opts: any, needs: INeed[]) {
  return await common.tendToNeeds(opts, needs, {
    firejail: async function (need) {
      log(opts, `installing firejail, because ${need.err} (code ${need.code})`);

      const firejailBinary = ospath.join(ibrew.binPath(), "firejail");
      const firejailBinaryExists = await sf.exists(firejailBinary);
      if (!firejailBinaryExists) {
        throw new Error("firejail binary missing");
      } else {
        const lines: string[] = [];
        lines.push("#!/bin/bash -xe");
        lines.push(`chown root:root ${firejailBinary}`);
        lines.push(`chmod u+s ${firejailBinary}`);

        log(opts, "Making firejail binary setuid");
        await sudoRunScript(lines);
      }
    },
  });
}

export async function uninstall(opts: any) {
  const errors: Error[] = [];
  return { errors };
}

interface ISudoRunScriptResult {
  out: string;
}

async function sudoRunScript(lines: string[]): Promise<ISudoRunScriptResult> {
  const contents = lines.join("\n");
  const tmpObjName = tmp.tmpNameSync();
  await sf.writeFile(tmpObjName, contents);
  await sf.chmod(tmpObjName, 0o777);

  const res = await spawn.exec({ command: "pkexec", args: [tmpObjName] });

  await sf.wipe(tmpObjName);

  if (res.code !== 0) {
    throw new Error(`pkexec failed with code ${res.code}, stderr = ${res.err}`);
  }

  return { out: res.out };
}

export default { check, install, uninstall };
