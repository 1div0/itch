
import {net} from "../electron";

import * as querystring from "querystring";

import useragent from "../constants/useragent";

type HTTPMethod = "head" | "get" | "post"  | "put" | "patch" | "delete"

export interface IHeaders {
  [key: string]: string[];
}

export interface IResponse {
  statusCode: number;
  status: string;
  body: any;
  headers: IHeaders;
}

export class RequestError extends Error {
  constructor (message = "Request error") {
    super(message);
  }
}

export class RequestTimeout extends RequestError {
  constructor () {
    super("Request timed out");
  }
}

export class RequestAborted extends RequestError {
  constructor () {
    super("Request aborted");
  }
}

import {WriteStream} from "fs";

export interface IRequestCallback {
  (res: IResponse): void;
}

export interface IRequestOpts {
  sink?: WriteStream;
  cb?: IRequestCallback;
  format?: "json" | null;
}

async function request (method: HTTPMethod, uri: string, data: any = {}, opts: IRequestOpts = {}): Promise<IResponse> {
  let url = uri;

  if (method as string === "GET") {
    const query = querystring.stringify(data);
    if (query !== "") {
      url = `${url}?${query}`;
    }
  }

  const req = net.request({
    method,
    url,
  });
  req.setHeader("user-agent", useragent);

  const p = new Promise<IResponse>((resolve, reject) => {
    req.on("response", (res) => {
      const response = {
        statusCode: res.statusCode,
        status: res.statusMessage,
        body: null,
        headers: res.headers,
      } as IResponse;

      if (opts.cb) {
        opts.cb(response);
      }

      let text: any = "";

      if (opts.sink) {
        res.pipe(opts.sink);
      } else {
        res.setEncoding("utf8");
        res.on("data", function (chunk) {
          text += chunk;
        });
      }

      const contentTypeHeader = (res.headers["content-type"] || ["text/plain"])[0];
      const contentType = /[^;]*/.exec(contentTypeHeader)[0];

      res.on("end", async () => {
        if (opts.sink) {
          // all good, it's up to caller to wait on promised sink
        } else if (contentType === "application/json") {
          try {
            response.body = JSON.parse(text);
          } catch (e) {
            reject(e);
            return;
          }
        } else {
          response.body = text;
        }

        resolve(response);
      });
    });

    req.on("error", (error) => {
      reject(new RequestError(error.message));
    });

    req.on("abort", (error) => {
      reject(new RequestAborted());
    });

    req.on("login", (authInfo, callback) => {
      // cf. https://github.com/electron/electron/blob/master/docs/api/client-request.md
      // "Providing empty credentials will cancel the request and report
      // an authentication error on the response object"
      callback();
    });

    req.on("close", () => {
      // no-op
    });
    
    if (!opts.sink) {
      const timeout = 10 * 1000;
      setTimeout(() => {
        reject(new RequestTimeout());
        req.abort();
      }, timeout);
    }
  });

  if (method as string !== "GET") {
    let reqBody: string;
    if (opts.format === "json") {
      reqBody = JSON.stringify(data);
    } else {
      reqBody = querystring.stringify(data);
    }

    req.setHeader("content-type", "application/x-www-form-urlencoded");
    req.setHeader("content-length", String(Buffer.byteLength(reqBody)));
    req.write(reqBody);
  }

  req.end();

  return p;
}

export default {request};
