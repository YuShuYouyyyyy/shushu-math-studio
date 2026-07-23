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

function approximateImplicitBounds(evaluate, range) {
  const points = [];
  const columns = 140;
  const rows = 100;
  for (let row = 0; row < rows; row += 1) {
    const y0 = range.yMin + (range.yMax - range.yMin) * row / rows;
    const y1 = range.yMin + (range.yMax - range.yMin) * (row + 1) / rows;
    for (let column = 0; column < columns; column += 1) {
      const x0 = range.xMin + (range.xMax - range.xMin) * column / columns;
      const x1 = range.xMin + (range.xMax - range.xMin) * (column + 1) / columns;
      const values = [evaluate(x0, y0), evaluate(x1, y0), evaluate(x0, y1), evaluate(x1, y1)]
        .filter(Number.isFinite);
      if (values.length && Math.min(...values) <= 0 && Math.max(...values) >= 0) {
        points.push([(x0 + x1) / 2, (y0 + y1) / 2]);
      }
    }
  }
  if (!points.length) return null;
  const format = value => Number(value.toPrecision(5)).toString();
  const xs = points.map(point => point[0]);
  const ys = points.map(point => point[1]);
  return {
    domain: `当前视窗约为 [${format(Math.min(...xs))}, ${format(Math.max(...xs))}]`,
    range: `当前视窗约为 [${format(Math.min(...ys))}, ${format(Math.max(...ys))}]`
  };
}

export function analyzeFunction(latex, computeEngine, evaluate, xRange, mode = 'explicit') {
  const source = normalizeLatex(latex);
  const expression = computeEngine.parse(latex);
  if (mode === 'implicit') {
    return approximateImplicitBounds(evaluate, xRange) || {
      domain: '当前视窗内未检测到曲线',
      range: '当前视窗内未检测到曲线'
    };
  }
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
