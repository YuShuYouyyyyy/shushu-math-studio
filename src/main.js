import { MathfieldElement, convertLatexToMarkup } from 'mathlive';
import { ComputeEngine } from '@cortex-js/compute-engine';
import {
  createIcons,
  Calculator,
  Delete,
  Undo2,
  Redo2,
  Copy,
  Sparkles,
  Keyboard,
  History,
  X,
  Equal,
  Split,
  Sigma,
  LineChart,
  PanelLeftOpen
} from 'lucide';
import { unwrapPlaceholders } from './math-utils.js';
import { evaluateCalculus, isCalculusExpression } from './symbolic-calculus.js';
import { evaluateIntervalSet } from './interval-sets.js';
import './style.css';

const templates = [
  { group: '常用', name: '分数', preview: String.raw`\frac{a}{b}`, insert: String.raw`\frac{\placeholder[numerator]{}}{\placeholder[denominator]{}}` },
  { group: '常用', name: '根式', preview: String.raw`\sqrt{x}`, insert: String.raw`\sqrt{\placeholder[radicand]{}}` },
  { group: '常用', name: '幂', preview: String.raw`x^n`, insert: String.raw`\placeholder[base]{}^{\placeholder[exponent]{}}` },
  { group: '常用', name: '括号', preview: String.raw`\left(x\right)`, insert: String.raw`\left(\placeholder[content]{}\right)` },
  { group: '函数', name: '对数', preview: String.raw`\log_b x`, insert: String.raw`\log_{\placeholder[base]{}}\left(\placeholder[argument]{}\right)` },
  { group: '函数', name: '自然对数', preview: String.raw`\ln x`, insert: String.raw`\ln\left(\placeholder[argument]{}\right)` },
  { group: '函数', name: '正弦', preview: String.raw`\sin x`, insert: String.raw`\sin\left(\placeholder[angle]{}\right)` },
  { group: '函数', name: '余弦', preview: String.raw`\cos x`, insert: String.raw`\cos\left(\placeholder[angle]{}\right)` },
  { group: '高级', name: '绝对值', preview: String.raw`\left|x\right|`, insert: String.raw`\left|\placeholder[content]{}\right|` },
  { group: '高级', name: '求和', preview: String.raw`\sum_{i=1}^n`, insert: String.raw`\sum_{\placeholder[index]{}=\placeholder[start]{}}^{\placeholder[end]{}}\placeholder[expression]{}` },
  { group: '高级', name: '极限', preview: String.raw`\lim_{x\to a}`, insert: String.raw`\lim_{\placeholder[variable]{}\to\placeholder[target]{}}\placeholder[expression]{}` },
  { group: '高级', name: '定积分', preview: String.raw`\int_a^b`, insert: String.raw`\int_{\placeholder[lower]{}}^{\placeholder[upper]{}}\placeholder[expression]{}\,\mathrm{d}\placeholder[variable]{}` }
];

const key = (latex, insert = latex) => ({ latex, insert });

