export const ANY = Symbol.for('#reformat/any');
export const TYPE = Symbol.for('#reformat/type');
export const RENAME = Symbol.for('#reformat/rename');
export const TRANSFORM = Symbol.for('#reformat/transform');

export default function reformat(s, data) {
  let schema = s;
  let transform = x => x;

  if (schema.toString() === '[object Object]' && schema[TYPE]) {
    if (schema[TRANSFORM]) { transform = schema[TRANSFORM]; }
    schema = schema[TYPE];
  }

  // 任意值
  if (schema === ANY) { return transform(data); }

  // 基础类型
  if ([Number, String, Boolean].includes(schema)) {
    if (typeof data === 'object') { return transform(schema()); }
    return transform(schema(data));
  }

  // 日期
  if (schema === Date) { return transform(new Date(data)); }

  // 数组
  if (Array.isArray(schema)) {
    if (!Array.isArray(data)) { return transform([]); }

    if (schema.length > 1) {
      return transform(schema.map((x, i) => reformat(x, data[i])));
    }

    return transform(data.map(x => reformat(schema[0], x)));
  }

  // 非对象的其他类型：Map, Set. etc
  if (schema.toString() !== '[object Object]') { return transform(data); }
  if (data.toString() !== '[object Object]') { return transform({}); }

  // Object
  const result = {};
  Object.keys(schema).forEach((k) => {
    if (schema[k].toString() === '[object Object]' && schema[k][RENAME]) {
      // 有 rename 选项
      result[schema[k][RENAME]] = reformat(schema[k], data[k]);
    } else {
      result[k] = reformat(schema[k], data[k]);
    }
  });

  return transform(result);
};
