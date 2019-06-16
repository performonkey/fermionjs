export const ANY = undefined;
export const TYPE = Symbol.for('#reformat/type');
export const RENAME = Symbol.for('#reformat/rename');
export const TRANSFORM = Symbol.for('#reformat/transform');
export const VALUES = Symbol.for('#reformat/values');

const ACTIONS = [TYPE, RENAME, TRANSFORM, VALUES];
type SchemaTypes = string | number | boolean | Date | RegExp | Array<any> | { [s: string]: any };

interface QueueItem {
  schema?: SchemaTypes;
  value: any;
  path: (string | number)[];
  transform?: <V, O>(value: V, obj: O) => V | void;
}

type ArrayTask = Omit<QueueItem, 'schema'> & { schema: any[] };
type ObjectTask = Omit<QueueItem, 'schema'> & { schema: {} };

function assocPath<V, T>(valuePath: (string | number)[], value: V, obj: T): T | V {
  if (valuePath.length === 0) {
    return value;
  }

  valuePath.reduce((o, p, i) => {
    if (i === valuePath.length - 1) {
      o[p] = value;
    }
    return o[p];
  }, obj);

  return obj;
}

function viewPath<T>(valuePath: (string | number)[], obj: T): any {
  return valuePath.reduce((o, p) => o[p], obj);
}

function arrayParser(current: ArrayTask, queue: QueueItem[]) {
  if (!Array.isArray(current.value)) return [];

  if (current.schema.length > 1) {
    current.value.forEach((v, i) => {
      const cs = current.schema[i];
      queue.push({
        schema: cs,
        value: v,
        path: current.path.concat(i),
        transform: cs ? cs[TRANSFORM] : undefined,
      });
    });
  } else {
    const cs = current.schema[0];
    current.value.forEach((v, i) => {
      queue.push({
        schema: cs,
        value: v,
        path: current.path.concat(i),
        transform: cs[TRANSFORM],
      });
    });
  }
}

function objectParser(current: ObjectTask, queue: QueueItem[]) {
  // have reformat actions
  if (ACTIONS.find(x => current.schema[x])) {
    if (current.schema[VALUES]) {
      const schema = current.schema[VALUES];
      Object.keys(current.value).forEach(k => {
        queue.unshift({
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
      queue.unshift({
        ...current,
        schema: undefined,
        transform(_v: {}, obj: {}) {
          const value = viewPath(current.path, obj);
          return transformFunc(value, obj);
        },
      });
    }
    if (current.schema[RENAME]) {
      queue.unshift({
        ...current,
        schema: undefined,
        transform(_v, obj: {}) {
          const lastField = current.path.slice(-1)[0];
          const parentFieldsPath = current.path.slice(0, -1);
          const parentValue = viewPath(parentFieldsPath, obj);
          const currentValue = viewPath(current.path, obj);
          parentValue[current.schema[RENAME]] = currentValue;
          delete parentValue[lastField];
        },
      });
    }
    if (current.schema[TYPE]) {
      queue.push({
        ...current,
        schema: current.schema[TYPE],
      });
    }
  } else {
    Object.keys(current.schema).forEach(k => {
      queue.push({
        path: current.path.concat(k),
        schema: current.schema[k],
        value: current.value[k],
      });
    });
  }
}

export default function reformat(s: SchemaTypes, obj: any) {
  const queue: QueueItem[] = [
    {
      schema: s,
      value: obj,
      path: [],
      transform: (x: any) => x,
    },
  ];

  do {
    const current = queue.pop();
    if (!current) break;

    let value = current.value;
    switch (current.schema) {
      case Number:
        value = current.value ? Number(current.value) : 0;
        if (Number.isNaN(value)) value = 0;
        break;
      case String:
        value = current.value ? String(current.value) : '';
        break;
      case Boolean:
        value = Boolean(current.value);
        break;
      case Date:
        value = current.value !== undefined ? new Date(current.value) : null;
        break;
      case RegExp:
        value = current.value !== undefined ? new RegExp(current.value) : null;
        break;
      case Array:
        value = Array.isArray(current.value) ? current.value : [];
        break;
      case undefined:
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

    if (current.transform) {
      value = current.transform(value, obj);
    }

    if (value === undefined) continue;

    if (typeof obj !== 'object' && current.path.length === 0) {
      obj = value;
    } else {
      assocPath(current.path, value, obj);
    }
  } while (queue.length > 0);

  return obj;
}
