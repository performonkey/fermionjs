export const ANY = undefined;
export const TYPE = Symbol.for('#reformat/type');
export const RENAME = Symbol.for('#reformat/rename');
export const TRANSFORM = Symbol.for('#reformat/transform');
export const VALUES = Symbol.for('#reformat/values');

const ACTIONS = [TYPE, RENAME, TRANSFORM, VALUES];
type SchemaTypes = string | number | boolean | Date | RegExp | Array<any> | { [s: string]: any };

interface QueueItem {
  schema: SchemaTypes;
  value: any;
  path: (string | number)[];
}

interface TransformQueueItem {
  path: (string | number)[];
  transform: <V, O>(value: V, obj: O) => V | void;
}

interface Queue {
  typeQueue: QueueItem[];
  renameQueue: TransformQueueItem[];
  transformQueue: TransformQueueItem[];
}

type ArrayTask = Omit<QueueItem, 'schema'> & { schema: any[] };
type ObjectTask = Omit<QueueItem, 'schema'> & { schema: {} };

export function assocPath<V, T>(valuePath: (string | number)[], value: V, obj: T): T | V {
  if (typeof obj !== 'object' || valuePath.length === 0) {
    return value;
  }

  let temp = obj;
  for (let i = 0; i < valuePath.length; i++) {
    const p = valuePath[i];

    if (i === valuePath.length - 1) {
      temp[p] = value;
    } else if (typeof temp !== 'object' || !temp[p]) {
      break;
    }

    temp = temp[p];
  }

  return obj;
}

export function viewPath<T>(valuePath: (string | number)[], obj: T): any {
  return valuePath.reduce((o, p) => {
    if (!o || typeof o !== 'object' || o[p] === undefined) return undefined;
    return o[p];
  }, obj);
}

function arrayParser(current: ArrayTask, queue: Queue) {
  if (!Array.isArray(current.value)) return;

  if (current.schema.length > 1) {
    current.value.forEach((v, i) => {
      queue.typeQueue.push({
        path: current.path.concat(i),
        schema: current.schema[i],
        value: v,
      });
    });
  } else {
    const cs = current.schema[0];
    current.value.forEach((v, i) => {
      queue.typeQueue.push({
        path: current.path.concat(i),
        schema: cs,
        value: v,
      });
    });
  }
}

function objectParser(current: ObjectTask, queue: Queue) {
  // have reformat actions
  if (ACTIONS.find(x => current.schema[x])) {
    if (current.schema[VALUES]) {
      const schema = current.schema[VALUES];
      Object.keys(current.value).forEach(k => {
        queue.typeQueue.unshift({
          schema,
          path: current.path.concat(k),
          value: current.value[k],
        });
      });
    }
    if (current.schema[TRANSFORM]) {
      /**
       * delay to parse value type finish
       */
      const transformFunc = current.schema[TRANSFORM];
      queue.transformQueue.push({
        ...current,
        transform(_v: {}, obj: {}) {
          const value = viewPath(current.path, obj);
          return transformFunc(value, obj);
        },
      });
    }
    if (current.schema[RENAME]) {
      queue.renameQueue.push({
        ...current,
        transform(_v, obj: {}) {
          const lastField = current.path.slice(-1)[0];
          const parentFieldsPath = current.path.slice(0, -1);
          const parentValue = viewPath(parentFieldsPath, obj);
          const currentValue = viewPath(current.path, obj);

          if (!parentValue) return;

          parentValue[current.schema[RENAME]] = currentValue;
          delete parentValue[lastField];
        },
      });
    }
    if (current.schema[TYPE]) {
      queue.typeQueue.push({
        ...current,
        schema: current.schema[TYPE],
      });
    }
  } else {
    Object.keys(current.schema).forEach(k => {
      if (!current.value) return;

      const value = current.value[k];
      if (value === undefined) return;

      queue.typeQueue.push({
        value,
        path: current.path.concat(k),
        schema: current.schema[k],
      });
    });
  }
}

export default function reformat(s: SchemaTypes, obj: any) {
  const queue: Queue = {
    typeQueue: [
      {
        schema: s,
        value: obj,
        path: [],
      },
    ],
    renameQueue: [],
    transformQueue: [],
  };

  while (queue.typeQueue.length > 0) {
    const current = queue.typeQueue.pop();
    if (!current || current.value === undefined) continue;

    let value = current.value;
    switch (current.schema) {
      case Number:
        value = Number(current.value);
        if (Number.isNaN(value)) value = 0;
        break;
      case String:
        value = String(current.value);
        break;
      case Boolean:
        value = Boolean(current.value);
        break;
      case Date:
        value = new Date(current.value);
        break;
      case RegExp:
        value = new RegExp(current.value);
        break;
      case Array:
        value = Array.isArray(current.value) ? current.value : [];
        break;
      default:
        switch (Object.prototype.toString.call(current.schema)) {
          case '[object Array]':
            value = arrayParser(<ArrayTask>current, queue);
            break;
          case '[object Object]':
            value = objectParser(<ObjectTask>current, queue);
            break;
          default:
            value = current.value;
        }
    }

    if (value === undefined) continue;

    obj = assocPath(current.path, value, obj);
  }

  while (queue.transformQueue.length > 0) {
    const current = queue.transformQueue.pop();
    if (!current || !current.transform) continue;

    let value = viewPath(current.path, obj);
    value = current.transform(value, obj);
    obj = assocPath(current.path, value, obj);
  }

  while (queue.renameQueue.length > 0) {
    const current = queue.renameQueue.pop();
    if (!current || !current.transform) continue;

    let value = viewPath(current.path, obj);
    value = current.transform(value, obj);
    obj = assocPath(current.path, value, obj);
  }

  return obj;
}
