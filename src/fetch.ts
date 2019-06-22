import 'abort-controller/polyfill';
import poll from './poll';

let fetch: (input: RequestInfo, init?: RequestInit) => Promise<Response>;
let Headers: Headers;
let Request: Request;
let Response: Response;

if (typeof process !== 'undefined') {
  fetch = require('node-fetch').default;
  Headers = require('node-fetch').Headers;
  Request = require('node-fetch').Request;
  Response = require('node-fetch').Response;
} else {
  fetch = window.fetch;
  Headers = window.Headers;
  Request = window.Request;
  Response = window.Response;
}

interface MaybeResponse {
  msg?: string;
  message?: string;
  // tslint:disable-next-line: no-any
  [k: string]: any;
}

enum ResponseType {
  json = 'json',
  csv = 'csv',
  stream = 'stream',
  raw = 'raw',
}

interface Options extends RequestInit {
  retry?: boolean;
  retryDelay?: number;
  timeout?: number;
  responseType?: ResponseType;
  checkStatus?: (response: Response) => Response;
}

type FetchResult = Promise<string | MaybeResponse | Response>;

export { Headers, Request, Response };

export class FetchResponseError extends Error {
  status: number;
  statusText: string;
  response: string | MaybeResponse;

  constructor({
    status,
    statusText,
    response,
  }: {
    status: number;
    statusText: string;
    response: string | MaybeResponse;
  }) {
    let message: string;
    if (typeof response === 'object') {
      message = response.message || response.msg || 'FetchResponseError';
    } else {
      message = response;
    }

    super(message);

    this.name = 'FetchResponseError';
    this.message = message;
    this.status = status;
    this.statusText = statusText;
    this.response = response;
    this.stack = new Error().stack;
  }
}

export class FetchResponseJsonParseError extends Error {
  response: string | MaybeResponse;

  constructor(response: string | MaybeResponse) {
    let message: string;
    if (typeof response === 'object') {
      message = response.message || response.msg || 'FetchResponseJsonParseError';
    } else {
      message = response;
    }

    super(message);

    this.name = 'FetchResponseJsonParseError';
    this.message = message;
    this.response = response;
    this.stack = new Error().stack;
  }
}

export async function parseJSON(response: Response): Promise<MaybeResponse> {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new FetchResponseJsonParseError(text);
  }
}

async function defaultCheckStatus(resp: Response): Promise<Response> {
  const { status, statusText } = resp;
  if (status >= 200 && status < 300) {
    return resp;
  }

  let respContent;
  try {
    respContent = await parseJSON(resp);
  } catch (error) {
    respContent = error.response;
  }

  throw new FetchResponseError({ status, statusText, response: respContent });
}

export default function fetcher(url: string, customOptions: Options = {}): FetchResult {
  let retry = customOptions.retry || 0;
  let retryDelay = customOptions.retryDelay || 500;
  let responseType = customOptions.responseType || 'json';
  let checkStatus = customOptions.checkStatus || defaultCheckStatus;
  let timeout = customOptions.timeout || 0;
  let signal = customOptions.signal;

  let abort: () => undefined;
  if (!signal && timeout) {
    const controller = new AbortController();
    signal = controller.signal;
    abort = controller.abort.bind(controller);
  }

  delete customOptions.retry;
  delete customOptions.retryDelay;
  delete customOptions.checkStatus;
  delete customOptions.timeout;

  const options: Options = Object.assign(
    {
      method: 'GET',
      credentials: 'same-origin',
    },
    customOptions
  );

  if (!options.headers) {
    if (options.body) {
      if (typeof options.body === 'string') {
        try {
          JSON.parse(options.body);
          options.headers = { 'Content-Type': 'application/json; chartset=utf-8' };
          // tslint:disable-next-line: no-empty
        } catch {}
      }
    }
  }

  let attempTimes = 0;
  return new Promise((resolve, reject) => {
    poll(
      async () => {
        attempTimes++;
        try {
          const resp = await fetch(url, options)
            .then(checkStatus)
            .then(
              (response): FetchResult => {
                switch (responseType) {
                  case 'json':
                    return parseJSON(response);
                  case 'text':
                    return response.text();
                  default:
                    return Promise.resolve(response);
                }
              }
            );

          resolve(resp);
          return true;
        } catch (error) {
          if (attempTimes <= retry) {
            return false;
          }

          reject(error);
          return true;
        }
      },
      retryDelay,
      timeout
    ).catch((error: Error) => {
      if (abort) {
        // 超时后中断请求
        abort();
      }
      reject(error);
    });
  });
}
