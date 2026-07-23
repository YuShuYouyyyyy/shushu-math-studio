import { contours } from 'd3-contour';

export const GRAPH_COLORS = ['#18794e', '#b14c39', '#3568a8', '#8a5a9b'];

export function compileGraphFunction(latex, computeEngine) {
  const source = latex.trim();
  if (!source) return null;
  const normalized = source.replace(/^\s*y\s*=\s*/i, '');
  const expression = computeEngine.parse(normalized);
  if (!expression.isValid) throw new Error('无法识别函数表达式');
  const unsupported = expression.symbols.filter(symbol => symbol !== 'x');
  if (unsupported.length) throw new Error(`函数中包含未赋值的字母 ${unsupported[0]}`);
  const evaluate = expression.compile();
  return x => {
    const value = Number(evaluate({ x }));
    return Number.isFinite(value) ? value : NaN;
  };
}

export function compileGraphExpression(latex, computeEngine) {
  const source = latex.trim();
  if (!source) return null;
  const expression = computeEngine.parse(source);
  if (!expression.isValid) throw new Error('无法识别函数或方程');

  if (expression.json?.[0] === 'Equal') {
    const left = computeEngine.box(expression.json[1]);
    const right = computeEngine.box(expression.json[2]);
    if (expression.json[1] === 'y' && !right.symbols.includes('y')) {
      return { mode: 'explicit', evaluate: compileGraphFunction(right.latex, computeEngine) };
    }
    if (expression.json[2] === 'y' && !left.symbols.includes('y')) {
      return { mode: 'explicit', evaluate: compileGraphFunction(left.latex, computeEngine) };
    }
    const difference = computeEngine.box(['Subtract', expression.json[1], expression.json[2]]).simplify();
    const unsupported = difference.symbols.filter(symbol => symbol !== 'x' && symbol !== 'y');
    if (unsupported.length) throw new Error(`方程中包含未赋值的字母 ${unsupported[0]}`);
    const evaluate = difference.compile();
    return {
      mode: 'implicit',
      evaluate: (x, y) => {
        const value = Number(evaluate({ x, y }));
        return Number.isFinite(value) ? value : NaN;
      }
    };
  }

  if (expression.symbols.includes('y')) {
    const unsupported = expression.symbols.filter(symbol => symbol !== 'x' && symbol !== 'y');
    if (unsupported.length) throw new Error(`表达式中包含未赋值的字母 ${unsupported[0]}`);
    const evaluate = expression.compile();
    return {
      mode: 'implicit',
      evaluate: (x, y) => {
        const value = Number(evaluate({ x, y }));
        return Number.isFinite(value) ? value : NaN;
      }
    };
  }

  return { mode: 'explicit', evaluate: compileGraphFunction(source, computeEngine) };
}

function niceStep(rawStep) {
  const power = 10 ** Math.floor(Math.log10(rawStep));
  const fraction = rawStep / power;
  const nice = fraction < 1.5 ? 1 : fraction < 3.5 ? 2 : fraction < 7.5 ? 5 : 10;
  return nice * power;
}

function formatTick(value) {
  if (Math.abs(value) < 1e-10) return '0';
  if (Math.abs(value) >= 1000 || Math.abs(value) < 0.01) return value.toExponential(1);
  return Number(value.toFixed(4)).toString();
}

