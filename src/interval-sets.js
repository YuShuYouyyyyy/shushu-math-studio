function numericEndpoint(source, computeEngine) {
  const compact = source.replace(/\s+/g, '');
  if (/^\+?\\infty$/.test(compact)) return Infinity;
  if (/^-\\infty$/.test(compact)) return -Infinity;
  const value = computeEngine.parse(source).N().re;
  if (!Number.isFinite(value)) throw new Error('Interval endpoint must be numeric');
  return value;
}

function parseInterval(source, computeEngine) {
  const match = source.match(/^(\[|\()(.+?),(.+?)(\]|\))$/);
  if (!match) throw new Error('Invalid interval');
  const [, leftBracket, lowerLatex, upperLatex, rightBracket] = match;
  const lower = numericEndpoint(lowerLatex, computeEngine);
  const upper = numericEndpoint(upperLatex, computeEngine);
  if (lower > upper) throw new Error('Invalid interval bounds');
  return {
    lower,
    upper,
    lowerLatex,
    upperLatex,
    lowerClosed: leftBracket === '[',
    upperClosed: rightBracket === ']'
  };
}

function union(intervals) {
  const sorted = [...intervals].sort((a, b) => a.lower - b.lower || Number(b.lowerClosed) - Number(a.lowerClosed));
  const merged = [];
  for (const next of sorted) {
    const current = merged.at(-1);
    const connected = current && (
      next.lower < current.upper ||
      (next.lower === current.upper && (next.lowerClosed || current.upperClosed))
    );
    if (!connected) {
      merged.push({ ...next });
      continue;
    }
    if (next.upper > current.upper) {
      current.upper = next.upper;
      current.upperLatex = next.upperLatex;
      current.upperClosed = next.upperClosed;
    } else if (next.upper === current.upper) {
      current.upperClosed ||= next.upperClosed;
    }
  }
  return merged;
}

function intersect(left, right) {
  const lower = Math.max(left.lower, right.lower);
  const upper = Math.min(left.upper, right.upper);
  const lowerFromLeft = left.lower > right.lower;
  const upperFromLeft = left.upper < right.upper;
  const lowerClosed = left.lower === right.lower
    ? left.lowerClosed && right.lowerClosed
    : lowerFromLeft ? left.lowerClosed : right.lowerClosed;
  const upperClosed = left.upper === right.upper
    ? left.upperClosed && right.upperClosed
    : upperFromLeft ? left.upperClosed : right.upperClosed;
  if (lower > upper || (lower === upper && !(lowerClosed && upperClosed))) return null;
  return {
    lower,
    upper,
    lowerLatex: lowerFromLeft ? left.lowerLatex : right.lowerLatex,
    upperLatex: upperFromLeft ? left.upperLatex : right.upperLatex,
    lowerClosed,
    upperClosed
  };
}

function serialize(interval) {
  if (interval.lower === interval.upper) return `\\left\\{${interval.lowerLatex}\\right\\}`;
  const left = interval.lowerClosed ? '[' : '(';
  const right = interval.upperClosed ? ']' : ')';
  return `\\left${left}${interval.lowerLatex},${interval.upperLatex}\\right${right}`;
}

export function evaluateIntervalSet(latex, computeEngine) {
  if (!/(?:\\(?:cup|cap)|[∪∩])/.test(latex)) return null;
  const normalized = latex
    .replace(/∪/g, '\\cup')
    .replace(/∩/g, '\\cap')
    .replace(/\\left|\\right|\\bigl|\\bigr/g, '')
    .replace(/\\lbrack/g, '[')
    .replace(/\\rbrack/g, ']')
    .replace(/\\[,;!]/g, '')
    .replace(/\s+/g, '');
  const parts = normalized.split(/(\\cup|\\cap)/);
  const intervals = parts.filter((_, index) => index % 2 === 0).map(part => parseInterval(part, computeEngine));
  const operators = parts.filter((_, index) => index % 2 === 1);
  if (operators.every(operator => operator === '\\cup')) {
    return union(intervals).map(serialize).join('\\cup');
  }
  if (operators.every(operator => operator === '\\cap')) {
    let result = intervals[0];
    for (const interval of intervals.slice(1)) {
      result = intersect(result, interval);
      if (!result) return '\\emptyset';
    }
    return serialize(result);
  }
  throw new Error('Mixed interval operations need parentheses');
}
