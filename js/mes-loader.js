(async function initMonthlyExpansion() {
  /* 1. Upgrade speakJP to use real MP3 audio via /.netlify/functions/tts with speechSynthesis fallback */
  let currentAudioEl = null;
  const fallbackSpeech = window.speakJP;

  window.speakJP = function (text, rate = null, displayLabel = null) {
    if (!text) return;
    const speed = rate || parseFloat(document.getElementById('speedSelect')?.value || '0.92');
    const label = `🔊 Reproduciendo: ${displayLabel || text}`;
    if (typeof showAudioToast === 'function') showAudioToast(label, 7000);

    try {
      if (currentAudioEl) {
        currentAudioEl.pause();
        currentAudioEl = null;
      }
      const audio = new Audio(`/.netlify/functions/tts?q=${encodeURIComponent(text)}`);
      audio.playbackRate = Math.min(1.25, Math.max(0.65, speed));
      currentAudioEl = audio;

      audio.onended = () => {
        if (typeof hideAudioToast === 'function') hideAudioToast();
      };
      audio.onerror = () => {
        if (typeof fallbackSpeech === 'function') fallbackSpeech(text, rate, displayLabel);
      };

      const playPromise = audio.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {
          if (typeof fallbackSpeech === 'function') fallbackSpeech(text, rate, displayLabel);
        });
      }
    } catch (_) {
      if (typeof fallbackSpeech === 'function') fallbackSpeech(text, rate, displayLabel);
    }
  };

  /* 2. Load Mes 1 JSON */
  let mes1;
  try {
    const res = await fetch('/data/mes1.json');
    if (!res.ok) return;
    mes1 = await res.json();
  } catch (e) {
    console.warn('No se pudo cargar /data/mes1.json:', e);
    return;
  }

  /* 3. Inject 8 Mes 1 Grammar Lessons */
  mes1.grammar.forEach((g) => {
    if (!lessons.some((l) => l.id === g.id)) lessons.push(g);
  });

  /* 4. Inject 2 Mes 1 Stories */
  mes1.stories.forEach((st) => {
    if (!stories.some((s) => s.id === st.id)) stories.push(st);
  });

  /* 5. Inject 16 Mes 1 Kanji into Stroke Canvas */
  mes1.kanji.forEach((k) => {
    if (!drawChars.some((d) => d.char === k.char)) {
      drawChars.push({
        char: k.char,
        romaji: `${k.romaji} • ${k.es}`,
        hint: `On: ${k.on} | Kun: ${k.kun} — Ej: ${k.words.join(' / ')} — ${k.hint}`
      });
    }
  });

  /* 6. Auto-add all 120 Mes 1 Vocabulary Words to SRS */
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

  /* 7. Honest 6-Month Roadmap (only real content promised) */
  sixMonthOutline.length = 0;
  sixMonthOutline.push(
    { label: 'Mes 1 • Semanas 1–4 (ACTIVO)', title: 'Fundamentos, Números y Vida Diaria', detail: '120 palabras SRS • 16 Kanji N5 • 8 gramática SOV • 2 historias', minH: 0, maxH: 30 },
    { label: 'Mes 2 • Semanas 5–8 (Próximamente)', title: 'Verbos, Tiempo y Rutina', detail: 'Próxima carga: +130 palabras, +16 kanji, +8 gramática, +2 historias', minH: 30, maxH: 65 },
    { label: 'Mes 3 • Semanas 9–12 (Próximamente)', title: 'Adjetivos, Pasado y Forma -te', detail: 'Próxima carga: +130 palabras, +17 kanji, +8 gramática, +2 historias', minH: 65, maxH: 110 },
    { label: 'Mes 4 • Semanas 13–16 (Próximamente)', title: 'Peticiones, Permisos y Planes', detail: 'Próxima carga: +130 palabras, +17 kanji, +8 gramática, +2 historias', minH: 110, maxH: 165 },
    { label: 'Mes 5 • Semanas 17–20 (Próximamente)', title: 'Comparaciones y Opiniones', detail: 'Próxima carga: +130 palabras, +17 kanji, +8 gramática, +2 historias', minH: 165, maxH: 225 },
    { label: 'Mes 6 • Semanas 21–24 (Próximamente)', title: 'Integración JLPT N5', detail: 'Próxima carga: +130 palabras, +17 kanji, +10 gramática, +2 historias', minH: 225, maxH: 9999 }
  );

  /* 8. Honest Progress % (Completed Lessons + SRS Mastery) & Hours as Goal */
  const origRenderRoadmap = window.renderRoadmapStats;
  window.renderRoadmapStats = function () {
    origRenderRoadmap();
    const hours = state.totalMinutes / 60;
    const lbl = document.getElementById('loggedHoursLabel');
    if (lbl) lbl.textContent = `${hours.toFixed(1)} h (${state.totalMinutes} min) • Meta N5: 250–350 h`;

    const lessonPct = lessons.length ? (state.completedLessons.length / lessons.length) * 100 : 0;
    const masteredSrs = state.srs.filter((c) => (c.interval || 1) >= 3).length;
    const srsPct = state.srs.length ? (masteredSrs / state.srs.length) * 100 : 0;
    const overallPct = Math.round(lessonPct * 0.5 + srsPct * 0.5);

    const badge = document.getElementById('overallProgressBadge');
    if (badge) {
      badge.textContent = `Progreso real: ${overallPct}% (${state.completedLessons.length}/${lessons.length} lecciones • ${masteredSrs}/${state.srs.length} SRS dominadas)`;
    }
    const bar = document.getElementById('hoursProgressBar');
    if (bar) bar.style.width = `${overallPct}%`;
  };

  /* 9. Add Weekly Vocabulary Browser Card to Tab 1 */
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

  /* 10. Refresh UI */
  if (typeof refreshAll === 'function') refreshAll();
})();