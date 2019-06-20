import reformat, { TYPE, RENAME, VALUES, TRANSFORM } from '../reformat';

test('should format number correct', () => {
  expect(reformat(Number, '12')).toBe(12);
  expect(reformat(Number, '0.1')).toBe(0.1);
  expect(reformat(Number, 'qwe')).toBe(0);
});

test('should format string correct', () => {
  expect(reformat(String, 13)).toBe('13');
  expect(reformat(String, '0')).toBe('0');
  expect(reformat(String, 'hello')).toBe('hello');
});

test('should format boolean correct', () => {
  expect(reformat(Boolean, 13)).toBe(true);
  expect(reformat(Boolean, '1')).toBe(true);
  expect(reformat(Boolean, 0)).toBe(false);
  expect(reformat(Boolean, true)).toBe(true);
});

test('should format boolean correct', () => {
  expect(reformat(Date, 0).getTime()).toBe(0);
  expect(reformat(Date, '2019-01-01').getTime()).toBe(new Date('2019-01-01').getTime());
});

test('should format regex correct', () => {
  expect(reformat(RegExp, 'asd')).toStrictEqual(/asd/);
});

test('should format array correct', () => {
  expect(reformat(Array, [1, 2, 3])).toEqual([1, 2, 3]);
  expect(reformat([String], [1, 2, 3])).toEqual(['1', '2', '3']);
  expect(reformat([String, String], [1, 2, 3])).toEqual(['1', '2', 3]);
});

test('should format object correct', () => {
  expect(
    reformat(
      {
        a: Number,
        b: String,
        c: [String],
      },
      {
        a: '123',
        b: 'hello',
        c: [1, 2, 3, 4],
      }
    )
  ).toEqual({
    a: 123,
    b: 'hello',
    c: ['1', '2', '3', '4'],
  });
});

test('should apply TYPE correct', () => {
  expect(
    reformat(
      {
        a: { [TYPE]: Number },
      },
      {
        a: '123',
      }
    )
  ).toEqual({
    a: 123,
  });
});

test('should apply RENAME correct', () => {
  expect(
    reformat(
      {
        a: { [RENAME]: 'abc', [TYPE]: Number },
      },
      {
        a: '123',
      }
    )
  ).toEqual({
    abc: 123,
  });
});

test('should apply nested RENAME correct', () => {
  expect(
    reformat(
      {
        a: {
          [RENAME]: 'abc',
          [TYPE]: {
            b: {
              [RENAME]: 'xyz',
              [TYPE]: Number,
            },
          },
        },
      },
      {
        a: {
          b: '123',
        },
      }
    )
  ).toEqual({
    abc: {
      xyz: 123,
    },
  });
});

test('should apply VALUES correct', () => {
  expect(
    reformat(
      {
        a: { [VALUES]: Number },
      },
      {
        a: {
          a: '123',
        },
      }
    )
  ).toEqual({
    a: {
      a: 123,
    },
  });
});

test('should apply TRANSFORM correct', () => {
  expect(
    reformat(
      {
        a: {
          [TYPE]: Number,
          [TRANSFORM](value: number) {
            expect(value).toBe(132);
            return 'hello';
          },
        },
      },
      {
        a: '132',
      }
    )
  ).toEqual({
    a: 'hello',
  });
});
