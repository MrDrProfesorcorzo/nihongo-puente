(async function initMonthlyExpansion() {
  /* =========================================================
     FIX 4: Warm up voices on first user gesture + reliable toast cleanup
  ========================================================= */
  let currentAudioEl = null;
  let audioSafetyTimer = null;
  let audioWarmedUp = false;

  function clearAudioIndicator() {
    clearTimeout(audioSafetyTimer);
    if (typeof hideAudioToast === 'function') {
      hideAudioToast();
    } else {
      const t = document.getElementById('audioToast');
      if (t) t.classList.remove('show');
    }
  }

  function warmUpAudioOnce() {
    if (audioWarmedUp) return;
    audioWarmedUp = true;
    try {
      if (typeof initAudio === 'function') initAudio();
      if ('speechSynthesis' in window) {
        window.speechSynthesis.getVoices();
        const u = new SpeechSynthesisUtterance('');
        u.volume = 0;
        u.lang = 'ja-JP';
        window.speechSynthesis.speak(u);
      }
    } catch (_) {}
  }

  ['pointerdown', 'touchstart', 'click'].forEach((evt) => {
    document.addEventListener(evt, warmUpAudioOnce, { once: true, passive: true });
  });

  function speakViaSpeechSynthesis(text, rate, label) {
    if (!('speechSynthesis' in window)) {
      clearAudioIndicator();
      return;
    }
    try {
      if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
        window.speechSynthesis.cancel();
      }
      const voices = window.speechSynthesis.getVoices();
      const jpVoice =
        voices.find((v) => v.lang === 'ja-JP' && v.localService) ||
        voices.find((v) => v.lang.toLowerCase().startsWith('ja')) ||
        null;

      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'ja-JP';
      if (jpVoice) u.voice = jpVoice;
      u.rate = rate;
      u.onend = clearAudioIndicator;
      u.onerror = clearAudioIndicator;

      if (typeof showAudioToast === 'function') showAudioToast(label, 5000);
      clearTimeout(audioSafetyTimer);
      audioSafetyTimer = setTimeout(clearAudioIndicator, 5500);
      window.speechSynthesis.speak(u);
    } catch (_) {
      clearAudioIndicator();
    }
  }

  window.speakJP = function (text, rate = null, displayLabel = null) {
    if (!text) return;
    warmUpAudioOnce();
    const speed = rate || parseFloat(document.getElementById('speedSelect')?.value || '0.92');
    const label = `🔊 Reproduciendo: ${displayLabel || text}`;

    try {
      if (currentAudioEl) {
        currentAudioEl.onended = null;
        currentAudioEl.onerror = null;
        currentAudioEl.pause();
        currentAudioEl = null;
      }

      if (typeof showAudioToast === 'function') showAudioToast(label, 6000);
      clearTimeout(audioSafetyTimer);
      audioSafetyTimer = setTimeout(clearAudioIndicator, 6500);

      const audio = new Audio(`/.netlify/functions/tts?q=${encodeURIComponent(text)}`);
      audio.playbackRate = Math.min(1.25, Math.max(0.65, speed));
      currentAudioEl = audio;

      audio.onended = () => {
        if (currentAudioEl === audio) currentAudioEl = null;
        clearAudioIndicator();
      };
      audio.onpause = () => {
        if (currentAudioEl === audio && audio.ended) clearAudioIndicator();
      };
      audio.onerror = () => {
        if (currentAudioEl === audio) currentAudioEl = null;
        speakViaSpeechSynthesis(text, speed, label);
      };

      const p = audio.play();
      if (p && typeof p.catch === 'function') {
        p.catch(() => {
          if (currentAudioEl === audio) currentAudioEl = null;
          speakViaSpeechSynthesis(text, speed, label);
        });
      }
    } catch (_) {
      speakViaSpeechSynthesis(text, speed, label);
    }
  };

  /* =========================================================
     LOAD MES 1 CONTENT
  ========================================================= */
  let mes1;
  try {
    const res = await fetch('/data/mes1.json');
    if (!res.ok) return;
    mes1 = await res.json();
  } catch (e) {
    console.warn('No se pudo cargar /data/mes1.json:', e);
    return;
  }

  mes1.grammar.forEach((g) => {
    if (!lessons.some((l) => l.id === g.id)) lessons.push(g);
  });

  mes1.stories.forEach((st) => {
    if (!stories.some((s) => s.id === st.id)) stories.push(st);
  });

  mes1.kanji.forEach((k) => {
    if (!drawChars.some((d) => d.char === k.char)) {
      drawChars.push({
        char: k.char,
        romaji: `${k.romaji} • ${k.es}`,
        hint: `On: ${k.on} | Kun: ${k.kun} — Ej: ${k.words.join(' / ')} — ${k.hint}`
      });
    }
  });

  let addedVocab = 0;
  Object.entries(mes1.vocab).forEach(([weekLabel, words]) => {
    words.forEach(([jp, romaji, es, example]) => {
      if (!state.srs.some((c) => c.jp === jp)) {
        state.srs.push({
          id: 'm1_' + jp,
          jp,
          romaji,
          es: `${es} — Ej: ${example}`,
          interval: 1,
          nextDue: 0,
          week: weekLabel
        });
        addedVocab++;
      }
    });
  });
  if (addedVocab > 0 && typeof saveLocal === 'function') saveLocal(false);

  /* =========================================================
     HONEST 6-MONTH ROADMAP
  ========================================================= */
  sixMonthOutline.length = 0;
  sixMonthOutline.push(
    { label: 'Mes 1 • Semanas 1–4 (ACTIVO)', title: 'Fundamentos, Números y Vida Diaria', detail: '120 palabras SRS • 16 Kanji N5 • 8 gramática SOV • 2 historias', minH: 0, maxH: 30 },
    { label: 'Mes 2 • Semanas 5–8 (Próximamente)', title: 'Verbos, Tiempo y Rutina', detail: 'Próxima carga: +130 palabras, +16 kanji, +8 gramática, +2 historias', minH: 30, maxH: 65 },
    { label: 'Mes 3 • Semanas 9–12 (Próximamente)', title: 'Adjetivos, Pasado y Forma -te', detail: 'Próxima carga: +130 palabras, +17 kanji, +8 gramática, +2 historias', minH: 65, maxH: 110 },
    { label: 'Mes 4 • Semanas 13–16 (Próximamente)', title: 'Peticiones, Permisos y Planes', detail: 'Próxima carga: +130 palabras, +17 kanji, +8 gramática, +2 historias', minH: 110, maxH: 165 },
    { label: 'Mes 5 • Semanas 17–20 (Próximamente)', title: 'Comparaciones y Opiniones', detail: 'Próxima carga: +130 palabras, +17 kanji, +8 gramática, +2 historias', minH: 165, maxH: 225 },
    { label: 'Mes 6 • Semanas 21–24 (Próximamente)', title: 'Integración JLPT N5', detail: 'Próxima carga: +130 palabras, +17 kanji, +10 gramática, +2 historias', minH: 225, maxH: 9999 }
  );

  /* =========================================================
     FIX 3: Single source of truth for Progress %
  ========================================================= */
  window.getCourseProgress = function () {
    const totalLessons = lessons.length || 1;
    const doneLessons = state.completedLessons.length;
    const totalSrs = state.srs.length || 1;
    const masteredSrs = state.srs.filter((c) => (c.interval || 1) >= 3).length;
    const lessonPct = (doneLessons / totalLessons) * 100;
    const srsPct = (masteredSrs / totalSrs) * 100;
    const pct = Math.round(lessonPct * 0.5 + srsPct * 0.5);
    return { pct, doneLessons, totalLessons, masteredSrs, totalSrs, srsPct: Math.round(srsPct) };
  };

  const origRenderRoadmap = window.renderRoadmapStats;
  window.renderRoadmapStats = function () {
    origRenderRoadmap();
    const hours = state.totalMinutes / 60;
    const p = window.getCourseProgress();

    const lbl = document.getElementById('loggedHoursLabel');
    if (lbl) lbl.textContent = `${hours.toFixed(1)} h (${state.totalMinutes} min) • Meta N5: 250–350 h`;

    // Keep ALL progress displays synchronized to the exact same number
    const badge = document.getElementById('overallProgressBadge');
    if (badge) {
      badge.textContent = `Progreso general: ${p.pct}% (${p.doneLessons}/${p.totalLessons} lecciones • ${p.masteredSrs}/${p.totalSrs} SRS)`;
    }
    document.querySelectorAll('[data-progress-pct]').forEach((el) => {
      el.textContent = `${p.pct}%`;
    });

    const bar = document.getElementById('hoursProgressBar');
    if (bar) bar.style.width = `${p.pct}%`;

    renderTab4LowerSections();
  };

  /* =========================================================
     FIX 2: Persistent Tab 4 Lower Half (Shadowing, Voice Test, SRS Stats)
  ========================================================= */
  const shadowingLines = [
    { jp: 'おはようございます。', romaji: 'Ohayō gozaimasu.', es: 'Buenos días.' },
    { jp: 'メキシコから来ました。', romaji: 'Mekishiko kara kimashita.', es: 'Vine de México.' },
    { jp: 'コーヒーを二つください。', romaji: 'Kōhī o futatsu kudasai.', es: 'Dos cafés, por favor.' },
    { jp: '毎日、日本語を勉強します。', romaji: 'Mainichi, Nihongo o benkyō shimasu.', es: 'Todos los días estudio japonés.' }
  ];
  let shadowIdx = 0;

  window.renderTab4LowerSections = function () {
    const tabSrs = document.getElementById('tab-srs');
    if (!tabSrs) return;

    let wrap = document.getElementById('tab4LowerStudio');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.id = 'tab4LowerStudio';
      tabSrs.appendChild(wrap);
    }

    const p = window.getCourseProgress();
    const dueCount = state.srs.filter((c) => (c.nextDue || 0) <= Date.now()).length;
    const s = shadowingLines[shadowIdx];

    wrap.innerHTML = `
      <div class="card">
        <div style="display:flex; flex-wrap:wrap; justify-content:space-between; align-items:center; gap:8px;">
          <div>
            <span class="tag tag-teal">Estadísticas SRS</span>
            <div style="font-size:0.9rem; margin-top:4px;">
              <strong>${p.masteredSrs}</strong> dominadas de <strong>${p.totalSrs}</strong> tarjetas • Pendientes hoy: <strong>${dueCount}</strong> • Progreso general: <strong>${p.pct}%</strong>
            </div>
          </div>
        </div>
        <div class="progress-track" style="margin-top:8px;">
          <div class="progress-fill" style="width:${p.srsPct}%;"></div>
        </div>
      </div>

      <div class="grid-2">
        <div class="card">
          <span class="tag tag-teal">Shadowing • Escucha y Repite</span>
          <h3 style="margin:6px 0 8px;">Escucha y Repite</h3>
          <div class="card-alt">
            <div class="jp" style="font-size:1.2rem; font-weight:700;">${s.jp}</div>
            <div class="romaji" style="font-size:0.84rem; color:var(--muted);">${s.romaji}</div>
            <div style="font-size:0.88rem; margin-top:4px;">${s.es}</div>
          </div>
          <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:10px;">
            <button class="btn btn-primary" onclick="speakJP('${s.jp}', 0.8)">🔊 Escuchar</button>
            <button class="btn btn-outline" onclick="nextShadowingLine()">Siguiente →</button>
          </div>
        </div>

        <div class="card">
          <span class="tag tag-amber">Prueba de Voz • Tu turno</span>
          <h3 style="margin:6px 0 8px;">Tu turno</h3>
          <p style="font-size:0.86rem; color:var(--muted); margin-bottom:10px;">
            Escucha la frase modelo, pulsa <strong>Comenzar</strong> y repítela en voz alta imitando el ritmo.
          </p>
          <div class="card-alt" id="voiceTestStatus" style="font-size:0.88rem; margin-bottom:10px;">
            Listo para practicar: <strong class="jp">${s.jp}</strong>
          </div>
          <div style="display:flex; gap:8px; flex-wrap:wrap;">
            <button class="btn btn-amber" onclick="startVoiceTest()">🎙️ Comenzar</button>
            <button class="btn btn-primary" onclick="speakJP('${s.jp}', 0.85)">🔊 Escuchar</button>
          </div>
        </div>
      </div>
    `;
  };

  window.nextShadowingLine = function () {
    shadowIdx = (shadowIdx + 1) % shadowingLines.length;
    renderTab4LowerSections();
  };

  window.startVoiceTest = function () {
    const status = document.getElementById('voiceTestStatus');
    const s = shadowingLines[shadowIdx];
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      if (status) status.innerHTML = `🎙️ Practica en voz alta ahora: <strong class="jp">${s.jp}</strong> (reconocimiento automático no soportado en este navegador).`;
      return;
    }
    try {
      const rec = new SR();
      rec.lang = 'ja-JP';
      rec.interimResults = false;
      if (status) status.textContent = '🎙️ Escuchando... habla en japonés ahora.';
      rec.onresult = (e) => {
        const heard = e.results?.[0]?.[0]?.transcript || '';
        if (status) status.innerHTML = `✅ Escuchado: <strong class="jp">${heard}</strong>`;
      };
      rec.onerror = () => {
        if (status) status.textContent = '⚠️ No se detectó micrófono. Puedes practicar escuchando y repitiendo en voz alta.';
      };
      rec.start();
    } catch (_) {
      if (status) status.textContent = '⚠️ No se pudo iniciar el micrófono.';
    }
  };

  // Ensure Tab 4 lower half always renders on tab switch and SRS updates
  const origSwitchTab = window.switchTab;
  window.switchTab = function (tabId) {
    origSwitchTab(tabId);
    if (tabId === 'srs') renderTab4LowerSections();
  };

  const origRenderSRS = window.renderSRS;
  window.renderSRS = function () {
    origRenderSRS();
    renderTab4LowerSections();
  };

  /* =========================================================
     WEEKLY VOCABULARY BROWSER (TAB 1)
  ========================================================= */
  const tabRoadmap = document.getElementById('tab-roadmap');
  if (tabRoadmap && !document.getElementById('mes1VocabCard')) {
    const weeks = Object.keys(mes1.vocab);
    const card = document.createElement('div');
    card.id = 'mes1VocabCard';
    card.className = 'card';
    card.innerHTML = `
      <div style="display:flex; flex-wrap:wrap; justify-content:space-between; align-items:center; gap:8px; margin-bottom:10px;">
        <div>
          <span class="tag tag-amber">Mes 1 • Vocabulario Activo (120 palabras en SRS)</span>
          <h3 style="margin-top:4px;">Vocabulario por Semana</h3>
        </div>
        <select id="vocabWeekSelect">
          ${weeks.map((w, i) => `<option value="${i}">${w} (${mes1.vocab[w].length})</option>`).join('')}
        </select>
      </div>
      <div id="vocabWeekGrid" style="display:grid; grid-template-columns:repeat(auto-fill,minmax(210px,1fr)); gap:8px;"></div>
    `;
    tabRoadmap.appendChild(card);

    function renderVocabWeek(idx) {
      const list = mes1.vocab[weeks[idx]] || [];
      document.getElementById('vocabWeekGrid').innerHTML = list.map(([jp, romaji, es, ex]) => `
        <div class="card-alt" style="padding:10px;">
          <div style="display:flex; justify-content:space-between; align-items:center; gap:6px;">
            <strong class="jp" style="font-size:1.05rem;">${jp}</strong>
            <button class="pill-btn" onclick="speakJP('${jp}')">🔊</button>
          </div>
          <div class="romaji" style="font-size:0.78rem; color:var(--muted);">${romaji}</div>
          <div style="font-weight:700; font-size:0.86rem; margin-top:2px;">${es}</div>
          <div class="jp" style="font-size:0.78rem; color:var(--muted); margin-top:4px; cursor:pointer;" onclick="speakJP('${ex}')">🔊 ${ex}</div>
        </div>
      `).join('');
    }

    document.getElementById('vocabWeekSelect').addEventListener('change', (e) => {
      renderVocabWeek(parseInt(e.target.value, 10));
    });
    renderVocabWeek(0);
  }

  /* Final synchronized refresh */
  if (typeof refreshAll === 'function') refreshAll();
  renderTab4LowerSections();
})();
