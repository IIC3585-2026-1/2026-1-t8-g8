async function initLobby() {
  const list = document.getElementById('groups-list');
  const emptyMsg = document.getElementById('empty-msg');

  try {
    const res = await fetch('/api/grupos');
    const data = await res.json();
    const grupos = data.grupos || [];

    if (grupos.length === 0) {
      emptyMsg.style.display = 'block';
      return;
    }

    grupos.forEach((g) => {
      const btn = document.createElement('button');
      btn.className = 'group-btn';
      btn.innerHTML = `${g}<span class="group-sub">Grupo</span>`;
      btn.addEventListener('click', () => {
        window.location.href = `board.html?grupo=${encodeURIComponent(g)}`;
      });
      list.appendChild(btn);
    });
  } catch (err) {
    emptyMsg.textContent = 'No se pudo conectar con el servidor.';
    emptyMsg.style.display = 'block';
  }
}

document.getElementById('admin-link').addEventListener('click', () => {
  window.location.href = 'admin.html';
});

initLobby();
