import nerdamer from 'nerdamer/all.js';

const functionNames = {
  Abs: 'abs',
  Arccos: 'acos',
  Arcsin: 'asin',
  Arctan: 'atan',
  Cos: 'cos',
  Exp: 'exp',
  Ln: 'log',
  Log: 'log',
  Sin: 'sin',
  Sqrt: 'sqrt',
  Tan: 'tan'
};

function toNerdamer(json) {
  if (typeof json === 'number') return String(json);
  if (typeof json === 'string') {
    if (json === 'PositiveInfinity') return 'Infinity';
    if (json === 'NegativeInfinity') return '-Infinity';
    if (json === 'ExponentialE') return 'e';
    return json;
  }
  if (json && typeof json === 'object' && !Array.isArray(json)) {
    if ('num' in json) return String(json.num);
  }
  if (!Array.isArray(json) || json.length === 0) throw new Error('Unsupported math structure');

  const [operator, ...operands] = json;
  const values = operands.map(toNerdamer);
  if (operator === 'Add') return `(${values.join('+')})`;
  if (operator === 'Multiply') return `(${values.join('*')})`;
  if (operator === 'Divide') return `((${values[0]})/(${values[1]}))`;
  if (operator === 'Power') return `((${values[0]})^(${values[1]}))`;
  if (operator === 'Negate') return `(-(${values[0]}))`;
  if (operator === 'Subtract') return `((${values[0]})-(${values[1]}))`;

  const functionName = functionNames[operator];
  if (functionName) return `${functionName}(${values.join(',')})`;
  throw new Error(`Unsupported operator: ${operator}`);
}

function readLimits(json) {
  if (!Array.isArray(json) || json[0] !== 'Limits') throw new Error('Missing limits');
  return {
    variable: toNerdamer(json[1]),
    lower: toNerdamer(json[2]),
    upper: toNerdamer(json[3])
  };
}

export function isCalculusExpression(expression) {
  return ['Limit', 'Sum', 'Integrate'].includes(expression?.json?.[0]);
}

export function evaluateCalculus(expression) {
  const json = expression.json;
  const operator = json[0];
  let command;

  if (operator === 'Limit') {
    const fn = json[1];
    if (fn?.[0] !== 'Function' || fn?.[1]?.[0] !== 'Block') throw new Error('Unsupported limit');
    const body = toNerdamer(fn[1][1]);
    const variable = toNerdamer(fn[2]);
    const point = toNerdamer(json[2]);
    command = `limit(${body},${variable},${point})`;
  } else if (operator === 'Sum') {
    const limits = readLimits(json[2]);
    command = `sum(${toNerdamer(json[1])},${limits.variable},${limits.lower},${limits.upper})`;
  } else if (operator === 'Integrate') {
    const limits = readLimits(json[2]);
    command = `defint(${toNerdamer(json[1])},${limits.lower},${limits.upper},${limits.variable})`;
  } else {
    return null;
  }

  const result = nerdamer(command).evaluate();
  const plain = result.toString();
  if (!plain || /^(limit|sum|defint)\(/.test(plain)) throw new Error('Calculation was not evaluated');
  return { latex: result.toTeX(), plain };
}
