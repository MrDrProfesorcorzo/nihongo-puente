(function initPedagogicalEngine() {
  /* =========================================================
     FIX 1: UNREGISTER STALE SERVICE WORKERS & INIT STATE SYNC
  ========================================================= */
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach((r) => r.unregister());
    }).catch(() => {});
  }

  if (!state.blockMastery) state.blockMastery = {};
  const hasDone = (reqId) => !reqId || state.completedLessons.includes(reqId);

  /* =========================================================
     FIX 9: AUDIO WARM-UP, KANA-ONLY TTS & LIVE-REGION CLEANUP
  ========================================================= */
  let currentAudioEl = null;
  let audioSafetyTimer = null;
  let audioWarmedUp = false;

  function clearAudioIndicator() {
    clearTimeout(audioSafetyTimer);
    if (typeof hideAudioToast === 'function') hideAudioToast();
    const t = document.getElementById('audioToast');
    if (t) {
      t.classList.remove('show');
      t.textContent = '';
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
        u.volume = 0; u.lang = 'ja-JP';
        window.speechSynthesis.speak(u);
      }
    } catch (_) {}
  }
  ['pointerdown', 'touchstart', 'click'].forEach((e) =>
    document.addEventListener(e, warmUpAudioOnce, { once: true, passive: true })
  );

  function speakViaSpeechSynthesis(text, rate, label) {
    if (!('speechSynthesis' in window)) { clearAudioIndicator(); return; }
    try {
      if (window.speechSynthesis.speaking || window.speechSynthesis.pending) window.speechSynthesis.cancel();
      const voices = window.speechSynthesis.getVoices();
      const jpVoice = voices.find((v) => v.lang === 'ja-JP' && v.localService) || voices.find((v) => v.lang.toLowerCase().startsWith('ja')) || null;
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'ja-JP'; if (jpVoice) u.voice = jpVoice; u.rate = rate;
      u.onend = clearAudioIndicator; u.onerror = clearAudioIndicator;
      if (typeof showAudioToast === 'function') showAudioToast(label, 5000);
      clearTimeout(audioSafetyTimer);
      audioSafetyTimer = setTimeout(clearAudioIndicator, 5500);
      window.speechSynthesis.speak(u);
    } catch (_) { clearAudioIndicator(); }
  }

  window.speakJP = function (text, rate = null, displayLabel = null) {
    if (!text) return;
    warmUpAudioOnce();
    const cleanText = String(text).trim();
    const speed = rate || parseFloat(document.getElementById('speedSelect')?.value || '0.92');
    const label = `🔊 Reproduciendo: ${displayLabel || cleanText}`;
    try {
      if (currentAudioEl) { currentAudioEl.onended = null; currentAudioEl.onerror = null; currentAudioEl.pause(); currentAudioEl = null; }
      if (typeof showAudioToast === 'function') showAudioToast(label, 6000);
      clearTimeout(audioSafetyTimer);
      audioSafetyTimer = setTimeout(clearAudioIndicator, 6500);
      const audio = new Audio(`/.netlify/functions/tts?q=${encodeURIComponent(cleanText)}`);
      audio.playbackRate = Math.min(1.25, Math.max(0.65, speed));
      currentAudioEl = audio;
      audio.onended = () => { if (currentAudioEl === audio) currentAudioEl = null; clearAudioIndicator(); };
      audio.onerror = () => { if (currentAudioEl === audio) currentAudioEl = null; speakViaSpeechSynthesis(cleanText, speed, label); };
      const p = audio.play();
      if (p && p.catch) p.catch(() => { if (currentAudioEl === audio) currentAudioEl = null; speakViaSpeechSynthesis(cleanText, speed, label); });
    } catch (_) { speakViaSpeechSynthesis(cleanText, speed, label); }
  };

  /* =========================================================
     FIX 4 & 5: FULL 27-UNIT CURRICULUM (SYNCHRONOUS — ATOMIC SWAP)
     Hiragana (46 + 25 dakuten) + Katakana (46 + 25 dakuten) + Grammar + Kanji Track
  ========================================================= */
  const mkKana = (pairs, role = 'topic') =>
    pairs.map(([jp, romaji, noteES]) => ({ jp, romaji, role, noteES, noteEN: noteES }));

  const fullCurriculum = [
    {
      id: 'u1', isScript: true, title: '1. Vocales Puras (あいうえお)', tag: 'Hiragana 1/7',
      stage1Label: 'Etapa 1 • El Sonido (60s)', stage2Label: 'Etapa 2 • Conoce las 5 Vocales (Individuales)', stage3Label: 'Etapa 3 • Decodifica tu Primera Palabra',
      ruleES: 'Hoy no vas a memorizar gramática: vas a desbloquear 5 formas que suenan igual que en español mexicano (a, i, u, e, o). Único detalle: en la "u" (う) relaja los labios sin hacer trompita.',
      ruleEN: 'Unlock 5 shapes that sound just like Spanish vowels (a, i, u, e, o). Keep "u" (う) unrounded.',
      chunks: mkKana([
        ['あ','a','Suena "a" limpia. Gancho: una "a" con cruz arriba.'],
        ['い','i','Suena "i" limpia. Gancho: dos palitos "i"guales.'],
        ['う','u','Suena "u" relajada. Gancho: una "u" acostada.'],
        ['え','e','Suena "e" limpia. Gancho: corredor con "e"nergía.'],
        ['お','o','Suena "o" limpia. Gancho: círculo abajo como una "o".']
      ]),
      puzzlePromptES: 'Usa las 5 vocales de abajo para escribir "ai" (amor):',
      puzzlePromptEN: 'Spell "ai" (love) using the 5 vowels:',
      puzzleAnswer: ['あ','い'], puzzleDistractors: ['う','え','お']
    },
    {
      id: 'u2', isScript: true, title: '2. La "R" Suave (らりるれろ)', tag: 'Hiragana 2/7',
      stage1Label: 'Etapa 1 • El Sonido (60s)', stage2Label: 'Etapa 2 • La Fila R (らりるれろ)', stage3Label: 'Etapa 3 • Combina Vocales + Fila R',
      ruleES: 'La R japonesa es tu "r" suave de "pero" o "caro" (nunca "perro"). Combínala con las 5 vocales que ya aprendiste.',
      ruleEN: 'Japanese R is a single soft tap like Spanish "pero". Combine it with the 5 vowels.',
      chunks: mkKana([
        ['ら','ra','r suave + a. Gancho: un 5 con gorrito.'],
        ['り','ri','r suave + i. Gancho: dos cañas de río.'],
        ['る','ru','r suave + u. Gancho: un 3 con rizo abajo.'],
        ['れ','re','r suave + e. Gancho: línea que rebota afuera.'],
        ['ろ','ro','r suave + o. Gancho: como る pero sin rizo.']
      ]),
      puzzlePromptES: 'Usa solo letras que ya conoces para escribir "iro" (color):',
      puzzlePromptEN: 'Spell "iro" (color):',
      puzzleAnswer: ['い','ろ'], puzzleDistractors: ['ら','る','あ']
    },
    {
      id: 'h3', isScript: true, title: 'H3. Filas K y G (かきくけこ・がぎぐげご)', tag: 'Hiragana 3/7',
      stage1Label: 'Etapa 1 • Sonidos K y Dakuten (゛)', stage2Label: 'Etapa 2 • Escucha y Repite (K / G)', stage3Label: 'Etapa 3 • Escribe una Palabra',
      ruleES: 'Aprende la fila K (ka, ki, ku, ke, ko). Con dos comillas arriba a la derecha (゛dakuten), K se vuelve G suave (ga, gi, gu, ge, go).',
      ruleEN: 'Learn K-row. Adding dakuten (゛) turns K into G.',
      chunks: mkKana([
        ['か','ka','k+a'],['き','ki','k+i'],['く','ku','k+u'],['け','ke','k+e'],['こ','ko','k+o'],
        ['が','ga','か+゛'],['ぎ','gi','き+゛'],['ぐ','gu','く+゛'],['げ','ge','け+゛'],['ご','go','こ+゛']
      ]),
      puzzlePromptES: 'Escribe "kore" (esto) usando letras de H3 y L2:',
      puzzlePromptEN: 'Spell "kore" (this):',
      puzzleAnswer: ['こ','れ'], puzzleDistractors: ['か','き','ろ']
    },
    {
      id: 'h4', isScript: true, title: 'H4. Filas S y Z (さしすせそ・ざじずぜぞ)', tag: 'Hiragana 4/7',
      stage1Label: 'Etapa 1 • Sonidos S y Z', stage2Label: 'Etapa 2 • Escucha y Repite (S / Z)', stage3Label: 'Etapa 3 • Escribe una Palabra',
      ruleES: 'Fila S: sa, shi, su, se, so. Con comillas (゛) se vuelve Z/J: za, ji, zu, ze, zo.',
      ruleEN: 'S-row (shi) and dakuten Z-row (ji).',
      chunks: mkKana([
        ['さ','sa','s+a'],['し','shi','sh+i'],['す','su','s+u'],['せ','se','s+e'],['そ','so','s+o'],
        ['ざ','za','さ+゛'],['じ','ji','し+゛'],['ず','zu','す+゛'],['ぜ','ze','せ+゛'],['ぞ','zo','そ+゛']
      ]),
      puzzlePromptES: 'Escribe "sushi" (すし):',
      puzzlePromptEN: 'Spell "sushi":',
      puzzleAnswer: ['す','し'], puzzleDistractors: ['さ','せ','そ']
    },
    {
      id: 'h5', isScript: true, title: 'H5. Filas T y D (たちつてと・だぢづでど)', tag: 'Hiragana 5/7',
      stage1Label: 'Etapa 1 • Sonidos T y D (Completo)', stage2Label: 'Etapa 2 • Escucha y Repite (T / D)', stage3Label: 'Etapa 3 • Escribe una Palabra',
      ruleES: 'Fila T: ta, chi, tsu, te, to. Con comillas (゛) se vuelve D: da, ji (ぢ), zu (づ), de, do.',
      ruleEN: 'T-row (chi, tsu) and full dakuten D-row (da, ji, zu, de, do).',
      chunks: mkKana([
        ['た','ta','t+a'],['ち','chi','ch+i'],['つ','tsu','ts+u'],['て','te','t+e'],['と','to','t+o'],
        ['だ','da','た+゛'],['ぢ','ji','ち+゛ (poco común)'],['づ','zu','つ+゛ (poco común)'],['で','de','て+゛'],['ど','do','と+゛']
      ]),
      puzzlePromptES: 'Escribe "desu" (です = es/soy):',
      puzzlePromptEN: 'Spell "desu":',
      puzzleAnswer: ['で','す'], puzzleDistractors: ['て','た','と']
    },
    {
      id: 'h6', isScript: true, title: 'H6. Filas N y H/B/P (なにぬねの・はばぱ)', tag: 'Hiragana 6/7',
      stage1Label: 'Etapa 1 • Filas N, H, B y P (Completo)', stage2Label: 'Etapa 2 • Escucha y Repite', stage3Label: 'Etapa 3 • Escribe una Palabra',
      ruleES: 'Fila N (na–no) y Fila H (ha–ho). En la fila H: comillas (゛) da B completa (ba, bi, bu, be, bo) y circulito (゜) da P completa (pa, pi, pu, pe, po).',
      ruleEN: 'N-row and full H/B/P rows.',
      chunks: mkKana([
        ['な','na','n+a'],['に','ni','n+i'],['ぬ','nu','n+u'],['ね','ne','n+e'],['の','no','n+o'],
        ['は','ha','h+a (partícula "wa")'],['ひ','hi','h+i'],['ふ','fu','f+u'],['へ','he','h+e'],['ほ','ho','h+o'],
        ['ば','ba','は+゛'],['び','bi','ひ+゛'],['ぶ','bu','ふ+゛'],['べ','be','へ+゛'],['ぼ','bo','ほ+゛'],
        ['ぱ','pa','は+゜'],['ぴ','pi','ひ+゜'],['ぷ','pu','ふ+゜'],['ぺ','pe','へ+゜'],['ぽ','po','ほ+゜']
      ]),
      puzzlePromptES: 'Escribe "taberu" (たべる = comer):',
      puzzlePromptEN: 'Spell "taberu" (to eat):',
      puzzleAnswer: ['た','べ','る'], puzzleDistractors: ['は','に','の']
    },
    {
      id: 'h7', isScript: true, title: 'H7. Filas M, Y, W y N (ま–ん)', tag: 'Hiragana 7/7',
      stage1Label: 'Etapa 1 • Cierre de Hiragana (46 + 25 dakuten)', stage2Label: 'Etapa 2 • Escucha y Repite', stage3Label: 'Etapa 3 • Escribe una Palabra',
      ruleES: '¡Últimas letras de Hiragana! Filas M, Y, W y ん (n). Con esto completaste los 46 hiragana básicos y los 25 dakuten/handakuten.',
      ruleEN: 'Final Hiragana rows: M, Y, W, and N (46 basic + 25 dakuten complete).',
      chunks: mkKana([
        ['ま','ma','m+a'],['み','mi','m+i'],['む','mu','m+u'],['め','me','m+e'],['も','mo','m+o'],
        ['や','ya','y+a'],['ゆ','yu','y+u'],['よ','yo','y+o'],
        ['わ','wa','w+a'],['を','o','partícula de objeto (suena "o")'],['ん','n','n final']
      ]),
      puzzlePromptES: 'Escribe "watashi" (わたし = yo):',
      puzzlePromptEN: 'Spell "watashi" (I):',
      puzzleAnswer: ['わ','た','し'], puzzleDistractors: ['ま','も','ん']
    },
    {
      id: 'k1', isScript: true, title: 'K1. Katakana: Vocales y K/S (ア–ソ)', tag: 'Katakana 1/4',
      stage1Label: 'Etapa 1 • ¿Por qué existe Katakana?', stage2Label: 'Etapa 2 • Escucha y Repite (ア–ソ)', stage3Label: 'Etapa 3 • Lee Katakana',
      ruleES: 'Katakana tiene los mismos sonidos que Hiragana, con trazos rectos para palabras extranjeras. El guion "ー" alarga la vocal anterior.',
      ruleEN: 'Katakana uses angular shapes for loanwords. "ー" extends the vowel.',
      chunks: mkKana([
        ['ア','a','a'],['イ','i','i'],['ウ','u','u'],['エ','e','e'],['オ','o','o'],
        ['カ','ka','ka'],['キ','ki','ki'],['ク','ku','ku'],['ケ','ke','ke'],['コ','ko','ko'],
        ['サ','sa','sa'],['シ','shi','shi (mira arriba)'],['ス','su','su'],['セ','se','se'],['ソ','so','so']
      ], 'object'),
      puzzlePromptES: 'Escribe "aisu" (アイス = helado/frío):',
      puzzlePromptEN: 'Spell "aisu" (iced):',
      puzzleAnswer: ['ア','イ','ス'], puzzleDistractors: ['カ','コ','シ']
    },
    {
      id: 'k2', isScript: true, title: 'K2. Katakana: T, N y H (タ–ホ)', tag: 'Katakana 2/4',
      stage1Label: 'Etapa 1 • Katakana T, N y H', stage2Label: 'Etapa 2 • Escucha y Repite (タ–ホ)', stage3Label: 'Etapa 3 • Lee Katakana',
      ruleES: 'Domina las filas T, N y H en Katakana. Con esto ya puedes leer "タコス" (tacos) y "コーヒー" (café).',
      ruleEN: 'Katakana T, N, and H rows.',
      chunks: mkKana([
        ['タ','ta','ta'],['チ','chi','chi'],['ツ','tsu','tsu (mira abajo)'],['テ','te','te'],['ト','to','to'],
        ['ナ','na','na'],['ニ','ni','ni'],['ヌ','nu','nu'],['ネ','ne','ne'],['ノ','no','no'],
        ['ハ','ha','ha'],['ヒ','hi','hi'],['フ','fu','fu'],['ヘ','he','he'],['ホ','ho','ho'],
        ['フェ','fe','フ+ェ = fe']
      ], 'object'),
      puzzlePromptES: 'Escribe "takosu" (タコス = tacos):',
      puzzlePromptEN: 'Spell "takosu" (tacos):',
      puzzleAnswer: ['タ','コ','ス'], puzzleDistractors: ['テ','ト','ホ']
    },
    {
      id: 'k3', isScript: true, title: 'K3. Katakana: M, Y, R, W, N (マ–ン)', tag: 'Katakana 3/4',
      stage1Label: 'Etapa 1 • 46 Katakana Básicos Completos', stage2Label: 'Etapa 2 • Escucha y Repite (マ–ン)', stage3Label: 'Etapa 3 • Lee Katakana',
      ruleES: 'Últimas letras básicas de Katakana: M, Y, R, W (incluyendo ヲ) y ン (n).',
      ruleEN: 'Final basic Katakana rows including ヲ and ン (46/46 basic complete).',
      chunks: mkKana([
        ['マ','ma','ma'],['ミ','mi','mi'],['ム','mu','mu'],['メ','me','me'],['モ','mo','mo'],
        ['ヤ','ya','ya'],['ユ','yu','yu'],['ヨ','yo','yo'],
        ['ラ','ra','ra'],['リ','ri','ri'],['ル','ru','ru'],['レ','re','re'],['ロ','ro','ro'],
        ['ワ','wa','wa'],['ヲ','o','wo/o (poco común)'],['ン','n','n final'],['ー','—','alarga vocal']
      ], 'object'),
      puzzlePromptES: 'Escribe "ramen" (ラーメン):',
      puzzlePromptEN: 'Spell "rāmen":',
      puzzleAnswer: ['ラ','ー','メ','ン'], puzzleDistractors: ['マ','レ','ロ']
    },
    {
      id: 'k4', isScript: true, title: 'K4. Katakana Dakuten (ガ–ポ)', tag: 'Katakana 4/4',
      stage1Label: 'Etapa 1 • Cierre de Katakana (46 + 25 dakuten)', stage2Label: 'Etapa 2 • Escucha y Repite (G, Z, D, B, P)', stage3Label: 'Etapa 3 • Lee Katakana con Dakuten',
      ruleES: 'Igual que en Hiragana: comillas (゛) convierte K→G, S→Z, T→D, H→B; y circulito (゜) convierte H→P. ¡Con esto dominas todo Katakana!',
      ruleEN: 'All 25 Katakana dakuten/handakuten (G, Z, D, B, P rows).',
      chunks: mkKana([
        ['ガ','ga','カ+゛'],['ギ','gi','キ+゛'],['グ','gu','ク+゛'],['ゲ','ge','ケ+゛'],['ゴ','go','コ+゛'],
        ['ザ','za','サ+゛'],['ジ','ji','シ+゛'],['ズ','zu','ス+゛'],['ゼ','ze','セ+゛'],['ゾ','zo','ソ+゛'],
        ['ダ','da','タ+゛'],['ヂ','ji','チ+゛'],['ヅ','zu','ツ+゛'],['デ','de','テ+゛'],['ド','do','ト+゛'],
        ['バ','ba','ハ+゛'],['ビ','bi','ヒ+゛'],['ブ','bu','フ+゛'],['ベ','be','ヘ+゛'],['ボ','bo','ホ+゛'],
        ['パ','pa','ハ+゜'],['ピ','pi','ヒ+゜'],['プ','pu','フ+゜'],['ペ','pe','ヘ+゜'],['ポ','po','ホ+゜']
      ], 'object'),
      puzzlePromptES: 'Escribe "terebi" (テレビ = televisión):',
      puzzlePromptEN: 'Spell "terebi" (television):',
      puzzleAnswer: ['テ','レ','ビ'], puzzleDistractors: ['ピ','ペ','デ']
    },

    // --- GRAMMAR LESSONS (FIX 7: Etapa 2 = "Escucha y Repite"; FIX 9: M1-2 kana-by-kana) ---
    {
      id: 'u3', title: '3. Fórmula Inglés → Katakana', tag: 'Katakana Aplicado',
      stage1Label: 'Etapa 1 • Fórmula de 4 Reglas (60s)', stage2Label: 'Etapa 2 • Escucha y Repite', stage3Label: 'Etapa 3 • Reconocimiento Katakana',
      ruleES: 'Ahora que ya lees todo Katakana, usa estas 4 reglas para decodificar miles de palabras: 1) Sin consonantes solas (añade u/o), 2) L→R, 3) V→B, 4) Finales mudos ganan u/o.',
      ruleEN: '4 rules unlock Katakana loanwords: break clusters with u/o, L→R, V→B.',
      chunks: [
        { jp: 'スマホ', romaji: 'sumaho', role: 'object', noteES: 'Smartphone → su-ma-ho', noteEN: 'Smartphone' },
        { jp: 'テレビ', romaji: 'terebi', role: 'object', noteES: 'Television → te-re-bi (L→R, V→B)', noteEN: 'Television' },
        { jp: 'タコス', romaji: 'takosu', role: 'topic', noteES: 'Tacos → ta-ko-su (S final gana u)', noteEN: 'Tacos' }
      ],
      puzzlePromptES: 'Selecciona en orden: "Tacos" + "Smartphone"',
      puzzlePromptEN: 'Select in order: "Tacos" + "Smartphone"',
      puzzleAnswer: ['タコス','スマホ'], puzzleDistractors: ['テレビ']
    },
    {
      id: 'm1_g1', title: 'M1-1. Presentación: A は B です', tag: 'Gramática 1',
      stage1Label: 'Etapa 1 • Estructura Base (60s)', stage2Label: 'Etapa 2 • Escucha y Repite', stage3Label: 'Etapa 3 • Arma la Oración',
      ruleES: 'Para decir "A es B", pon de quién hablas seguido de は (se escribe ha, pero suena "wa") y cierra con です (es/soy, forma respetuosa).',
      ruleEN: 'Say "A is B" with は (read "wa") and polite です.',
      chunks: [
        { jp: 'わたし', romaji: 'watashi', role: 'topic', noteES: 'Yo', noteEN: 'I' },
        { jp: 'は', romaji: 'wa', role: 'particle', noteES: 'Se escribe ha, suena "wa"', noteEN: 'Topic (wa)' },
        { jp: 'がくせい', romaji: 'gakusei', role: 'object', noteES: 'Estudiante', noteEN: 'Student' },
        { jp: 'です', romaji: 'desu', role: 'verb', noteES: 'Soy / Es (forma respetuosa)', noteEN: 'Am / Is' }
      ],
      puzzlePromptES: 'Arma: "Yo soy estudiante"', puzzlePromptEN: 'Build: "I am a student"',
      puzzleAnswer: ['わたし','は','がくせい','です'], puzzleDistractors: ['せんせい']
    },
    {
      id: 'm1_g2', title: 'M1-2. Negación: じゃありません', tag: 'Gramática 2',
      stage1Label: 'Etapa 1 • Cómo Negar (60s)', stage2Label: 'Etapa 2 • Escucha y Repite (Kana por Kana)', stage3Label: 'Etapa 3 • Arma la Negación',
      ruleES: 'Para decir "no soy / no es", reemplaza です por じゃありません (ja + a + ri + ma + se + n).',
      ruleEN: 'Replace です with じゃありません (ja + a + ri + ma + se + n).',
      chunks: [
        { jp: 'わたし', romaji: 'watashi', role: 'topic', noteES: 'Yo', noteEN: 'I' },
        { jp: 'は', romaji: 'wa', role: 'particle', noteES: 'Suena "wa"', noteEN: 'Topic' },
        { jp: 'せんせい', romaji: 'sensei', role: 'object', noteES: 'Profesor', noteEN: 'Teacher' },
        { jp: 'じゃ', romaji: 'ja', role: 'verb', noteES: 'じ + ゃ = ja', noteEN: 'ja' },
        { jp: 'あ', romaji: 'a', role: 'verb', noteES: 'a', noteEN: 'a' },
        { jp: 'り', romaji: 'ri', role: 'verb', noteES: 'ri', noteEN: 'ri' },
        { jp: 'ま', romaji: 'ma', role: 'verb', noteES: 'ma', noteEN: 'ma' },
        { jp: 'せ', romaji: 'se', role: 'verb', noteES: 'se', noteEN: 'se' },
        { jp: 'ん', romaji: 'n', role: 'verb', noteES: 'n (じゃありません = no soy/es)', noteEN: 'n' }
      ],
      puzzlePromptES: 'Arma: "Yo no soy profesor" (deletreando じゃありません):', puzzlePromptEN: 'Build: "I am not a teacher"',
      puzzleAnswer: ['わたし','は','せんせい','じゃ','あ','り','ま','せ','ん'], puzzleDistractors: ['です']
    },
    {
      id: 'u4', title: '4. El Verbo Va Al Final y は / を', tag: 'Gramática 3',
      stage1Label: 'Etapa 1 • Regla de Oro (60s)', stage2Label: 'Etapa 2 • Escucha y Repite', stage3Label: 'Etapa 3 • Arma la Oración',
      ruleES: 'En japonés el verbo va SIEMPRE al final: "Yo [は] tacos [を] como". Trampas: は suena "wa", y を suena "o". Verbo: たべる (comer) → たべます (como).',
      ruleEN: 'Verb always goes last. は="wa", を="o". たべる → たべます.',
      chunks: [
        { jp: 'わたし', romaji: 'watashi', role: 'topic', noteES: 'Yo', noteEN: 'I' },
        { jp: 'は', romaji: 'wa', role: 'particle', noteES: 'Suena "wa"', noteEN: 'Topic (wa)' },
        { jp: 'タコス', romaji: 'takosu', role: 'object', noteES: 'Tacos', noteEN: 'Tacos' },
        { jp: 'を', romaji: 'o', role: 'particle', noteES: 'Suena "o" (objeto)', noteEN: 'Object (o)' },
        { jp: 'たべます', romaji: 'tabemasu', role: 'verb', noteES: 'De たべる → たべます', noteEN: 'Eat' }
      ],
      puzzlePromptES: 'Arma poniendo el verbo al final: "Yo como tacos"', puzzlePromptEN: 'Build: "I eat tacos"',
      puzzleAnswer: ['わたし','は','タコス','を','たべます'], puzzleDistractors: ['です','スマホ']
    },
    {
      id: 'u5', title: '5. Lugar Estático (に) vs Acción (で)', tag: 'Gramática 4',
      stage1Label: 'Etapa 1 • に vs で (60s)', stage2Label: 'Etapa 2 • Escucha y Repite', stage3Label: 'Etapa 3 • Arma la Oración',
      ruleES: 'Usa に para estar en un lugar, y で donde OCURRE una acción. Verbo: のむ (beber) → のみます (bebo).',
      ruleEN: 'Use に for static location and で for actions. のむ → のみます.',
      chunks: [
        { jp: 'わたし', romaji: 'watashi', role: 'topic', noteES: 'Yo', noteEN: 'I' },
        { jp: 'は', romaji: 'wa', role: 'particle', noteES: 'Suena "wa"', noteEN: 'Topic' },
        { jp: 'カフェ', romaji: 'kafe', role: 'topic', noteES: 'Cafetería', noteEN: 'Cafe' },
        { jp: 'で', romaji: 'de', role: 'particle', noteES: 'En (acción)', noteEN: 'At' },
        { jp: 'コーヒー', romaji: 'kōhī', role: 'object', noteES: 'Café', noteEN: 'Coffee' },
        { jp: 'を', romaji: 'o', role: 'particle', noteES: 'Suena "o"', noteEN: 'Object' },
        { jp: 'のみます', romaji: 'nomimasu', role: 'verb', noteES: 'De のむ → のみます', noteEN: 'Drink' }
      ],
      puzzlePromptES: 'Arma: "Yo tomo café en la cafetería"', puzzlePromptEN: 'Build: "I drink coffee at the cafe"',
      puzzleAnswer: ['わたし','は','カフェ','で','コーヒー','を','のみます'], puzzleDistractors: ['に']
    },
    {
      id: 'u6', title: '6. Adjetivos -i y この vs これ', tag: 'Gramática 5',
      stage1Label: 'Etapa 1 • Adjetivos -i (60s)', stage2Label: 'Etapa 2 • Escucha y Repite', stage3Label: 'Etapa 3 • Arma la Oración',
      ruleES: 'Los adjetivos en -i (たかい = caro) se niegan con くない (たかくない). この va antes de un sustantivo; これ va solo.',
      ruleEN: 'i-adjectives negate with -kunai. この + noun vs これ alone.',
      chunks: [
        { jp: 'この', romaji: 'kono', role: 'topic', noteES: 'Este (+ sustantivo)', noteEN: 'This (+ noun)' },
        { jp: 'ラーメン', romaji: 'rāmen', role: 'topic', noteES: 'Ramen', noteEN: 'Ramen' },
        { jp: 'は', romaji: 'wa', role: 'particle', noteES: 'Suena "wa"', noteEN: 'Topic' },
        { jp: 'たかくない', romaji: 'takakunai', role: 'verb', noteES: 'De たかい → たかくない', noteEN: 'Not expensive' }
      ],
      puzzlePromptES: 'Arma: "Este ramen no es caro"', puzzlePromptEN: 'Build: "This ramen is not expensive"',
      puzzleAnswer: ['この','ラーメン','は','たかくない'], puzzleDistractors: ['たかい','これ']
    },
    {
      id: 'u7', title: '7. Pedir con ください y Contador つ', tag: 'Gramática 6',
      stage1Label: 'Etapa 1 • Cómo Pedir (60s)', stage2Label: 'Etapa 2 • Escucha y Repite', stage3Label: 'Etapa 3 • Arma el Pedido',
      ruleES: 'Pide con ください (ku-da-sa-i). Contador general つ: 1 = ひとつ, 2 = ふたつ (irregular de に).',
      ruleEN: 'Order with ください. 1=ひとつ, 2=ふたつ.',
      chunks: [
        { jp: 'わたし', romaji: 'watashi', role: 'topic', noteES: 'Yo', noteEN: 'I' },
        { jp: 'は', romaji: 'wa', role: 'particle', noteES: 'Suena "wa"', noteEN: 'Topic' },
        { jp: 'コーヒー', romaji: 'kōhī', role: 'object', noteES: 'Café', noteEN: 'Coffee' },
        { jp: 'を', romaji: 'o', role: 'particle', noteES: 'Suena "o"', noteEN: 'Object' },
        { jp: 'ふたつ', romaji: 'futatsu', role: 'topic', noteES: 'Dos cosas', noteEN: 'Two' },
        { jp: 'ください', romaji: 'kudasai', role: 'verb', noteES: 'Por favor deme', noteEN: 'Please' }
      ],
      puzzlePromptES: 'Pide: "Yo quiero dos cafés, por favor"', puzzlePromptEN: 'Order: "Two coffees, please"',
      puzzleAnswer: ['わたし','は','コーヒー','を','ふたつ','ください'], puzzleDistractors: ['ひとつ','で']
    },
    {
      id: 'u8', title: '8. Omisión del Sujeto y に (Destino)', tag: 'Gramática 7',
      stage1Label: 'Etapa 1 • Omisión y Destino (60s)', stage2Label: 'Etapa 2 • Escucha y Repite', stage3Label: 'Etapa 3 • Arma la Oración',
      ruleES: 'Omite わたし cuando es obvio. Aquí に marca DESTINO ("hacia"), distinto al に estático de la Lección 5. Verbo: いく → いきます.',
      ruleEN: 'Drop obvious subjects. に marks destination. いく → いきます.',
      chunks: [
        { jp: 'あした', romaji: 'ashita', role: 'topic', noteES: 'Mañana', noteEN: 'Tomorrow' },
        { jp: 'とうきょう', romaji: 'Tōkyō', role: 'object', noteES: 'Tokio', noteEN: 'Tokyo' },
        { jp: 'に', romaji: 'ni', role: 'particle', noteES: 'Hacia (destino)', noteEN: 'To' },
        { jp: 'いきます', romaji: 'ikimasu', role: 'verb', noteES: 'De いく → いきます', noteEN: 'Go' }
      ],
      puzzlePromptES: 'Arma omitiendo "yo": "Mañana voy a Tokio"', puzzlePromptEN: 'Build: "Tomorrow I go to Tokyo"',
      puzzleAnswer: ['あした','とうきょう','に','いきます'], puzzleDistractors: ['で','を']
    },
    {
      id: 'm1_g3', title: 'M1-3. Preguntas con か', tag: 'Gramática 8',
      stage1Label: 'Etapa 1 • Partícula か (60s)', stage2Label: 'Etapa 2 • Escucha y Repite', stage3Label: 'Etapa 3 • Arma la Pregunta',
      ruleES: 'Agrega か al final de cualquier oración cortés para volverla pregunta.',
      ruleEN: 'Add か at the end of a polite sentence to ask a question.',
      chunks: [
        { jp: 'これ', romaji: 'kore', role: 'topic', noteES: 'Esto', noteEN: 'This' },
        { jp: 'は', romaji: 'wa', role: 'particle', noteES: 'Suena "wa"', noteEN: 'Topic' },
        { jp: 'ひゃくえん', romaji: 'hyakuen', role: 'object', noteES: '100 yenes', noteEN: '100 yen' },
        { jp: 'です', romaji: 'desu', role: 'verb', noteES: 'Es', noteEN: 'Is' },
        { jp: 'か', romaji: 'ka', role: 'particle', noteES: 'Pregunta', noteEN: 'Question' }
      ],
      puzzlePromptES: 'Pregunta: "¿Esto cuesta 100 yenes?"', puzzlePromptEN: 'Ask: "Is this 100 yen?"',
      puzzleAnswer: ['これ','は','ひゃくえん','です','か'], puzzleDistractors: ['この']
    },
    {
      id: 'm1_g4', title: 'M1-4. Posesión con の', tag: 'Gramática 9',
      stage1Label: 'Etapa 1 • Partícula の (60s)', stage2Label: 'Etapa 2 • Escucha y Repite', stage3Label: 'Etapa 3 • Arma la Oración',
      ruleES: 'の conecta [Dueño] の [Objeto]. Así, わたし の ほん significa "mi libro".',
      ruleEN: 'の connects [Owner] の [Item]: わたし の ほん = "my book".',
      chunks: [
        { jp: 'これ', romaji: 'kore', role: 'topic', noteES: 'Esto', noteEN: 'This' },
        { jp: 'は', romaji: 'wa', role: 'particle', noteES: 'Suena "wa"', noteEN: 'Topic' },
        { jp: 'わたし', romaji: 'watashi', role: 'object', noteES: 'Yo (dueño)', noteEN: 'My' },
        { jp: 'の', romaji: 'no', role: 'particle', noteES: 'Posesión', noteEN: 'Of' },
        { jp: 'ほん', romaji: 'hon', role: 'object', noteES: 'Libro', noteEN: 'Book' },
        { jp: 'です', romaji: 'desu', role: 'verb', noteES: 'Es', noteEN: 'Is' }
      ],
      puzzlePromptES: 'Arma: "Esto es mi libro"', puzzlePromptEN: 'Build: "This is my book"',
      puzzleAnswer: ['これ','は','わたし','の','ほん','です'], puzzleDistractors: ['を','か']
    },
    {
      id: 'm1_g5', title: 'M1-5. Demostrativos: これ・それ・あれ', tag: 'Gramática 10',
      stage1Label: 'Etapa 1 • Distancias (60s)', stage2Label: 'Etapa 2 • Escucha y Repite', stage3Label: 'Etapa 3 • Arma la Oración',
      ruleES: 'これ (esto), それ (eso), あれ (aquello). これ va solo; この va antes de un sustantivo.',
      ruleEN: 'これ (this), それ (that), あれ (that over there).',
      chunks: [
        { jp: 'あれ', romaji: 'are', role: 'topic', noteES: 'Aquello', noteEN: 'That over there' },
        { jp: 'は', romaji: 'wa', role: 'particle', noteES: 'Suena "wa"', noteEN: 'Topic' },
        { jp: 'えき', romaji: 'eki', role: 'object', noteES: 'Estación', noteEN: 'Station' },
        { jp: 'です', romaji: 'desu', role: 'verb', noteES: 'Es', noteEN: 'Is' }
      ],
      puzzlePromptES: 'Arma: "Aquello es la estación"', puzzlePromptEN: 'Build: "That over there is the station"',
      puzzleAnswer: ['あれ','は','えき','です'], puzzleDistractors: ['これ','この']
    },
    {
      id: 'm1_g6', title: 'M1-6. Partícula も (también)', tag: 'Gramática 11',
      stage1Label: 'Etapa 1 • Partícula も (60s)', stage2Label: 'Etapa 2 • Escucha y Repite', stage3Label: 'Etapa 3 • Arma la Oración',
      ruleES: 'も significa "también" y REEMPLAZA a は o を.',
      ruleEN: 'も means "also" and replaces は or を.',
      chunks: [
        { jp: 'わたし', romaji: 'watashi', role: 'topic', noteES: 'Yo', noteEN: 'I' },
        { jp: 'も', romaji: 'mo', role: 'particle', noteES: 'También', noteEN: 'Also' },
        { jp: 'メキシコじん', romaji: 'Mekishikojin', role: 'object', noteES: 'Mexicano/a', noteEN: 'Mexican' },
        { jp: 'です', romaji: 'desu', role: 'verb', noteES: 'Soy', noteEN: 'Am' }
      ],
      puzzlePromptES: 'Arma: "Yo también soy mexicano"', puzzlePromptEN: 'Build: "I am also Mexican"',
      puzzleAnswer: ['わたし','も','メキシコじん','です'], puzzleDistractors: ['は','を']
    },
    {
      id: 'm1_g7', title: 'M1-7. Partícula が y Gustos (すき)', tag: 'Gramática 12',
      stage1Label: 'Etapa 1 • が y Adjetivos-na (60s)', stage2Label: 'Etapa 2 • Escucha y Repite', stage3Label: 'Etapa 3 • Arma la Oración',
      ruleES: 'が señala el objetivo de un sentimiento. すき (gustar) es adjetivo-na y usa が, nunca を.',
      ruleEN: 'が marks the target of すき (na-adjective).',
      chunks: [
        { jp: 'わたし', romaji: 'watashi', role: 'topic', noteES: 'A mí', noteEN: 'I' },
        { jp: 'は', romaji: 'wa', role: 'particle', noteES: 'Suena "wa"', noteEN: 'Topic' },
        { jp: 'すし', romaji: 'sushi', role: 'object', noteES: 'Sushi', noteEN: 'Sushi' },
        { jp: 'が', romaji: 'ga', role: 'particle', noteES: 'Marca lo que gusta', noteEN: 'Target' },
        { jp: 'すき です', romaji: 'suki desu', role: 'verb', noteES: 'Me gusta', noteEN: 'Like' }
      ],
      puzzlePromptES: 'Arma: "Me gusta el sushi"', puzzlePromptEN: 'Build: "I like sushi"',
      puzzleAnswer: ['わたし','は','すし','が','すき です'], puzzleDistractors: ['を','も']
    },
    {
      id: 'm1_g8', title: 'M1-8. Existencia: あります vs います', tag: 'Gramática 13',
      stage1Label: 'Etapa 1 • Seres Vivos vs Objetos (60s)', stage2Label: 'Etapa 2 • Escucha y Repite', stage3Label: 'Etapa 3 • Arma la Oración',
      ruleES: 'Lugar lleva に; lo que existe lleva が. Usa あります para objetos/lugares e います para personas/animales.',
      ruleEN: 'Location takes に; item takes が. あります (non-living) vs います (living).',
      chunks: [
        { jp: 'こうえん', romaji: 'kōen', role: 'topic', noteES: 'Parque', noteEN: 'Park' },
        { jp: 'に', romaji: 'ni', role: 'particle', noteES: 'En', noteEN: 'In' },
        { jp: 'こども', romaji: 'kodomo', role: 'object', noteES: 'Niño(s)', noteEN: 'Child(ren)' },
        { jp: 'が', romaji: 'ga', role: 'particle', noteES: 'Sujeto', noteEN: 'Subject' },
        { jp: 'います', romaji: 'imasu', role: 'verb', noteES: 'Hay (seres vivos)', noteEN: 'Exist (living)' }
      ],
      puzzlePromptES: 'Arma: "Hay niños en el parque"', puzzlePromptEN: 'Build: "There are children in the park"',
      puzzleAnswer: ['こうえん','に','こども','が','います'], puzzleDistractors: ['あります','で']
    },

    // --- FIX 5: REAL MONTH-1 KANJI TRACK (WITH FADING FURIGANA) ---
    {
      id: 'kj1', isScript: true, title: 'KJ1. Kanji Mes 1 (1–4): 一 二 三 百', tag: 'Kanji 1/2',
      stage1Label: 'Etapa 1 • Tus Primeros 4 Kanji (60s)', stage2Label: 'Etapa 2 • Escucha y Repite (con Furigana)', stage3Label: 'Etapa 3 • Reconoce los Kanji',
      ruleES: 'Ahora que ya lees sus sonidos en hiragana, aprende tus primeros 4 kanji. El furigana arriba desaparecerá automáticamente cuando los domines 3 veces.',
      ruleEN: 'Learn your first 4 kanji with furigana that fades after 3 correct answers.',
      chunks: [
        { jp: '一', furigana: 'いち', romaji: 'ichi', role: 'topic', noteES: 'Uno (いち / ひとつ). 1 trazo horizontal.', noteEN: 'One' },
        { jp: '二', furigana: 'に', romaji: 'ni', role: 'topic', noteES: 'Dos (に / ふたつ). 2 trazos horizontales.', noteEN: 'Two' },
        { jp: '三', furigana: 'さん', romaji: 'san', role: 'topic', noteES: 'Tres (さん / みっつ). 3 trazos horizontales.', noteEN: 'Three' },
        { jp: '百', furigana: 'ひゃく', romaji: 'hyaku', role: 'object', noteES: 'Cien (ひゃく). Ej: 百円 = 100 yenes.', noteEN: 'Hundred' }
      ],
      puzzlePromptES: 'Selecciona en orden: "Dos" + "Cien"',
      puzzlePromptEN: 'Select in order: "Two" + "Hundred"',
      puzzleAnswer: ['二','百'], puzzleDistractors: ['一','三']
    },
    {
      id: 'kj2', isScript: true, title: 'KJ2. Kanji Mes 1 (5–8): 円 本 日 人', tag: 'Kanji 2/2',
      stage1Label: 'Etapa 1 • Kanji Esenciales (60s)', stage2Label: 'Etapa 2 • Escucha y Repite (con Furigana)', stage3Label: 'Etapa 3 • Forma "Japón" (日本)',
      ruleES: 'Aprende 4 kanji que verás todos los días: 円 (yen), 本 (libro/origen), 日 (sol/día) y 人 (persona).',
      ruleEN: 'Learn 4 daily kanji: yen, book, sun/day, person.',
      chunks: [
        { jp: '円', furigana: 'えん', romaji: 'en', role: 'object', noteES: 'Yen (えん). Ej: 百円.', noteEN: 'Yen' },
        { jp: '本', furigana: 'ほん', romaji: 'hon', role: 'object', noteES: 'Libro / origen (ほん). Ej: わたしの本.', noteEN: 'Book' },
        { jp: '日', furigana: 'に', romaji: 'ni / hi', role: 'topic', noteES: 'Sol / día (に・ひ).', noteEN: 'Sun / day' },
        { jp: '人', furigana: 'ひと', romaji: 'hito / jin', role: 'topic', noteES: 'Persona (ひと・じん).', noteEN: 'Person' }
      ],
      puzzlePromptES: 'Forma la palabra "Nihon" (Japón = Sol + Origen):',
      puzzlePromptEN: 'Build "Nihon" (Japan):',
      puzzleAnswer: ['日','本'], puzzleDistractors: ['円','人']
    }
  ];

  // ATOMIC SYNCHRONOUS SWAP (prevents old 8-lesson course from ever rendering)
  lessons.length = 0;
  fullCurriculum.forEach((l) => lessons.push(l));
  if (!lessons.some((l) => l.id === activeLessonId)) activeLessonId = lessons[0].id;

  // HONEST 6-MONTH ROADMAP (FIX 7 & 8: no "SOV", honest 2 stories count)
  sixMonthOutline.length = 0;
  sixMonthOutline.push(
    { label: 'Mes 1 • Semanas 1–4 (ACTIVO)', title: 'Hiragana, Katakana, Bases N5 y 8 Kanji', detail: '46+25 Hiragana • 46+25 Katakana • 13 gramática • 8 Kanji • 2 historias i+1', minH: 0, maxH: 30 },
    { label: 'Mes 2 • Semanas 5–8 (Próximamente)', title: 'Verbos, Tiempo y Rutina (El Verbo Va Al Final)', detail: 'Próxima carga: verbos -masu, horas, rutina diaria y +16 kanji N5', minH: 30, maxH: 65 },
    { label: 'Mes 3 • Semanas 9–12 (Próximamente)', title: 'Adjetivos, Pasado y Forma -te', detail: 'Próxima carga: pasado, forma -te y nuevas historias i+1', minH: 65, maxH: 110 },
    { label: 'Mes 4 • Semanas 13–16 (Próximamente)', title: 'Peticiones, Permisos y Planes', detail: 'Próxima carga: permisos, planes y kanji N5', minH: 110, maxH: 165 },
    { label: 'Mes 5 • Semanas 17–20 (Próximamente)', title: 'Comparaciones y Opiniones', detail: 'Próxima carga: comparaciones, opiniones y lectura guiada', minH: 165, maxH: 225 },
    { label: 'Mes 6 • Semanas 21–24 (Próximamente)', title: 'Integración JLPT N5', detail: 'Próxima carga: repaso integral y simulacro N5', minH: 225, maxH: 9999 }
  );

  // PURGE LEGACY / UNGATED SRS CARDS IMMEDIATELY (FIX 2)
  state.srs = (state.srs || []).filter((c) => c.reqLesson && c.jp !== 'カフェで本を読みます');
  if (typeof saveLocal === 'function') saveLocal(false);

  /* =========================================================
     RENDER WORKSPACE (WITH FURIGANA FADING & ROMAJI FADING)
  ========================================================= */
  const romajiMap = {};
  const furiganaMap = {};
  lessons.forEach((l) => l.chunks.forEach((c) => {
    romajiMap[c.jp] = c.romaji;
    if (c.furigana) furiganaMap[c.jp] = c.furigana;
  }));

  function renderRuby(jp) {
    const f = furiganaMap[jp];
    const mastered = (state.blockMastery[jp] || 0) >= 3;
    if (f && !mastered) return `<ruby>${jp}<rt style="font-size:0.65rem;color:var(--teal);">${f}</rt></ruby>`;
    return jp;
  }

  window.renderLessonWorkspace = function () {
    const l = lessons.find((x) => x.id === activeLessonId) || lessons[0];
    const isES = state.lang === 'es';
    const allTiles = [...l.puzzleAnswer, ...l.puzzleDistractors].sort();
    const s1 = l.stage1Label || 'Etapa 1 • Concepto (60s)';
    const s2 = l.stage2Label || 'Etapa 2 • Escucha y Repite';
    const s3 = l.stage3Label || 'Etapa 3 • Arma la Oración';
    const tapHint = 'Toca cada bloque arriba para escuchar y repetir.';
    const zoneHint = l.isScript ? 'Toca las letras de abajo...' : 'Toca los bloques de abajo para armar la oración...';

    const renderTileLabel = (t) => {
      const rom = romajiMap[t] || '';
      const mastered = (state.blockMastery[t] || 0) >= 3;
      return `<span class="jp" style="display:block;">${renderRuby(t)}</span>${rom && !mastered ? `<span class="romaji" style="display:block;font-size:0.72rem;color:var(--muted);">${rom}</span>` : ''}`;
    };

    document.getElementById('lessonWorkspace').innerHTML = `
      <span class="tag tag-teal">${s1}</span>
      <h2 style="margin:6px 0;">${l.title}</h2>
      <p style="margin-bottom:14px;">${isES ? l.ruleES : l.ruleEN}</p>

      <span class="tag tag-amber">${s2}</span>
      <div class="anatomy-row">
        ${l.chunks.map((c, idx) => `
          <div class="chunk ${c.role}" onclick="inspectChunk('${l.id}', ${idx})">
            <span class="jp jp-main">${renderRuby(c.jp)}</span>
            <span class="romaji">${c.romaji}</span>
          </div>
        `).join('')}
      </div>
      <div id="chunkDetail" class="card-alt" style="font-size:0.88rem; margin-bottom:16px; color:var(--muted);">${tapHint}</div>

      <span class="tag tag-green">${s3}</span>
      <p style="font-weight:700; margin-top:6px;">${isES ? l.puzzlePromptES : l.puzzlePromptEN}</p>

      <div class="drop-zone" id="puzzleZone">
        ${puzzleSelected.length === 0 ? `<span style="color:var(--muted); font-size:0.86rem;">${zoneHint}</span>` :
          puzzleSelected.map((t, i) => `<button class="tile" onclick="removeTile(${i})">${renderTileLabel(t)}</button>`).join('')}
      </div>

      <div style="display:flex; flex-wrap:wrap; gap:8px; margin-bottom:12px;">
        ${allTiles.map((t) => `<button class="tile" onclick="addTile('${t}')">${renderTileLabel(t)}</button>`).join('')}
      </div>

      <div style="display:flex; gap:8px; flex-wrap:wrap;">
        <button class="btn btn-green" onclick="checkPuzzle('${l.id}')">Comprobar Orden</button>
        <button class="btn btn-outline" onclick="puzzleSelected=[]; renderLessonWorkspace();">Limpiar</button>
        <button class="btn btn-primary" onclick="speakJP('${l.puzzleAnswer.join('')}')">🔊 Escuchar Frase</button>
      </div>
      <div id="puzzleFeedback" style="margin-top:10px; font-weight:700;"></div>
    `;
  };

  window.checkPuzzle = function (lessonId) {
    const l = lessons.find((x) => x.id === lessonId);
    const ok = JSON.stringify(puzzleSelected) === JSON.stringify(l.puzzleAnswer);
    const fb = document.getElementById('puzzleFeedback');
    if (ok) {
      fb.style.color = 'var(--green)';
      fb.textContent = '✅ ¡Correcto! Dominaste esta lección.';
      speakJP(l.puzzleAnswer.join(''));
      l.puzzleAnswer.forEach((t) => { state.blockMastery[t] = (state.blockMastery[t] || 0) + 1; });
      if (!state.completedLessons.includes(lessonId)) state.completedLessons.push(lessonId);
      saveLocal(true);
      refreshAll();
    } else {
      fb.style.color = 'var(--coral)';
      fb.textContent = `❌ Casi. Respuesta esperada: ${l.puzzleAnswer.join(' ')}`;
    }
  };

  /* =========================================================
     FIX 3: GATE TAB 3 (STROKE PRACTICE & CLINIC)
  ========================================================= */
  let gatedDrawPool = [
    { char: 'あ', reqLesson: 'u1', romaji: 'a', hint: '3 trazos: horizontal, curva vertical, lazo final.' },
    { char: 'い', reqLesson: 'u1', romaji: 'i', hint: '2 trazos: izquierdo más largo con gancho, derecho corto.' },
    { char: 'う', reqLesson: 'u1', romaji: 'u', hint: '2 trazos: tilde arriba + curva derecha.' },
    { char: 'え', reqLesson: 'u1', romaji: 'e', hint: '2 trazos: tilde arriba + trazo en Z.' },
    { char: 'お', reqLesson: 'u1', romaji: 'o', hint: '3 trazos: horizontal, lazo vertical, punto derecho.' },
    { char: 'ら', reqLesson: 'u2', romaji: 'ra', hint: '2 trazos: tilde arriba + curva como un 5.' },
    { char: 'シ', reqLesson: 'k1', romaji: 'shi', hint: '3 trazos: dos gotas horizontales + trazo que SUBE.' },
    { char: 'ツ', reqLesson: 'k2', romaji: 'tsu', hint: '3 trazos: dos gotas verticales + trazo que BAJA.' }
  ];

  function gateTab3Clinic() {
    const tabW = document.getElementById('tab-writing');
    if (!tabW) return;
    tabW.querySelectorAll('.card').forEach((card) => {
      const txt = card.textContent || '';
      if (txt.includes('シ') && txt.includes('ツ') && !card.querySelector('#drawCanvas')) {
        if (!hasDone('k3')) {
          card.dataset.origHtml = card.dataset.origHtml || card.innerHTML;
          card.innerHTML = `<span class="tag tag-amber">Clínica Katakana (Bloqueada)</span><p style="margin-top:8px;">🔒 Completa <strong>K3. Katakana</strong> en la Pestaña 1 para desbloquear la clínica シ/ツ/ソ/ン.</p>`;
        } else if (card.dataset.origHtml) {
          card.innerHTML = card.dataset.origHtml;
        }
      }
      if (txt.includes('箸') || txt.includes('Pitch') || txt.includes('Acento')) {
        if (!hasDone('kj2')) {
          card.dataset.origHtml = card.dataset.origHtml || card.innerHTML;
          card.innerHTML = `<span class="tag tag-amber">Clínica de Acento (Bloqueada)</span><p style="margin-top:8px;">🔒 Completa <strong>KJ2. Kanji Mes 1</strong> en la Pestaña 1 para desbloquear la clínica de acento tonal.</p>`;
        } else if (card.dataset.origHtml) {
          card.innerHTML = card.dataset.origHtml;
        }
      }
    });
  }

  window.renderCharButtons = function () {
    const unlocked = gatedDrawPool.filter((c) => hasDone(c.reqLesson));
    const el = document.getElementById('charButtons');
    if (!el) return;
    if (!unlocked.length) {
      el.innerHTML = `<div class="card-alt" style="width:100%;font-size:0.86rem;">🔒 Completa la <strong>Lección 1 (Vocales Puras)</strong> para desbloquear tus primeros trazos.</div>`;
      const g = document.getElementById('ghostChar'); if (g) g.textContent = '🔒';
      const h = document.getElementById('drawHint'); if (h) h.textContent = 'Los trazos se desbloquean al completar cada lección.';
      gateTab3Clinic();
      return;
    }
    if (!unlocked.some((u) => u.char === currentDrawChar?.char)) currentDrawChar = unlocked[0];
    el.innerHTML = unlocked.map((c) => `
      <button class="pill-btn jp ${c.char === currentDrawChar.char ? 'active' : ''}" onclick="selectGatedChar('${c.char}')">
        ${state.practicedChars.includes(c.char) ? '✓ ' : ''}${c.char}
      </button>
    `).join('');
    document.getElementById('ghostChar').textContent = currentDrawChar.char;
    document.getElementById('drawHint').textContent = `${currentDrawChar.char} (${currentDrawChar.romaji}): ${currentDrawChar.hint}`;
    gateTab3Clinic();
  };

  window.selectGatedChar = function (ch) {
    currentDrawChar = gatedDrawPool.find((c) => c.char === ch) || gatedDrawPool[0];
    if (typeof clearCanvas === 'function') clearCanvas();
    renderCharButtons();
  };

  /* =========================================================
     FIX 2 & 6: GATED SRS, WORKING "SIGUIENTE →" SHADOWING & 5s CHALLENGE
  ========================================================= */
  window.updateSrsBadges = function () {
    const unlockedCount = state.srs.filter((c) => hasDone(c.reqLesson)).length;
    const dTab = document.getElementById('desktopSrsTab');
    const mTab = document.getElementById('mobileSrsTab');
    if (dTab) dTab.textContent = `4. Repaso SRS & Voz (${unlockedCount})`;
    if (mTab) mTab.innerHTML = `<span class="ico">🔁</span>SRS (${unlockedCount})`;
  };

  window.getCourseProgress = function () {
    const totalLessons = lessons.length || 1;
    const doneLessons = state.completedLessons.filter((id) => lessons.some((l) => l.id === id)).length;
    const unlockedSrs = state.srs.filter((c) => hasDone(c.reqLesson));
    const masteredSrs = unlockedSrs.filter((c) => (c.interval || 1) >= 3).length;
    const pct = Math.round((doneLessons / totalLessons) * 70 + (unlockedSrs.length ? (masteredSrs / unlockedSrs.length) * 30 : 0));
    return { pct, doneLessons, totalLessons, masteredSrs, totalSrs: unlockedSrs.length, srsPct: unlockedSrs.length ? Math.round((masteredSrs / unlockedSrs.length) * 100) : 0 };
  };

  const origRenderRoadmap = window.renderRoadmapStats;
  window.renderRoadmapStats = function () {
    if (typeof origRenderRoadmap === 'function') origRenderRoadmap();
    const hours = state.totalMinutes / 60;
    const p = window.getCourseProgress();
    const lbl = document.getElementById('loggedHoursLabel');
    if (lbl) lbl.textContent = `${hours.toFixed(1)} h (${state.totalMinutes} min) • Meta N5: 250–350 h`;
    const badge = document.getElementById('overallProgressBadge');
    if (badge) badge.textContent = `Progreso general: ${p.pct}% (${p.doneLessons}/${p.totalLessons} lecciones • ${p.masteredSrs}/${p.totalSrs} SRS)`;
    const bar = document.getElementById('hoursProgressBar');
    if (bar) bar.style.width = `${p.pct}%`;
    window.updateSrsBadges();
    renderTab4LowerSections();
  };

  window.renderSRS = function () {
    const now = Date.now();
    const unlocked = state.srs.filter((c) => hasDone(c.reqLesson));
    const due = unlocked.filter((c) => (c.nextDue || 0) <= now);
    const el = document.getElementById('srsContainer');
    if (el) {
      if (!unlocked.length) {
        el.innerHTML = `<div class="card-alt">🔒 Completa tus primeras lecciones en la Pestaña 1 para desbloquear tarjetas SRS (solo repasas lo ya enseñado).</div>`;
      } else if (!due.length) {
        el.innerHTML = `<div class="card-alt">🎉 ¡Todo al día! Tienes ${unlocked.length} tarjetas desbloqueadas.</div>`;
      } else {
        const card = due[0];
        el.innerHTML = `<div class="card-alt" style="text-align:center;">
          <small style="color:var(--muted);">Pendientes hoy: ${due.length} • Desbloqueadas: ${unlocked.length} • Intervalo: ${card.interval}d</small>
          <div style="font-size:1.1rem; font-weight:700; margin:12px 0;">"${card.es}"</div>
          ${srsRevealed ? `
            <div class="jp" style="font-size:1.35rem; font-weight:700; color:var(--teal);">${card.jp}</div>
            <div class="romaji" style="color:var(--muted); margin-bottom:12px;">${card.romaji}</div>
            <div style="display:flex; justify-content:center; gap:8px; flex-wrap:wrap;">
              <button class="btn btn-coral" onclick="rateSRS('${card.id}', 1)">Otra vez (1d)</button>
              <button class="btn btn-amber" onclick="rateSRS('${card.id}', 3)">Bien (3d)</button>
              <button class="btn btn-green" onclick="rateSRS('${card.id}', 7)">Fácil (7d)</button>
            </div>
          ` : `<button class="btn btn-primary" onclick="srsRevealed=true; speakJP('${card.jp}'); renderSRS();">Mostrar Respuesta + Audio</button>`}
        </div>`;
      }
    }
    window.updateSrsBadges();
    renderTab4LowerSections();
  };

  const gatedShadowing = [
    { reqLesson: 'u1', jp: 'あい', romaji: 'ai', es: 'Amor' },
    { reqLesson: 'u1', jp: 'いえ', romaji: 'ie', es: 'Casa' },
    { reqLesson: 'u1', jp: 'うえ', romaji: 'ue', es: 'Arriba' },
    { reqLesson: 'u1', jp: 'あお', romaji: 'ao', es: 'Azul' },
    { reqLesson: 'm1_g1', jp: 'わたし は がくせい です。', romaji: 'Watashi wa gakusei desu.', es: 'Yo soy estudiante.' },
    { reqLesson: 'u4', jp: 'わたし は タコス を たべます。', romaji: 'Watashi wa takosu o tabemasu.', es: 'Yo como tacos.' },
    { reqLesson: 'u7', jp: 'わたし は コーヒー を ふたつ ください。', romaji: 'Watashi wa kōhī o futatsu kudasai.', es: 'Dos cafés, por favor.' }
  ];
  window._shadowIdx = 0;
  window.nextShadowingLine = function () {
    window._shadowIdx++;
    renderTab4LowerSections();
  };

  // Fix 6: Working 5-second challenge Next button
  const gatedChallenges = [
    { reqLesson: 'u1', es: 'Amor', jp: 'あい', romaji: 'ai' },
    { reqLesson: 'u1', es: 'Casa', jp: 'いえ', romaji: 'ie' },
    { reqLesson: 'm1_g1', es: 'Yo soy estudiante.', jp: 'わたし は がくせい です。', romaji: 'Watashi wa gakusei desu.' },
    { reqLesson: 'u4', es: 'Yo como tacos.', jp: 'わたし は タコス を たべます。', romaji: 'Watashi wa takosu o tabemasu.' },
    { reqLesson: 'u7', es: 'Dos cafés, por favor.', jp: 'わたし は コーヒー を ふたつ ください。', romaji: 'Watashi wa kōhī o futatsu kudasai.' }
  ];
  window._challengeIdx = 0;
  window.nextChallenge = function () {
    const avail = gatedChallenges.filter((c) => hasDone(c.reqLesson));
    if (!avail.length) return;
    window._challengeIdx = (window._challengeIdx + 1) % avail.length;
    const item = avail[window._challengeIdx];
    const pEl = document.getElementById('challengePrompt');
    const aEl = document.getElementById('challengeAnswer');
    if (pEl) pEl.textContent = `"${item.es}"`;
    if (aEl) aEl.innerHTML = `<span class="jp">${item.jp}</span> <span class="romaji">(${item.romaji})</span>`;
  };

  window.renderTab4LowerSections = function () {
    const tabSrs = document.getElementById('tab-srs');
    if (!tabSrs) return;
    let wrap = document.getElementById('tab4LowerStudio');
    if (!wrap) { wrap = document.createElement('div'); wrap.id = 'tab4LowerStudio'; tabSrs.appendChild(wrap); }
    const p = window.getCourseProgress();
    const availShadow = gatedShadowing.filter((s) => hasDone(s.reqLesson));
    const s = availShadow.length ? availShadow[window._shadowIdx % availShadow.length] : null;

    wrap.innerHTML = `
      <div class="card">
        <span class="tag tag-teal">Estadísticas SRS</span>
        <div style="font-size:0.9rem; margin-top:4px;">
          <strong>${p.masteredSrs}</strong> dominadas de <strong>${p.totalSrs}</strong> desbloqueadas • Progreso general: <strong>${p.pct}%</strong>
        </div>
        <div class="progress-track" style="margin-top:8px;"><div class="progress-fill" style="width:${p.srsPct}%;"></div></div>
      </div>
      <div class="grid-2">
        <div class="card">
          <span class="tag tag-teal">Shadowing • Escucha y Repite</span>
          <h3 style="margin:6px 0 8px;">Escucha y Repite</h3>
          ${s ? `
            <div class="card-alt"><div class="jp" style="font-size:1.2rem;font-weight:700;">${s.jp}</div><div class="romaji" style="font-size:0.84rem;color:var(--muted);">${s.romaji}</div><div style="font-size:0.88rem;margin-top:4px;">${s.es}</div></div>
            <div style="display:flex;gap:8px;margin-top:10px;"><button class="btn btn-primary" onclick="speakJP('${s.jp}', 0.8)">🔊 Escuchar</button><button class="btn btn-outline" onclick="nextShadowingLine()">Siguiente →</button></div>
          ` : `<div class="card-alt">🔒 Completa la Lección 1 para desbloquear tu primera frase de Shadowing.</div>`}
        </div>
        <div class="card">
          <span class="tag tag-amber">Prueba de Voz • Tu turno</span>
          <h3 style="margin:6px 0 8px;">Tu turno</h3>
          <div class="card-alt" id="voiceTestStatus" style="font-size:0.88rem;margin-bottom:10px;">
            ${s ? `Listo para practicar: <strong class="jp">${s.jp}</strong>` : '🔒 Completa la Lección 1 para desbloquear.'}
          </div>
          ${s ? `<button class="btn btn-primary" onclick="speakJP('${s.jp}', 0.85)">🔊 Escuchar Modelo</button>` : ''}
        </div>
      </div>`;
  };

  /* =========================================================
     FIX 7: REMOVE MISLEADING "INPUT COMPRENSIBLE I+1" TAG ON TAB 2
  ========================================================= */
  const tabReading = document.getElementById('tab-reading');
  if (tabReading) {
    tabReading.querySelectorAll('.tag').forEach((t) => {
      if (t.textContent.toUpperCase().includes('INPUT COMPRENSIBLE')) {
        t.textContent = 'LECTURA Y ESCUCHA PROGRESIVA (2 HISTORIAS)';
      }
    });
  }

  const origSwitchTab = window.switchTab;
  window.switchTab = function (tabId) {
    if (typeof origSwitchTab === 'function') origSwitchTab(tabId);
    if (tabId === 'srs') renderTab4LowerSections();
    if (tabId === 'reading' && typeof renderStory === 'function') renderStory();
    if (tabId === 'writing') renderCharButtons();
  };

  // Initial synchronous paint with new 27-unit course
  if (typeof refreshAll === 'function') refreshAll();

  /* =========================================================
     ASYNC LOAD OF /data/mes1.json (STORIES, KANJI & WEEKLY VOCAB)
  ========================================================= */
  fetch('/data/mes1.json?v=20261125')
    .then((r) => (r.ok ? r.json() : null))
    .then((mes1) => {
      if (!mes1) return;

      // Add Kanji to gated stroke pool
      (mes1.kanji || []).forEach((k) => {
        const req = ['一','二','三','百'].includes(k.char) ? 'kj1' : 'kj2';
        if (!gatedDrawPool.some((d) => d.char === k.char)) {
          gatedDrawPool.push({
            char: k.char, reqLesson: req, romaji: `${k.romaji} • ${k.es}`,
            hint: `On: ${k.on} | Kun: ${k.kun} — Ej: ${k.words.join(' / ')} — ${k.hint}`
          });
        }
      });

      // Stories (Tab 2)
      stories.length = 0;
      (mes1.stories || []).forEach((s) => stories.push(s));
      if (stories.length) activeStoryId = stories[0].id;

      window.renderStory = function () {
        const sel = document.getElementById('storySelector');
        const cont = document.getElementById('storyContainer');
        if (!sel || !cont) return;
        sel.innerHTML = stories.map((s) => `
          <button class="pill-btn ${s.id === activeStoryId ? 'active' : ''}" onclick="activeStoryId='${s.id}'; renderStory();">
            ${hasDone(s.reqLesson) ? '' : '🔒 '}${s.title}
          </button>`).join('');
        const st = stories.find((s) => s.id === activeStoryId) || stories[0];
        if (!st) return;
        if (!hasDone(st.reqLesson)) {
          const reqL = lessons.find((l) => l.id === st.reqLesson);
          cont.innerHTML = `<div class="card-alt">🔒 Completa primero <strong>${reqL ? reqL.title : st.reqLesson}</strong> en la Pestaña 1 para desbloquear esta historia.</div>`;
          return;
        }
        cont.innerHTML = `<div style="font-size:0.82rem;color:var(--teal);font-weight:700;margin-bottom:8px;">${st.level}</div>` +
          st.lines.map((line) => `
            <div class="card-alt" style="margin-bottom:10px;display:flex;justify-content:space-between;align-items:flex-start;gap:10px;">
              <div class="blind-text ${blindMode ? 'hidden-text' : ''}" style="flex:1;" onclick="this.classList.remove('hidden-text')">
                <div class="jp" style="font-size:1.1rem;font-weight:700;">${line.jp}</div>
                <div class="romaji" style="font-size:0.84rem;color:var(--muted);">${line.romaji}</div>
                <div style="font-size:0.88rem;margin-top:4px;">${state.lang === 'es' ? line.es : line.en}</div>
              </div>
              <button class="pill-btn" onclick="speakJP('${line.jp}')">🔊</button>
            </div>`).join('');
      };

      // Gate Mes 1 Vocab into SRS
      const weekReqs = ['m1_g2', 'm1_g3', 'u4', 'm1_g8'];
      Object.entries(mes1.vocab || {}).forEach(([weekLabel, words], idx) => {
        const reqLesson = weekReqs[idx] || 'm1_g8';
        words.forEach(([jp, romaji, es, example]) => {
          if (!state.srs.some((c) => c.jp === jp)) {
            state.srs.push({ id: 'm1_' + jp, jp, romaji, es: `${es} — Ej: ${example}`, interval: 1, nextDue: 0, reqLesson });
          }
        });
      });
      if (typeof saveLocal === 'function') saveLocal(false);

      // FIX 8: Restore Weekly Vocabulary Browser in Tab 1
      const tabRoadmap = document.getElementById('tab-roadmap');
      if (tabRoadmap && !document.getElementById('mes1VocabCard') && mes1.vocab) {
        const weeks = Object.keys(mes1.vocab);
        const card = document.createElement('div');
        card.id = 'mes1VocabCard';
        card.className = 'card';
        card.innerHTML = `
          <div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:8px;margin-bottom:10px;">
            <div>
              <span class="tag tag-amber">Mes 1 • Vocabulario por Semana (Solo Gramática Enseñada)</span>
              <h3 style="margin-top:4px;">Vocabulario por Semana</h3>
            </div>
            <select id="vocabWeekSelect">
              ${weeks.map((w, i) => `<option value="${i}">${w} (${mes1.vocab[w].length})</option>`).join('')}
            </select>
          </div>
          <div id="vocabWeekGrid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:8px;"></div>
        `;
        tabRoadmap.appendChild(card);

        const renderVocabWeek = (idx) => {
          const list = mes1.vocab[weeks[idx]] || [];
          document.getElementById('vocabWeekGrid').innerHTML = list.map(([jp, romaji, es, ex]) => `
            <div class="card-alt" style="padding:10px;">
              <div style="display:flex;justify-content:space-between;align-items:center;gap:6px;">
                <strong class="jp" style="font-size:1.05rem;">${jp}</strong>
                <button class="pill-btn" onclick="speakJP('${jp}')">🔊</button>
              </div>
              <div class="romaji" style="font-size:0.78rem;color:var(--muted);">${romaji}</div>
              <div style="font-weight:700;font-size:0.86rem;margin-top:2px;">${es}</div>
              <div class="jp" style="font-size:0.78rem;color:var(--muted);margin-top:4px;cursor:pointer;" onclick="speakJP('${ex}')">🔊 ${ex}</div>
            </div>`).join('');
        };
        document.getElementById('vocabWeekSelect').addEventListener('change', (e) => renderVocabWeek(parseInt(e.target.value, 10)));
        renderVocabWeek(0);
      }

      if (typeof refreshAll === 'function') refreshAll();
    })
    .catch(() => {});