export function createGraphController(canvas, onRangeChange = () => {}) {
  const context = canvas.getContext('2d');
  const state = { centerX: 0, centerY: 0, unitsPerPixel: 0.035, functions: [] };
  let dragging = false;
  let pointerX = 0;
  let pointerY = 0;

  const dimensions = () => ({ width: canvas.clientWidth, height: canvas.clientHeight });
  const toScreenX = (x, width) => width / 2 + (x - state.centerX) / state.unitsPerPixel;
  const toScreenY = (y, height) => height / 2 - (y - state.centerY) / state.unitsPerPixel;
  const toWorldX = (x, width) => state.centerX + (x - width / 2) * state.unitsPerPixel;
  const toWorldY = (y, height) => state.centerY - (y - height / 2) * state.unitsPerPixel;

  function resizeCanvas() {
    const { width, height } = dimensions();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const pixelWidth = Math.round(width * ratio);
    const pixelHeight = Math.round(height * ratio);
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
    }
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    return { width, height };
  }

  function drawGrid(width, height) {
    const step = niceStep(state.unitsPerPixel * 82);
    const left = toWorldX(0, width);
    const right = toWorldX(width, width);
    const bottom = toWorldY(height, height);
    const top = toWorldY(0, height);

    context.lineWidth = 1;
    context.strokeStyle = '#e4ebe6';
    context.fillStyle = '#6f7b73';
    context.font = '11px Microsoft YaHei, sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'top';

    for (let x = Math.ceil(left / step) * step; x <= right; x += step) {
      const screenX = toScreenX(x, width);
      context.beginPath();
      context.moveTo(screenX, 0);
      context.lineTo(screenX, height);
      context.stroke();
      if (Math.abs(x) > step / 100 && toScreenY(0, height) > 0 && toScreenY(0, height) < height - 18) {
        context.fillText(formatTick(x), screenX, toScreenY(0, height) + 6);
      }
    }

    context.textAlign = 'right';
    context.textBaseline = 'middle';
    for (let y = Math.ceil(bottom / step) * step; y <= top; y += step) {
      const screenY = toScreenY(y, height);
      context.beginPath();
      context.moveTo(0, screenY);
      context.lineTo(width, screenY);
      context.stroke();
      if (Math.abs(y) > step / 100 && toScreenX(0, width) > 35 && toScreenX(0, width) < width) {
        context.fillText(formatTick(y), toScreenX(0, width) - 7, screenY);
      }
    }

    context.strokeStyle = '#758078';
    context.lineWidth = 1.4;
    const axisX = toScreenX(0, width);
    const axisY = toScreenY(0, height);
    if (axisX >= 0 && axisX <= width) {
      context.beginPath(); context.moveTo(axisX, 0); context.lineTo(axisX, height); context.stroke();
    }
    if (axisY >= 0 && axisY <= height) {
      context.beginPath(); context.moveTo(0, axisY); context.lineTo(width, axisY); context.stroke();
    }
  }

  function drawFunctions(width, height) {
    state.functions.forEach(({ evaluate, color, mode }) => {
      if (mode === 'implicit') {
        drawImplicitCurve(evaluate, color, width, height);
        return;
      }
      context.beginPath();
      context.strokeStyle = color;
      context.lineWidth = 2.3;
      context.lineJoin = 'round';
      let drawing = false;
      let previousY = NaN;
      for (let screenX = 0; screenX <= width; screenX += 1) {
        const worldX = toWorldX(screenX, width);
        const worldY = evaluate(worldX);
        const screenY = toScreenY(worldY, height);
        const discontinuous = !Number.isFinite(screenY) || (drawing && Math.abs(screenY - previousY) > height * 0.8);
        if (discontinuous) {
          drawing = false;
        } else if (!drawing) {
          context.moveTo(screenX, screenY);
          drawing = true;
        } else {
          context.lineTo(screenX, screenY);
        }
        previousY = screenY;
      }
      context.stroke();
    });
  }

  function drawImplicitCurve(evaluate, color, width, height) {
    const spacing = Math.max(3, Math.round(Math.min(width, height) / 120));
    const columns = Math.floor(width / spacing) + 1;
    const rows = Math.floor(height / spacing) + 1;
    const values = new Array(columns * rows);

    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const screenX = column * spacing;
        const screenY = row * spacing;
        values[row * columns + column] = evaluate(
          toWorldX(screenX, width),
          toWorldY(screenY, height)
        );
      }
    }

    const contour = contours().size([columns, rows]).thresholds([0])(values)[0];
    if (!contour) return;
    context.beginPath();
    contour.coordinates.forEach(polygon => {
      polygon.forEach(ring => {
        ring.forEach((point, index) => {
          const x = point[0] * spacing;
          const y = point[1] * spacing;
          if (index === 0) context.moveTo(x, y);
          else context.lineTo(x, y);
        });
      });
    });
    context.strokeStyle = color;
    context.lineWidth = 2.3;
    context.lineJoin = 'round';
    context.stroke();
  }

  function draw() {
    const { width, height } = resizeCanvas();
    context.clearRect(0, 0, width, height);
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, width, height);
    drawGrid(width, height);
    drawFunctions(width, height);
    const halfWidth = width * state.unitsPerPixel / 2;
    const halfHeight = height * state.unitsPerPixel / 2;
    onRangeChange({
      xMin: state.centerX - halfWidth,
      xMax: state.centerX + halfWidth,
      yMin: state.centerY - halfHeight,
      yMax: state.centerY + halfHeight
    });
  }

  function zoom(factor, anchorX = canvas.clientWidth / 2, anchorY = canvas.clientHeight / 2) {
    const { width, height } = dimensions();
    const beforeX = toWorldX(anchorX, width);
    const beforeY = toWorldY(anchorY, height);
    state.unitsPerPixel = Math.min(20, Math.max(0.0002, state.unitsPerPixel * factor));
    state.centerX = beforeX - (anchorX - width / 2) * state.unitsPerPixel;
    state.centerY = beforeY + (anchorY - height / 2) * state.unitsPerPixel;
    draw();
  }

  canvas.addEventListener('wheel', event => {
    event.preventDefault();
    const rect = canvas.getBoundingClientRect();
    zoom(event.deltaY > 0 ? 1.18 : 0.84, event.clientX - rect.left, event.clientY - rect.top);
  }, { passive: false });
  canvas.addEventListener('pointerdown', event => {
    dragging = true;
    pointerX = event.clientX;
    pointerY = event.clientY;
    canvas.setPointerCapture(event.pointerId);
    canvas.classList.add('dragging');
  });
  canvas.addEventListener('pointermove', event => {
    if (!dragging) return;
    state.centerX -= (event.clientX - pointerX) * state.unitsPerPixel;
    state.centerY += (event.clientY - pointerY) * state.unitsPerPixel;
    pointerX = event.clientX;
    pointerY = event.clientY;
    draw();
  });
  canvas.addEventListener('pointerup', () => { dragging = false; canvas.classList.remove('dragging'); });
  canvas.addEventListener('pointercancel', () => { dragging = false; canvas.classList.remove('dragging'); });

  const resizeObserver = new ResizeObserver(draw);
  resizeObserver.observe(canvas);

  return {
    draw,
    setFunctions(functions) { state.functions = functions; draw(); },
    zoomIn() { zoom(0.78); },
    zoomOut() { zoom(1.28); },
    reset() { state.centerX = 0; state.centerY = 0; state.unitsPerPixel = 0.035; draw(); }
  };
}
