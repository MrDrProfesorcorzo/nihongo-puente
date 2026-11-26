const origRenderLeeches = window.renderLeeches;
  window.renderLeeches = function () {
    try {
      if (typeof origRenderLeeches === 'function') origRenderLeeches();
    } catch (_) {}
  };

  function gateTab3Clinic() {
    const tabW = document.getElementById('tab-writing');
    if (!tabW) return;
    tabW.querySelectorAll('.card').forEach((card) => {
      if (card.querySelector('#drawCanvas')) return;
      const txt = card.textContent || '';
      let locked = false;
      let lockMsg = '';

      if (txt.includes('シ') && txt.includes('ツ')) {
        locked = !hasDone('k3');
        lockMsg = `<span class="tag tag-amber">Clínica Katakana (Bloqueada)</span><p style="margin-top:8px;">🔒 Completa <strong>K3. Katakana</strong> en la Pestaña 1 para desbloquear la clínica シ/ツ/ソ/ン.</p>`;
      } else if (txt.includes('箸') || txt.includes('Pitch') || txt.includes('Acento')) {
        locked = !hasDone('kj8');
        lockMsg = `<span class="tag tag-amber">Clínica de Acento (Bloqueada)</span><p style="margin-top:8px;">🔒 Completa <strong>KJ8. Kanji</strong> en la Pestaña 1 para desbloquear la clínica de acento tonal.</p>`;
      } else {
        return;
      }

      let lockBox = card.querySelector('.clinic-lock-box');
      if (locked) {
        Array.from(card.children).forEach((ch) => {
          if (!ch.classList.contains('clinic-lock-box')) ch.style.display = 'none';
        });
        if (!lockBox) {
          lockBox = document.createElement('div');
          lockBox.className = 'clinic-lock-box';
          card.appendChild(lockBox);
        }
        lockBox.innerHTML = lockMsg;
        lockBox.style.display = '';
      } else {
        Array.from(card.children).forEach((ch) => {
          if (!ch.classList.contains('clinic-lock-box')) ch.style.display = '';
        });
        if (lockBox) lockBox.style.display = 'none';
      }
    });
  }