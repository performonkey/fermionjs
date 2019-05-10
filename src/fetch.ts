import * as fetch from 'isomorphic-fetch';
import merge = require('lodash/merge');
import omit = require('lodash/omit');

import poll from './poll';

export function parseJSON(response) {
  return response.text().then(text => {
    let resp = text;
    try {
      resp = JSON.parse(text);
    } catch (error) {
      error.response = resp;
      throw error;
    }

    return resp;
  });
}

export function parseStream(response: Response): ReadableStreamReader {
  return <ReadableStreamReader>(
    (response.body || new ReadableStream()).getReader()
  );
}

function defaultCheckStatus(response: Response): Promise<any> {
  const { status, statusText } = response;
  if (status >= 200 && status < 300) {
    return Promise.resolve(response);
  }

  return response.text().then(text => {
    let resp;
    try {
      resp = JSON.parse(text);
    } catch (error) {
      return Promise.reject({ status, statusText, message: text });
    }

    return Promise.reject({ status, statusText, message: resp });
  });
}

const defaultOptions = {
  method: 'GET',
  credentials: 'same-origin',

  retry: 0,
  retryDelay: 500,
  checkStatus: defaultCheckStatus,
  urlFormater: url => url,
  timeout: 0,
};
const additionOptionKeys = [
  'retry',
  'retryDelay',
  'checkStatus',
  'urlFormater',
  'timeout',
];
export default function fetcher(url: string, customOptions = {}): Promise<any> {
  const options: any = merge({}, defaultOptions, customOptions);
  const { retry, retryDelay, checkStatus, urlFormater, timeout } = options;

  if (!options.headers) {
    try {
      JSON.parse(options.body);
      options.headers = { 'Content-Type': 'application/json; chartset=utf-8' };
    } catch (error) {}
  }

  let attempTimes = 0;
  return new Promise((resolve, reject) => {
    poll(
      async () => {
        attempTimes++;
        try {
          const fetchOptions = omit(options, additionOptionKeys);
          const resp = await fetch(urlFormater(url), fetchOptions).then(
            checkStatus
          );

          resolve(resp);
          return true;
        } catch (error) {
          if (attempTimes <= retry) return false;

          reject(error);
          return true;
        }
      },
      retryDelay,
      timeout
    ).catch(reject);
  });
}
