# fermionjs
一些 Javascript 工具函数

## 函数

### fetch
```
import fetch from 'fermionjs/lib/fetch';

fetch(
  url,
  {
    method: 'GET',
    body: '{}',
    retry: 0,             // 重试次数
    retryDelay: 500,      // 重试中间间隔时间
    responseType: 'json'  // Response 尝试以什么结构解析。json | text | raw
    timeout: 0,           // 请求在多少毫秒后超时
    singal: null,         // AbortController 的 signal 对象
    checkStatus: (resp: Response) => Promise<Response> // 自定义响应状态判断函数，默认非 200 ～ 399 的状态码就返回错误
  }
)
```

### reformat
处理 JSON like 对象的格式、重命名和转换操作。

执行流程：「类型转换」=>「TRANSFORM」=>「RENAME」

```
import reformat, { TYPE, RENAME, TRANSFORM } from 'fermionjs/lib/reformat';

reformat(
  {
    a: {
      b: Number
    }
  },
  {
    a: {
      b: '123'
    }
  }
)

reformat(
  {
    a: {
      b: {
        [RENAME]: 'x',
        [TYPE]: Number,
      }
    }
  },
  {
    a: {
      b: '123'
    }
  }
)
=> {
  a: { x: 123' }
}


reformat(
  // schema
  {
    a: {
      // a 的数据类型
      [TYPE]: {
        b: {
          // b 重命名为 'y'
          [RENAME]: 'y',
          [TYPE]: [
            {
              /**
               * count 的类型为数字
               * 没有 RENAME 之类的操作，就不需要用 [TYPE] 去指定类型
               **/
              count: Number
            }
          ]
          // 转换操作，注意：这步是在 RENAME 之前进行的
          [TRANSFORM](b) {
            // 对 b 数组进行排序
            b.sort((a, b) => a.count - b.count)
          }
        }
      },
      // a 重命名为 'x'
      [RENAME]: 'x',
    }
  }
  // value
  {
    a: {
      b: [
        {
          count: 0
        },
        {
          count: 2
        },
        {
          count: 1
        }
      ]
    }
  }
)
```

### poll
定时执行一个函数

```
import poll, { TimeoutError } from 'refermionjs/lib/poll'

await poll(
  /**
   * 执行的函数，返回 true 时 poll 停止
   */
  () => {
    if (cond) return true;
    return false;
  },
  1000, // 每隔多少秒执行一次
  10000, // 执行多少秒后超时，超时抛出 TimeoutError
)
```

### compactInteger
格式化数字

```
import compactInteger from 'fermionjs/lib/compactInteger';

compactInteger(
  9012321, // 格式化的数字
  0,       // 小数点后保留几位，可选
  /**
   * 格式化的名称，可选
   */
  new Map([
    [13, '万亿'],
    [12, '千亿'],
    [11, '百亿'],
    [9, '亿'],
    [8, '千万'],
    [7, '百万'],
    [5, '万'],
    [4, '千'],
  ]),
);

// => 9 百万
```
