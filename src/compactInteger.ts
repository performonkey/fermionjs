const defaultUnitMap: Map<number, string> = new Map([
  [13, '万亿'],
  [12, '千亿'],
  [11, '百亿'],
  [9, '亿'],
  [8, '千万'],
  [7, '百万'],
  [5, '万'],
  [4, '千'],
]);

// Converts an integer into its most compact representation
export default function compactInteger(number: number, decimals = 0, customUnitMap = defaultUnitMap): string {
  decimals = Math.max(decimals, 0);

  const signString: string = number < 0 ? '-' : '';
  const unsignedNumber: number = Math.abs(number);
  const unsignedNumberString: string = String(unsignedNumber);
  const numberLength: number = unsignedNumberString.length;
  const unitMap: Map<number, string> = new Map(
    Array.from(customUnitMap.entries())
      .sort(([a]: [number, string], [b]: [number, string]): number => b - a)
  );
  const numberLengths: number[] = Array.from(unitMap.keys());
  const bigNumPrefixes: string[] = Array.from(unitMap.values());

  // small numbers
  if (numberLength < numberLengths[numberLengths.length - 1]) {
    return `${ signString }${ unsignedNumberString }`;
  }

  // really big numbers
  if (numberLength > numberLengths[0] + 3) {
    return number.toExponential(decimals).replace('e+', 'x10^');
  }

  // min < unsignedNumber < max
  let length;
  for (let i = 0; i < numberLengths.length; i++) {
    const _length = numberLengths[i];
    if (numberLength >= _length) {
      length = _length;
      break;
    }
  }

  const decimalIndex = numberLength - length + 1;
  const unsignedNumberCharacterArray = unsignedNumberString.split('');

  const wholePartArray = unsignedNumberCharacterArray.slice(0, decimalIndex);
  const decimalPartArray = unsignedNumberCharacterArray.slice(decimalIndex, decimalIndex + decimals + 1);

  const wholePart = wholePartArray.join('');

  // pad decimalPart if necessary
  let decimalPart = decimalPartArray.join('');
  if (decimalPart.length < decimals) {
    decimalPart += `${ Array(decimals - decimalPart.length + 1).join('0') }`;
  }

  let output;
  if (decimals === 0) {
    output = `${ signString }${ wholePart }${ bigNumPrefixes[numberLengths.indexOf(length)] }`;
  } else {
    const outputNumber = Number(Number(`${ wholePart }.${ decimalPart }`).toFixed(decimals));
    output = `${ signString }${ outputNumber }${ bigNumPrefixes[numberLengths.indexOf(length)] }`;
  }

  return output;
}