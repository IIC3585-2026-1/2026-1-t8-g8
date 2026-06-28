const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const grupos = ["1", "4", "9", "10", "11"];
const DURACION_RONDA_DEFAULT = 180; 

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));
app.get('/api/grupos', (req, res) => {
  res.json({ grupos, duracionRondaDefault: DURACION_RONDA_DEFAULT });
});

// Historial de trazos por grupo, para poder "repintar" el canvas
// cuando alguien se conecta a mitad de la ronda (admin o un
// participante que recarga la página).
const historiales = {};
grupos.forEach((g) => (historiales[g] = []));

const conteoUsuarios = {};
grupos.forEach((g) => (conteoUsuarios[g] = 0));

let temporizador = {
  running: false,
  secondsLeft: 0,
  ended: false, 
  interval: null,
};

function nombreSala(grupo) {
  return `grupo:${grupo}`;
}

function emitirConteoUsuarios() {
  io.emit('user-counts', conteoUsuarios);
}

function iniciarTemporizador(segundos) {
  if (temporizador.interval) clearInterval(temporizador.interval);

  temporizador.running = true;
  temporizador.ended = false;
  temporizador.secondsLeft = segundos;

  io.emit('timer-tick', { secondsLeft: temporizador.secondsLeft, running: true });

  temporizador.interval = setInterval(() => {
    temporizador.secondsLeft -= 1;

    if (temporizador.secondsLeft <= 0) {
      clearInterval(temporizador.interval);
      temporizador.interval = null;
      temporizador.running = false;
      temporizador.ended = true;
      temporizador.secondsLeft = 0;
      io.emit('timer-tick', { secondsLeft: 0, running: false });
      io.emit('time-up');
    } else {
      io.emit('timer-tick', { secondsLeft: temporizador.secondsLeft, running: true });
    }
  }, 1000);
}

function detenerTemporizadorAhora() {
  if (temporizador.interval) clearInterval(temporizador.interval);
  temporizador.interval = null;
  temporizador.running = false;
  temporizador.ended = true;
  temporizador.secondsLeft = 0;
  io.emit('timer-tick', { secondsLeft: 0, running: false });
  io.emit('time-up');
}

function reiniciarRonda() {
  grupos.forEach((g) => (historiales[g] = []));
  if (temporizador.interval) clearInterval(temporizador.interval);
  temporizador = { running: false, secondsLeft: 0, ended: false, interval: null };
  io.emit('round-reset');
  io.emit('timer-tick', { secondsLeft: 0, running: false });
}

io.on('connection', (socket) => {
  socket.data.grupo = null;

  socket.on('join-group', (grupo) => {
    if (!grupos.includes(grupo)) {
      socket.emit('invalid-group');
      return;
    }

    socket.data.grupo = grupo;
    socket.join(nombreSala(grupo));
    conteoUsuarios[grupo] += 1;
    emitirConteoUsuarios();

    socket.emit('joined', {
      grupo,
      history: historiales[grupo],
      locked: temporizador.ended,
      timer: { secondsLeft: temporizador.secondsLeft, running: temporizador.running },
    });
  });

  socket.on('draw', (stroke) => {
    const grupo = socket.data.grupo;
    if (!grupo) return;

    const trazoCompleto = { ...stroke, grupo };
    historiales[grupo].push(trazoCompleto);
    socket.to(nombreSala(grupo)).emit('draw', trazoCompleto);
  });

  socket.on('join-admin', () => {
    grupos.forEach((g) => socket.join(nombreSala(g)));
    socket.emit('admin-init', {
      grupos,
      histories: historiales,
      userCounts: conteoUsuarios,
      timer: { secondsLeft: temporizador.secondsLeft, running: temporizador.running },
    });
  });

  socket.on('admin-start-timer', (segundos) => {
    const s = Number(segundos) > 0 ? Number(segundos) : DURACION_RONDA_DEFAULT;
    iniciarTemporizador(s);
  });

  socket.on('admin-stop-timer', () => {
    detenerTemporizadorAhora();
  });

  socket.on('admin-reset-round', () => {
    reiniciarRonda();
  });

  socket.on('disconnect', () => {
    const grupo = socket.data.grupo;
    if (grupo && conteoUsuarios[grupo] > 0) {
      conteoUsuarios[grupo] -= 1;
      emitirConteoUsuarios();
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Pizarra colaborativa corriendo en http://localhost:${PORT}`);
  console.log(`Grupos configurados: ${grupos.join(', ')}`);
});
