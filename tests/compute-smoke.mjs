import { ComputeEngine } from '@cortex-js/compute-engine';
import { unwrapPlaceholders } from '../src/math-utils.js';
import { evaluateCalculus } from '../src/symbolic-calculus.js';
import { evaluateIntervalSet } from '../src/interval-sets.js';
import { solveEquation } from '../src/equation-solver.js';
import { compileGraphFunction, compileGraphExpression } from '../src/function-graph.js';
import { factorExpression } from '../src/factorization.js';
import { analyzeFunction } from '../src/function-analysis.js';

const ce = new ComputeEngine();
const placeholderCases = [
  [String.raw`\frac{\placeholder[numerator]{1}}{\placeholder[denominator]{2}}`, String.raw`\frac{1}{2}`],
  [String.raw`\sqrt{\placeholder[value]{\frac{9}{4}}}`, String.raw`\sqrt{\frac{9}{4}}`],
  [String.raw`\frac{\placeholder[numerator]{}}{\placeholder[denominator]{}}`, String.raw`\frac{}{}`]
];
const cases = [
  [String.raw`\frac{1}{2}`, '0.5'],
  [String.raw`\log_{2}(8)`, '3'],
  [String.raw`\sqrt{81}`, '9'],
  [String.raw`2^{10}`, '1024'],
  [String.raw`\sin(0)`, '0']
];

let failed = false;
for (const [input, expected] of placeholderCases) {
  const actual = unwrapPlaceholders(input);
  const passed = actual === expected;
  console.log(`${passed ? 'PASS' : 'FAIL'} unwrap ${input} => ${actual}`);
  failed ||= !passed;
}

for (const [input, expected] of cases) {
  const expression = ce.parse(input);
  const numeric = expression.N().latex.replace(String.raw`\,`, '');
  const passed = expression.isValid && numeric === expected;
  console.log(`${passed ? 'PASS' : 'FAIL'} ${input} => ${numeric}`);
  failed ||= !passed;
}

const calculusCases = [
  [String.raw`\lim_{x\to\infty}\frac{1}{x}`, '0'],
  [String.raw`\sum_{i=1}^{5}i`, '15'],
  [String.raw`\int_{0}^{1}x\,\mathrm{d}x`, '1/2']
];

for (const [input, expected] of calculusCases) {
  const expression = ce.parse(input);
  const actual = evaluateCalculus(expression).plain;
  const passed = actual === expected;
  console.log(`${passed ? 'PASS' : 'FAIL'} ${input} => ${actual}`);
  failed ||= !passed;
}

const intervalCases = [
  [String.raw`\left[3,6\right]\cup\left[5,7\right]`, String.raw`\left[3,7\right]`],
  [String.raw`\left[3,6\right]∪\left[5,7\right]`, String.raw`\left[3,7\right]`],
  [String.raw`\left(1,3\right)\cup\left[3,5\right]`, String.raw`\left(1,5\right]`],
  [String.raw`\left[1,3\right]\cup\left[5,7\right]`, String.raw`\left[1,3\right]\cup\left[5,7\right]`],
  [String.raw`\left[3,6\right]\cap\left[5,7\right]`, String.raw`\left[5,6\right]`],
  [String.raw`[2,6]\cap[4,8]`, String.raw`\left[4,6\right]`],
  [String.raw`\left[1,3\right)\cap\left[3,5\right]`, String.raw`\emptyset`]
];

for (const [input, expected] of intervalCases) {
  const actual = evaluateIntervalSet(input, ce);
  const passed = actual === expected;
  console.log(`${passed ? 'PASS' : 'FAIL'} ${input} => ${actual}`);
  failed ||= !passed;
}

const equationCases = [
  [String.raw`x^2-5x+6=0`, 'x', ['2', '3']],
  [String.raw`\frac{1}{2}x+1=3`, 'x', ['4']],
  [String.raw`y^2+1=0`, 'y', ['-i', 'i']]
];

for (const [input, variable, expected] of equationCases) {
  const result = solveEquation(input, variable, ce);
  const actual = result.solutions.map(solution => solution.plain).sort();
  const passed = result.kind === 'solutions' && JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`${passed ? 'PASS' : 'FAIL'} solve ${input} => ${actual.join(', ')}`);
  failed ||= !passed;
}

const identity = solveEquation(String.raw`x=x`, 'x', ce);
const contradiction = solveEquation(String.raw`1=2`, 'x', ce);
const specialEquationsPassed = identity.kind === 'all' && contradiction.kind === 'none';
console.log(`${specialEquationsPassed ? 'PASS' : 'FAIL'} solve identities and contradictions`);
failed ||= !specialEquationsPassed;

const graphCases = [
  [String.raw`x^2`, 3, 9],
  [String.raw`\sin(x)`, 0, 0],
  [String.raw`\frac{1}{x}`, 2, 0.5]
];

for (const [input, x, expected] of graphCases) {
  const evaluate = compileGraphFunction(input, ce);
  const actual = evaluate(x);
  const passed = Math.abs(actual - expected) < 1e-10;
  console.log(`${passed ? 'PASS' : 'FAIL'} graph ${input} at ${x} => ${actual}`);
  failed ||= !passed;
}

const factor = factorExpression(String.raw`x^2-5x+6`, ce);
const factorPassed = factor.latex.includes('x-2') && factor.latex.includes('x-3');
console.log(`${factorPassed ? 'PASS' : 'FAIL'} factor x^2-5x+6 => ${factor.latex}`);
failed ||= !factorPassed;

const squareEvaluate = compileGraphFunction(String.raw`x^2`, ce);
const squareAnalysis = analyzeFunction(String.raw`x^2`, ce, squareEvaluate, { xMin: -5, xMax: 5 });
const analysisPassed = squareAnalysis.domain === '(-∞, +∞)' && squareAnalysis.range === '[0, +∞)';
console.log(`${analysisPassed ? 'PASS' : 'FAIL'} analyze x^2 domain/range`);
failed ||= !analysisPassed;

const circle = compileGraphExpression(String.raw`x^2+y^2=4`, ce);
const circlePassed = circle.mode === 'implicit' && Math.abs(circle.evaluate(2, 0)) < 1e-10 && Math.abs(circle.evaluate(0, 1)) > 0;
console.log(`${circlePassed ? 'PASS' : 'FAIL'} implicit circle x^2+y^2=4`);
failed ||= !circlePassed;

if (failed) process.exitCode = 1;
