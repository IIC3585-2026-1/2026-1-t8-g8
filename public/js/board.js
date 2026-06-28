(function () {
  const params = new URLSearchParams(window.location.search);
  const grupo = params.get('grupo');

  if (!grupo) {
    window.location.href = 'index.html';
    return;
  }

  document.getElementById('group-label').textContent = `Grupo ${grupo}`;

  // Resolución lógica del canvas: es la misma en board.js y admin.js,
  // así las coordenadas que viajan por el socket sirven para ambos
  // sin necesidad de reescalar.
  const LOGICAL_W = 1000;
  const LOGICAL_H = 700;

  const canvas = document.getElementById('board');
  const ctx = canvas.getContext('2d');
  canvas.width = LOGICAL_W;
  canvas.height = LOGICAL_H;

  const socket = io();

  let drawing = false;
  let last = null;
  let tool = 'pencil';
  let color = '#1f2430';
  let size = 4;
  let locked = false;
  const ERASER_SIZE = 28;

  function toCanvasCoords(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * LOGICAL_W,
      y: ((clientY - rect.top) / rect.height) * LOGICAL_H,
    };
  }

  function drawStroke(stroke) {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (stroke.tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = stroke.color;
    }
    ctx.lineWidth = stroke.size;
    ctx.beginPath();
    ctx.moveTo(stroke.x0, stroke.y0);
    ctx.lineTo(stroke.x1, stroke.y1);
    ctx.stroke();
    ctx.restore();
  }

  function handleDown(x, y) {
    if (locked) return;
    drawing = true;
    last = { x, y };
  }

  function handleMove(x, y) {
    if (!drawing || locked) return;
    const stroke = {
      tool,
      color,
      size: tool === 'eraser' ? ERASER_SIZE : size,
      x0: last.x,
      y0: last.y,
      x1: x,
      y1: y,
    };
    drawStroke(stroke);
    socket.emit('draw', stroke);
    last = { x, y };
  }

  function handleUp() {
    drawing = false;
    last = null;
  }

  // --- Mouse ---
  canvas.addEventListener('mousedown', (e) => {
    const p = toCanvasCoords(e.clientX, e.clientY);
    handleDown(p.x, p.y);
  });
  canvas.addEventListener('mousemove', (e) => {
    const p = toCanvasCoords(e.clientX, e.clientY);
    handleMove(p.x, p.y);
  });
  window.addEventListener('mouseup', handleUp);

  // --- Touch ---
  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const t = e.touches[0];
    const p = toCanvasCoords(t.clientX, t.clientY);
    handleDown(p.x, p.y);
  }, { passive: false });

  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const t = e.touches[0];
    const p = toCanvasCoords(t.clientX, t.clientY);
    handleMove(p.x, p.y);
  }, { passive: false });

  canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    handleUp();
  }, { passive: false });

  // --- Toolbar ---
  const pencilBtn = document.getElementById('tool-pencil');
  const eraserBtn = document.getElementById('tool-eraser');
  const colorButtons = document.querySelectorAll('.color-swatch');
  const customColor = document.getElementById('custom-color');
  const sizeSlider = document.getElementById('size-slider');

  function setTool(t) {
    tool = t;
    pencilBtn.classList.toggle('active', t === 'pencil');
    eraserBtn.classList.toggle('active', t === 'eraser');
  }

  pencilBtn.addEventListener('click', () => setTool('pencil'));
  eraserBtn.addEventListener('click', () => setTool('eraser'));

  colorButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      color = btn.dataset.color;
      customColor.value = color;
      colorButtons.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      setTool('pencil');
    });
  });

  customColor.addEventListener('input', () => {
    color = customColor.value;
    colorButtons.forEach((b) => b.classList.remove('active'));
    setTool('pencil');
  });

  sizeSlider.addEventListener('input', () => {
    size = Number(sizeSlider.value);
  });

  document.getElementById('back-btn').addEventListener('click', () => {
    window.location.href = 'index.html';
  });

  // --- UI helpers ---
  function updateLockUI() {
    document.getElementById('locked-overlay').classList.toggle('visible', locked);
  }

  function updateTimerUI(timer) {
    const el = document.getElementById('timer-display');
    if (!timer || (!timer.running && timer.secondsLeft === 0)) {
      el.textContent = '—:--';
      return;
    }
    const m = Math.floor(timer.secondsLeft / 60);
    const s = timer.secondsLeft % 60;
    el.textContent = `${m}:${s.toString().padStart(2, '0')}`;
  }

  // --- Socket events ---
  socket.emit('join-group', grupo);

  socket.on('invalid-group', () => {
    window.location.href = 'index.html';
  });

  socket.on('joined', (data) => {
    ctx.clearRect(0, 0, LOGICAL_W, LOGICAL_H);
    (data.history || []).forEach(drawStroke);
    locked = data.locked;
    updateLockUI();
    updateTimerUI(data.timer);
  });

  socket.on('draw', (stroke) => {
    drawStroke(stroke);
  });

  socket.on('round-reset', () => {
    ctx.clearRect(0, 0, LOGICAL_W, LOGICAL_H);
    locked = false;
    updateLockUI();
  });

  socket.on('time-up', () => {
    locked = true;
    handleUp();
    updateLockUI();
  });

  socket.on('timer-tick', (data) => {
    updateTimerUI(data);
  });

  socket.on('user-counts', (counts) => {
    const el = document.getElementById('user-count');
    if (el) el.textContent = counts[grupo] ?? 0;
  });
})();