const keyboardLayouts = {
  '基础': [
    ...'7894561230'.split('').map(value => ({ text: value, insert: value })),
    { text: '.', insert: '.' }, { text: ',', insert: ',' },
    key('+'), key('-'), key(String.raw`\times`), key(String.raw`\div`),
    key('='), key(String.raw`\pm`), key('('), key(')'), key('['), key(']')
  ],
  '代数': [
    ...['x', 'y', 'z', 'a', 'b', 'c', 'n', 'i'].map(value => ({ latex: value, insert: value })),
    key('x^2', '^{2}'), key('x^n', String.raw`^{\placeholder[exponent]{}}`),
    key('x_n', String.raw`_{\placeholder[index]{}}`), key('<'), key('>'),
    key(String.raw`\le`), key(String.raw`\ge`), key(String.raw`\ne`),
    key(String.raw`\approx`), key(String.raw`\propto`), key(String.raw`\infty`),
    key(String.raw`\%`), key(':')
  ],
  '集合': [
    key(String.raw`\in`), key(String.raw`\notin`), key(String.raw`\subset`), key(String.raw`\subseteq`),
    key(String.raw`\supset`), key(String.raw`\supseteq`), key(String.raw`\cup`), key(String.raw`\cap`),
    key(String.raw`\emptyset`), key(String.raw`\infty`), key(String.raw`\mathbb{R}`), key(String.raw`\mathbb{N}`),
    key(String.raw`\mathbb{Z}`), key(String.raw`\mathbb{Q}`),
    key(String.raw`\left\{x\right\}`, String.raw`\left\{\placeholder[set]{}\right\}`),
    key('(a,b)', String.raw`\left(\placeholder[left]{},\placeholder[right]{}\right)`),
    key('[a,b]', String.raw`\left[\placeholder[left]{},\placeholder[right]{}\right]`),
    key(String.raw`\forall`), key(String.raw`\exists`), key(String.raw`\therefore`)
  ],
  '函数': [
    key(String.raw`\sin x`, String.raw`\sin\left(\placeholder[value]{}\right)`),
    key(String.raw`\cos x`, String.raw`\cos\left(\placeholder[value]{}\right)`),
    key(String.raw`\tan x`, String.raw`\tan\left(\placeholder[value]{}\right)`),
    key(String.raw`\arcsin x`, String.raw`\arcsin\left(\placeholder[value]{}\right)`),
    key(String.raw`\log_b x`, String.raw`\log_{\placeholder[base]{}}\left(\placeholder[value]{}\right)`),
    key(String.raw`\ln x`, String.raw`\ln\left(\placeholder[value]{}\right)`),
    key('e^x', String.raw`e^{\placeholder[exponent]{}}`),
    key(String.raw`\left|x\right|`, String.raw`\left|\placeholder[value]{}\right|`),
    key(String.raw`\lfloor x\rfloor`, String.raw`\lfloor\placeholder[value]{}\rfloor`),
    key(String.raw`\lceil x\rceil`, String.raw`\lceil\placeholder[value]{}\rceil`),
    key(String.raw`\max`, String.raw`\max\left(\placeholder[value]{}\right)`),
    key(String.raw`\min`, String.raw`\min\left(\placeholder[value]{}\right)`),
    key('f(x)', String.raw`f\left(\placeholder[x]{}\right)`), key(String.raw`\pi`), key('e')
  ],
  '微积分': [
    key(String.raw`\sum`, String.raw`\sum_{\placeholder[start]{}}^{\placeholder[end]{}}\placeholder[value]{}`),
    key(String.raw`\prod`, String.raw`\prod_{\placeholder[start]{}}^{\placeholder[end]{}}\placeholder[value]{}`),
    key(String.raw`\int`, String.raw`\int\placeholder[value]{}\,\mathrm{d}\placeholder[variable]{}`),
    key(String.raw`\int_a^b`, String.raw`\int_{\placeholder[lower]{}}^{\placeholder[upper]{}}\placeholder[value]{}\,\mathrm{d}\placeholder[variable]{}`),
    key(String.raw`\frac{\mathrm{d}}{\mathrm{d}x}`, String.raw`\frac{\mathrm{d}}{\mathrm{d}\placeholder[variable]{}}\placeholder[value]{}`),
    key(String.raw`\frac{\partial}{\partial x}`, String.raw`\frac{\partial}{\partial\placeholder[variable]{}}\placeholder[value]{}`),
    key(String.raw`\lim_{x\to a}`, String.raw`\lim_{\placeholder[variable]{}\to\placeholder[target]{}}\placeholder[value]{}`),
    key(String.raw`\infty`), key(String.raw`\mathrm{d}x`), key(String.raw`\partial`), key(String.raw`\nabla`), key(String.raw`\Delta`)
  ],
  '希腊': [
    ...['alpha', 'beta', 'gamma', 'delta', 'epsilon', 'theta', 'lambda', 'mu', 'pi', 'rho', 'sigma', 'tau', 'phi', 'omega'].map(name => ({ latex: `\\${name}`, insert: `\\${name}` })),
    ...['Gamma', 'Delta', 'Theta', 'Lambda', 'Sigma', 'Phi', 'Omega'].map(name => ({ latex: `\\${name}`, insert: `\\${name}` }))
  ],
  '结构': templates.map(item => ({
    latex: item.preview,
    insert: item.insert,
    name: item.name,
    template: true
  }))
};

MathfieldElement.fontsDirectory = `${import.meta.env.BASE_URL}mathlive/fonts`;
MathfieldElement.soundsDirectory = `${import.meta.env.BASE_URL}mathlive/sounds`;
MathfieldElement.locale = 'zh-cn';

