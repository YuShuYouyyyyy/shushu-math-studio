function normalizeLatex(latex) {
  return latex
    .replace(/\\left|\\right/g, '')
    .replace(/\\,/g, '')
    .replace(/\s+/g, '');
}

function approximateRange(evaluate, xMin, xMax) {
  const values = [];
  for (let index = 0; index <= 800; index += 1) {
    const x = xMin + (xMax - xMin) * index / 800;
    const y = evaluate(x);
    if (Number.isFinite(y) && Math.abs(y) < 1e10) values.push(y);
  }
  if (!values.length) return '当前视窗内没有可用数值';
  const min = Math.min(...values);
  const max = Math.max(...values);
  const format = value => Number(value.toPrecision(6)).toString();
  return `当前视窗约为 [${format(min)}, ${format(max)}]`;
}

export function analyzeFunction(latex, computeEngine, evaluate, xRange) {
  const source = normalizeLatex(latex);
  const expression = computeEngine.parse(latex);
  const approximate = approximateRange(evaluate, xRange.xMin, xRange.xMax);

  if (!expression.symbols.includes('x')) {
    return { domain: '(-∞, +∞)', range: `{${expression.simplify().latex}}` };
  }
  if (/^(?:\\sin\(?x\)?|\\cos\(?x\)?)$/.test(source)) {
    return { domain: '(-∞, +∞)', range: '[-1, 1]' };
  }
  if (/^\\tan\(?x\)?$/.test(source)) {
    return { domain: 'x ≠ π/2 + kπ，k∈Z', range: '(-∞, +∞)' };
  }
  if (/^(?:\\ln\(?x\)?|\\log(?:_\{?[^}]+\}?)?\(?x\)?)$/.test(source)) {
    return { domain: '(0, +∞)', range: '(-∞, +∞)' };
  }
  if (/^\\sqrt\{?x\}?$/.test(source)) {
    return { domain: '[0, +∞)', range: '[0, +∞)' };
  }
  if (/^(?:\\frac\{1\}\{x\}|1\/x)$/.test(source)) {
    return { domain: '(-∞, 0) ∪ (0, +∞)', range: '(-∞, 0) ∪ (0, +∞)' };
  }
  if (/^(?:\\lvertx\\rvert|\|x\|)$/.test(source)) {
    return { domain: '(-∞, +∞)', range: '[0, +∞)' };
  }

  const json = expression.json;
  if (json?.[0] === 'Power' && json[1] === 'x' && Number.isInteger(json[2]) && json[2] > 0) {
    return {
      domain: '(-∞, +∞)',
      range: json[2] % 2 === 0 ? '[0, +∞)' : '(-∞, +∞)'
    };
  }
  if (json?.[0] === 'Add' || json?.[0] === 'Multiply') {
    const hasRestrictedOperator = /\\frac|\\sqrt|\\ln|\\log/.test(source);
    if (!hasRestrictedOperator) return { domain: '(-∞, +∞)', range: approximate };
  }

  return {
    domain: '需结合分母、根式和对数条件判断',
    range: approximate
  };
}
