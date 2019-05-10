import delay from './delay';

export class TimeoutError extends Error {
  constructor(message: string) {
    super(message);

    this.name = 'TimeoutError';
    this.message = message || 'Timeout';
    this.stack = (new Error()).stack;
  }
}

/**
 * Periodically poll a signal function until either it returns true or a timeout is reached.
 *
 * @param {Function} signal -- function that returns true when the polled operation is complete
 * @param {Number} interval -- time interval between polls in milliseconds
 * @param {Number} timeout -- period of time before giving up on polling
 * @throws {TimeoutError} TimeoutError -- throw when specific timeout
 * @return {Boolean} true if the signal function returned true, false if the operation timed out
 */
export default function poll(signal: () => boolean | Promise<boolean>, interval: number, timeout?: number) {
  let kill = false; // kill recursive func;

  const pollRecursive = async () => {
    if (kill) { return Promise.resolve(true); }
    if (await signal()) { return Promise.resolve(true); }

    return delay(interval).then(pollRecursive);
  };

  if (timeout) {
    return Promise.race([
      pollRecursive(),
      delay(timeout).then(() => {
        kill = true;
        throw new TimeoutError(`Polling ${signal.name} timeout`);
      }),
    ]);
  }

  return pollRecursive();
}