const app = document.querySelector('#app');
app.innerHTML = `
  <header class="topbar">
    <a class="brand" href="#" aria-label="悠的数学助手首页"><span class="brand-mark">悠</span><span>悠的数学助手</span></a>
    <nav class="top-actions" aria-label="页面操作">
      <button class="icon-button" id="historyButton" title="计算记录" aria-label="计算记录"><i data-lucide="history"></i></button>
      <button class="ai-button" id="aiButton"><i data-lucide="sparkles"></i><span>AI 解题</span></button>
    </nav>
  </header>

  <main class="workspace">
    <aside class="tool-panel side-panel side-panel-left" id="toolPanel" aria-labelledby="tools-title" aria-hidden="true">
      <div class="panel-heading">
        <div><p class="eyebrow">数学工具</p><h1 id="tools-title">分析与求解</h1></div>
        <button class="icon-button" id="closeToolPanel" aria-label="收起数学工具" title="收起"><i data-lucide="x"></i></button>
      </div>
      <div class="tool-list">
        <button class="tool-button" data-tool="解方程"><i data-lucide="equal"></i><span>解方程</span></button>
        <button class="tool-button" data-tool="解不等式"><i data-lucide="split"></i><span>解不等式</span></button>
        <button class="tool-button" data-tool="因式分解"><i data-lucide="sigma"></i><span>因式分解</span></button>
        <button class="tool-button" data-tool="函数图"><i data-lucide="line-chart"></i><span>函数图</span></button>
      </div>
    </aside>

    <section class="editor-panel" aria-labelledby="editor-title">
      <div class="editor-heading">
        <div class="editor-title-group">
          <button class="icon-button panel-toggle" id="openToolPanel" aria-label="展开数学工具" title="数学工具"><i data-lucide="panel-left-open"></i></button>
          <div><p class="eyebrow">表达式</p><h2 id="editor-title">数学输入区</h2></div>
        </div>
        <div class="editor-actions">
          <button class="icon-button" id="undoButton" title="撤销" aria-label="撤销"><i data-lucide="undo-2"></i></button>
          <button class="icon-button" id="redoButton" title="重做" aria-label="重做"><i data-lucide="redo-2"></i></button>
          <button class="icon-button danger" id="clearButton" title="清空" aria-label="清空"><i data-lucide="delete"></i></button>
        </div>
      </div>

      <div class="math-surface">
        <math-field id="mathField" aria-label="数学表达式输入框"></math-field>
        <div class="surface-footer">
          <button class="keyboard-button" id="keyboardButton" aria-expanded="true"><i data-lucide="keyboard"></i><span>数学键盘</span></button>
          <span id="inputStatus">可直接输入数字和符号</span>
        </div>
      </div>

      <section class="custom-keyboard" id="customKeyboard" aria-label="数学键盘">
        <div class="keyboard-tabs" id="keyboardTabs" role="tablist"></div>
        <div class="keyboard-grid" id="keyboardGrid"></div>
        <div class="keyboard-nav" aria-label="光标操作">
          <button data-command="moveToPreviousChar" aria-label="光标左移">←</button>
          <button data-command="moveToNextChar" aria-label="光标右移">→</button>
          <button data-command="deleteBackward" aria-label="删除">⌫</button>
        </div>
      </section>

      <button class="calculate-button" id="calculateButton"><i data-lucide="calculator"></i><span>计算结果</span></button>

      <section class="result-area" id="resultArea" aria-live="polite">
        <div class="result-label"><span>结果</span><button class="icon-button" id="copyButton" title="复制结果" aria-label="复制结果"><i data-lucide="copy"></i></button></div>
        <div class="result-empty" id="resultEmpty">等待计算</div>
        <math-field class="result-math" id="resultMath" read-only></math-field>
        <div class="result-decimal" id="resultDecimal"></div>
      </section>
    </section>

  </main>
  <div class="side-scrim" id="sideScrim"></div>

  <aside class="drawer" id="historyDrawer" aria-hidden="true">
    <div class="drawer-header"><h2>计算记录</h2><button class="icon-button" id="closeDrawer" aria-label="关闭"><i data-lucide="x"></i></button></div>
    <div class="history-list" id="historyList"><p class="history-empty">暂无记录</p></div>
  </aside>
  <div class="scrim" id="scrim"></div>

  <dialog id="aiDialog">
    <div class="dialog-icon"><i data-lucide="sparkles"></i></div>
    <h2>AI 解题接口已预留</h2>
    <p>接入国内可用的大模型服务后，可识别题目、展示步骤并检查答案。</p>
    <button id="closeAiDialog">知道了</button>
  </dialog>
  <div class="toast" id="toast" role="status"></div>
`;

createIcons({ icons: { Calculator, Delete, Undo2, Redo2, Copy, Sparkles, Keyboard, History, X, Equal, Split, Sigma, LineChart, PanelLeftOpen } });