/* =========================================================
     LOAD MONTH 2 (/data/mes2.json) — MODULAR EXPANSION
  ========================================================= */
  fetch('/data/mes2.json?v=20261126')
    .then((r) => (r.ok ? r.json() : null))
    .then((mes2) => {
      if (!mes2) return;

      // 1. Append Month 2 grammar & single-kanji units + register romaji/furigana
      (mes2.grammar || []).forEach((g) => {
        if (!lessons.some((l) => l.id === g.id)) {
          lessons.push(g);
          (g.chunks || []).forEach((c) => {
            romajiMap[c.jp] = c.romaji;
            if (c.furigana) furiganaMap[c.jp] = c.furigana;
          });
        }
      });

      // 2. Append Month 2 gated kanji to Tab 3 stroke practice
      (mes2.kanji || []).forEach((k) => {
        if (!gatedDrawPool.some((d) => d.char === k.char)) {
          gatedDrawPool.push({
            char: k.char,
            reqLesson: k.reqLesson,
            romaji: k.romaji,
            hint: `On: ${k.on} | Kun: ${k.kun} — Ej: ${k.words.join(' / ')} — ${k.hint}`
          });
        }
      });

      // 3. Append Month 2 gated stories & update Tab 2 header count to 4
      (mes2.stories || []).forEach((st) => {
        if (!stories.some((s) => s.id === st.id)) stories.push(st);
      });
      const tabR = document.getElementById('tab-reading');
      if (tabR) {
        tabR.querySelectorAll('.tag').forEach((t) => {
          if (t.textContent.includes('HISTORIAS')) {
            t.textContent = `LECTURA Y ESCUCHA PROGRESIVA (${stories.length} HISTORIAS)`;
          }
        });
      }

      // 4. Gate Month 2 Weeks 5–8 vocab into SRS & merge into Tab 1 Vocab Browser
      const m2WeekReqs = ['m2_g3', 'm2_g6', 'm2_g9', 'm2_g10'];
      Object.entries(mes2.vocab || {}).forEach(([weekLabel, words], idx) => {
        const reqLesson = m2WeekReqs[idx] || 'm2_g10';
        words.forEach(([jp, romaji, es, example]) => {
          if (!state.srs.some((c) => c.jp === jp)) {
            state.srs.push({ id: 'm2_' + jp, jp, romaji, es: `${es} — Ej: ${example}`, interval: 1, nextDue: 0, reqLesson });
          }
        });
      });

      if (mes2.vocab) {
        const sel = document.getElementById('vocabWeekSelect');
        if (sel) {
          Object.entries(mes2.vocab).forEach(([weekLabel, words]) => {
            if (!fallbackVocab[weekLabel]) {
              fallbackVocab[weekLabel] = words;
              const opt = document.createElement('option');
              opt.value = Object.keys(fallbackVocab).length - 1;
              opt.textContent = `${weekLabel} (${words.length})`;
              sel.appendChild(opt);
            }
          });
        }
      }

      // 5. Mark Month 2 as ACTIVE in the 6-Month Plan
      if (sixMonthOutline[1]) {
        sixMonthOutline[1].label = 'Mes 2 • Semanas 5–8 (ACTIVO)';
        sixMonthOutline[1].detail = 'Preguntas • 10 verbos • Pasado y Negación • Hora/Días • 10 Kanji • 2 historias i+1';
      }

      if (typeof saveLocal === 'function') saveLocal(false);
      if (typeof refreshAll === 'function') refreshAll();
    })
    .catch(() => {});
})();