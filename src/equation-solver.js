import nerdamer from 'nerdamer/all.js';

export function solveEquation(latex, variable, computeEngine) {
  const source = latex.trim();
  if (!source) throw new Error('请输入方程');
  if (!/^[a-zA-Z]$/.test(variable)) throw new Error('未知数格式不正确');

  const expression = computeEngine.parse(source);
  if (!expression.isValid) throw new Error('无法识别这个方程');

  let equationLatex = source;
  let difference = expression;
  if (expression.json?.[0] === 'Equal') {
    difference = computeEngine.box(['Subtract', expression.json[1], expression.json[2]]).simplify();
  } else {
    equationLatex = `${source}=0`;
    difference = expression.simplify();
  }

  if (!difference.symbols.includes(variable)) {
    if (difference.is(0)) return { kind: 'all', solutions: [] };
    return { kind: 'none', solutions: [] };
  }

  let solutions;
  try {
    const nerdamerEquation = nerdamer.convertFromLaTeX(equationLatex).toString();
    solutions = nerdamer.solveEquations(nerdamerEquation, variable);
  } catch {
    throw new Error('暂时无法求解这个方程');
  }

  if (!Array.isArray(solutions) || solutions.length === 0) {
    return { kind: 'none', solutions: [] };
  }

  const unique = [...new Set(solutions.map(solution => solution.toString()))];
  return {
    kind: 'solutions',
    solutions: unique.map(plain => ({ plain, latex: nerdamer(plain).toTeX() }))
  };
}
