import nerdamer from 'nerdamer/all.js';

export function factorExpression(latex, computeEngine) {
  const source = latex.trim();
  if (!source) throw new Error('请输入需要分解的表达式');

  const expression = computeEngine.parse(source);
  if (!expression.isValid || expression.json?.[0] === 'Equal') {
    throw new Error('请输入一个代数表达式，不要输入等号');
  }

  try {
    const plain = nerdamer.convertFromLaTeX(source).toString();
    const factored = nerdamer(`factor(${plain})`);
    return {
      latex: factored.toTeX(),
      plain: factored.toString()
    };
  } catch {
    throw new Error('暂时无法分解这个表达式');
  }
}
