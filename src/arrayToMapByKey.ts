/**
 * 将对象数组以指定的 key 转为一个 Map 对象
 * @param {String} keyField -- 指定的 key 字段
 * @param {Object[]} arr -- 对象数组
 * @return {Map<String, Object>} arr -- 对象数组
 */
export default function arrayToMapByKey(keyField: string, arr: object[]): Map<string, object> {
  const m = new Map();

  arr.forEach((x) => {
    const key = x[keyField];
    if (!key) return;

    m.set(key, x);
  });

  return m;
};