const ce = new ComputeEngine();
const mathfield = document.querySelector('#mathField');
const resultMath = document.querySelector('#resultMath');
const resultDecimal = document.querySelector('#resultDecimal');
const resultEmpty = document.querySelector('#resultEmpty');
const keyboardGrid = document.querySelector('#keyboardGrid');
const keyboardTabs = document.querySelector('#keyboardTabs');
const customKeyboard = document.querySelector('#customKeyboard');
const toolPanel = document.querySelector('#toolPanel');
const sideScrim = document.querySelector('#sideScrim');
const toast = document.querySelector('#toast');
const history = [];
let lastResult = '';
let activeKeyboardLayout = '基础';

mathfield.smartFence = true;
mathfield.smartMode = true;
mathfield.defaultMode = 'math';
mathfield.mathVirtualKeyboardPolicy = 'manual';
mathfield.menuItems = [];

function renderKeyboard(layout = activeKeyboardLayout) {
  activeKeyboardLayout = layout;
  keyboardTabs.innerHTML = Object.keys(keyboardLayouts).map(name => `
    <button class="keyboard-tab ${name === layout ? 'active' : ''}" data-layout="${name}" role="tab" aria-selected="${name === layout}">${name}</button>
  `).join('');
  const keys = keyboardLayouts[layout];
  const renderKey = (key, index) => `
    <button class="math-key${key.template ? ' structure-key' : ''}" data-key-index="${index}" aria-label="插入 ${key.name || key.text || key.latex}">
      ${key.text || convertLatexToMarkup(key.latex)}
      ${key.template ? `<span>${key.name}</span>` : ''}
    </button>
  `;
  if (layout === '基础') {
    keyboardGrid.className = 'keyboard-grid basic-keyboard-grid';
    keyboardGrid.innerHTML = `
      <div class="number-pad">${keys.slice(0, 10).map(renderKey).join('')}</div>
      <div class="operator-pad">${keys.slice(10).map((key, index) => renderKey(key, index + 10)).join('')}</div>
    `;
  } else {
    keyboardGrid.className = `keyboard-grid${layout === '结构' ? ' structure-keyboard-grid' : ''}`;
    keyboardGrid.innerHTML = keys.map(renderKey).join('');
  }
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  window.setTimeout(() => toast.classList.remove('show'), 1800);
}

function insertLatex(latex) {
  mathfield.focus();
  mathfield.insert(latex, { insertionMode: 'replaceSelection' });
  if (latex.includes('\\placeholder')) mathfield.executeCommand('moveToNextPlaceholder');
  window.requestAnimationFrame(updatePromptAppearance);
}

function updatePromptAppearance() {
  const root = mathfield.shadowRoot;
  if (!root) return;
  if (!root.querySelector('#prompt-appearance-style')) {
    const style = document.createElement('style');
    style.id = 'prompt-appearance-style';
    style.textContent = `
      .ML__prompt-atom > .ML__editablePromptBox {
        border-color: #9bb8a7 !important;
        background: rgba(232, 245, 238, .42) !important;
        border-radius: 3px !important;
      }
      .ML__prompt-atom.prompt-filled > .ML__editablePromptBox {
        opacity: 0 !important;
        border-color: transparent !important;
        background: transparent !important;
        box-shadow: none !important;
      }
    `;
    root.appendChild(style);
  }
  root.querySelectorAll('.ML__prompt-atom').forEach(prompt => {
    const text = prompt.textContent.replace(/\u200b/g, '').trim();
    prompt.classList.toggle('prompt-filled', text.length > 0);
  });
}

const promptObserver = new MutationObserver(() => window.requestAnimationFrame(updatePromptAppearance));
if (mathfield.shadowRoot) {
  promptObserver.observe(mathfield.shadowRoot, { childList: true, characterData: true, subtree: true });
}

function calculate() {
  const editorLatex = mathfield.getValue('latex-expanded').trim();
  if (!editorLatex) {
    showToast('请先输入表达式');
    mathfield.focus();
    return;
  }
  const latex = unwrapPlaceholders(editorLatex);

  try {
    const intervalResult = evaluateIntervalSet(latex, ce);
    if (intervalResult !== null) {
      resultEmpty.hidden = true;
      resultMath.value = intervalResult;
      resultMath.classList.add('visible');
      resultDecimal.textContent = '';
      lastResult = intervalResult;
      addHistory(latex, intervalResult, '');
      return;
    }

    const expression = ce.parse(latex);
    if (!expression.isValid) throw new Error('invalid expression');

    if (isCalculusExpression(expression)) {
      const result = evaluateCalculus(expression);
      resultEmpty.hidden = true;
      resultMath.value = result.latex;
      resultMath.classList.add('visible');
      resultDecimal.textContent = '';
      lastResult = result.latex;
      addHistory(latex, result.latex, '');
      return;
    }

    const isSetNotation = /\\(?:cup|cap|subset|supset|in|notin|emptyset|mathbb)/.test(latex);
    const simplified = isSetNotation ? expression : expression.simplify();
    const numeric = isSetNotation ? null : expression.N();
    const symbolicLatex = isSetNotation ? latex : simplified.latex;
    const numericLatex = numeric && numeric.numericValue !== null ? numeric.latex : '';

    resultEmpty.hidden = true;
    resultMath.value = symbolicLatex;
    resultMath.classList.add('visible');
    resultDecimal.textContent = numericLatex && numericLatex !== symbolicLatex ? `约等于 ${numericLatex}` : '';
    lastResult = numericLatex || symbolicLatex;
    addHistory(latex, symbolicLatex, numericLatex);
  } catch (error) {
    resultEmpty.hidden = false;
    resultEmpty.textContent = '暂时无法计算这个表达式';
    resultMath.classList.remove('visible');
    resultDecimal.textContent = '';
  }
}

