(function () {
  const LOGICAL_W = 1000;
  const LOGICAL_H = 700;

  const grid = document.getElementById('admin-grid');
  const socket = io();
  const boards = {}; 

  function drawStroke(ctx, stroke) {
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

  function buildBoard(grupo) {
    const wrapper = document.createElement('div');
    wrapper.className = 'admin-board';
    wrapper.innerHTML = `
      <div class="admin-board-header">
        <span>Grupo ${grupo}</span>
        <span class="admin-user-count" id="count-${grupo}">0</span>
      </div>
      <canvas id="canvas-${grupo}" width="${LOGICAL_W}" height="${LOGICAL_H}"></canvas>
    `;
    grid.appendChild(wrapper);
    const canvas = wrapper.querySelector('canvas');
    boards[grupo] = { canvas, ctx: canvas.getContext('2d') };
  }

  function updateTimerUI(timer) {
    const el = document.getElementById('admin-timer-display');
    if (!timer || (!timer.running && timer.secondsLeft === 0)) {
      el.textContent = '—:--';
      return;
    }
    const m = Math.floor(timer.secondsLeft / 60);
    const s = timer.secondsLeft % 60;
    el.textContent = `${m}:${s.toString().padStart(2, '0')}`;
  }

  socket.emit('join-admin');

  socket.on('admin-init', (data) => {
    grid.innerHTML = '';
    (data.grupos || []).forEach((g) => {
      buildBoard(g);
      const historial = data.histories[g] || [];
      historial.forEach((s) => drawStroke(boards[g].ctx, s));
      const countEl = document.getElementById(`count-${g}`);
      if (countEl) countEl.textContent = data.userCounts[g] ?? 0;
    });
    updateTimerUI(data.timer);
  });

  socket.on('draw', (stroke) => {
    const board = boards[stroke.grupo];
    if (board) drawStroke(board.ctx, stroke);
  });

  socket.on('round-reset', () => {
    Object.values(boards).forEach(({ ctx, canvas }) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    });
  });

  socket.on('timer-tick', (data) => updateTimerUI(data));

  socket.on('user-counts', (counts) => {
    Object.keys(counts).forEach((g) => {
      const el = document.getElementById(`count-${g}`);
      if (el) el.textContent = counts[g];
    });
  });

  document.getElementById('start-timer-btn').addEventListener('click', () => {
    const minutos = Number(document.getElementById('minutes-input').value) || 3;
    socket.emit('admin-start-timer', minutos * 60);
  });

  document.getElementById('stop-timer-btn').addEventListener('click', () => {
    socket.emit('admin-stop-timer');
  });

  document.getElementById('reset-btn').addEventListener('click', () => {
    if (window.confirm('Esto borra todos los dibujos de todos los grupos. ¿Continuar?')) {
      socket.emit('admin-reset-round');
    }
  });
})();