function addHistory(input, result, numeric) {
  history.unshift({ input, result, numeric });
  if (history.length > 12) history.pop();
  document.querySelector('#historyList').innerHTML = history.map((item, index) => `
    <button class="history-item" data-history-index="${index}">
      <math-field read-only>${item.input}</math-field><span>=</span><math-field read-only>${item.numeric || item.result}</math-field>
    </button>
  `).join('');
}

function toggleDrawer(open) {
  const drawer = document.querySelector('#historyDrawer');
  drawer.classList.toggle('open', open);
  drawer.setAttribute('aria-hidden', String(!open));
  document.querySelector('#scrim').classList.toggle('visible', open);
}

function setToolPanel(open) {
  toolPanel.classList.toggle('open', open);
  toolPanel.setAttribute('aria-hidden', String(!open));
  sideScrim.classList.toggle('visible', open);
}

renderKeyboard();

keyboardTabs.addEventListener('click', event => {
  const tab = event.target.closest('[data-layout]');
  if (tab) renderKeyboard(tab.dataset.layout);
});

keyboardGrid.addEventListener('click', event => {
  const key = event.target.closest('[data-key-index]');
  if (key) insertLatex(keyboardLayouts[activeKeyboardLayout][Number(key.dataset.keyIndex)].insert);
});

document.querySelector('.keyboard-nav').addEventListener('click', event => {
  const button = event.target.closest('[data-command]');
  if (button) {
    mathfield.focus();
    mathfield.executeCommand(button.dataset.command);
  }
});

document.querySelector('.tool-list').addEventListener('click', event => {
  const tool = event.target.closest('[data-tool]');
  if (tool) showToast(`${tool.dataset.tool}正在开发中`);
});

document.querySelector('#openToolPanel').addEventListener('click', () => setToolPanel(true));
document.querySelector('#closeToolPanel').addEventListener('click', () => setToolPanel(false));
sideScrim.addEventListener('click', () => setToolPanel(false));

document.querySelector('#calculateButton').addEventListener('click', calculate);
document.querySelector('#clearButton').addEventListener('click', () => { mathfield.value = ''; mathfield.focus(); });
document.querySelector('#undoButton').addEventListener('click', () => mathfield.executeCommand('undo'));
document.querySelector('#redoButton').addEventListener('click', () => mathfield.executeCommand('redo'));
document.querySelector('#keyboardButton').addEventListener('click', event => {
  const open = customKeyboard.classList.toggle('collapsed') === false;
  event.currentTarget.setAttribute('aria-expanded', String(open));
});
document.querySelector('#historyButton').addEventListener('click', () => toggleDrawer(true));
document.querySelector('#closeDrawer').addEventListener('click', () => toggleDrawer(false));
document.querySelector('#scrim').addEventListener('click', () => toggleDrawer(false));
document.querySelector('#historyList').addEventListener('click', event => {
  const item = event.target.closest('.history-item');
  if (!item) return;
  mathfield.value = history[Number(item.dataset.historyIndex)].input;
  toggleDrawer(false);
  mathfield.focus();
});
document.querySelector('#copyButton').addEventListener('click', async () => {
  if (!lastResult) return showToast('还没有可复制的结果');
  await navigator.clipboard.writeText(lastResult);
  showToast('结果已复制');
});
document.querySelector('#aiButton').addEventListener('click', () => document.querySelector('#aiDialog').showModal());
document.querySelector('#closeAiDialog').addEventListener('click', () => document.querySelector('#aiDialog').close());
mathfield.addEventListener('keydown', event => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    calculate();
  }
});
mathfield.addEventListener('input', () => window.requestAnimationFrame(updatePromptAppearance));

updatePromptAppearance();
mathfield.focus();
