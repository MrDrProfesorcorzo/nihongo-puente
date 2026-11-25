(function initPedagogicalEngine() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach((r) => r.unregister());
    }).catch(() => {});
  }

  if (!state.blockMastery) state.blockMastery = {};
  const hasDone = (reqId) => !reqId || state.completedLessons.includes(reqId);

  /* =========================================================
     AUDIO LIVE-REGION CLEAN ON LOAD + KANA-ONLY TTS
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
  clearAudioIndicator();

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
    let cleanText = String(text).trim();
    if (/^ai(\s+ai)?$/i.test(cleanText)) cleanText = 'あい';
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
     MONTH 1 CURRICULUM (33 UNITS: KANA + GRAMMAR + KJ1–KJ8)
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
        ['ら','ra','r suave + a.'],['り','ri','r suave + i.'],['る','ru','r suave + u.'],['れ','re','r suave + e.'],['ろ','ro','r suave + o.']
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
      ruleEN: 'T-row (chi, tsu) and full dakuten D-row.',
      chunks: mkKana([
        ['た','ta','t+a'],['ち','chi','ch+i'],['つ','tsu','ts+u'],['て','te','t+e'],['と','to','t+o'],
        ['だ','da','た+゛'],['ぢ','ji','ち+゛'],['づ','zu','つ+゛'],['で','de','て+゛'],['ど','do','と+゛']
      ]),
      puzzlePromptES: 'Escribe "desu" (です = es/soy):',
      puzzlePromptEN: 'Spell "desu":',
      puzzleAnswer: ['で','す'], puzzleDistractors: ['て','た','と']
    },
    {
      id: 'h6', isScript: true, title: 'H6. Filas N y H/B/P (なにぬねの・はばぱ)', tag: 'Hiragana 6/7',
      stage1Label: 'Etapa 1 • Filas N, H, B y P (Completo)', stage2Label: 'Etapa 2 • Escucha y Repite', stage3Label: 'Etapa 3 • Escribe una Palabra',
      ruleES: 'Fila N (na–no) y Fila H (ha–ho). Comillas (゛) da B completa (ba–bo) y circulito (゜) da P completa (pa–po).',
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
      ruleES: '¡Últimas letras de Hiragana! Filas M, Y, W y ん (n). Completaste los 46 hiragana básicos y los 25 dakuten/handakuten.',
      ruleEN: 'Final Hiragana rows: M, Y, W, and N.',
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
      ruleES: 'Domina las filas T, N y H en Katakana. Ya puedes leer "タコス" (tacos) y "コーヒー" (café).',
      ruleEN: 'Katakana T, N, and H rows.',
      chunks: mkKana([
        ['タ','ta','ta'],['チ','chi','chi'],['ツ','tsu','tsu (mira abajo)'],['テ','te','te'],['ト','to','to'],
        ['ナ','na','na'],['ニ','ni','ni'],['ヌ','nu','nu'],['ネ','ne','ne'],['ノ','no','no'],
        ['ハ','ha','ha'],['ヒ','hi','hi'],['フ','fu','fu'],['ヘ','he','he'],['ホ','ho','ho'],['フェ','fe','フ+ェ']
      ], 'object'),
      puzzlePromptES: 'Escribe "takosu" (タコス = tacos):',
      puzzlePromptEN: 'Spell "takosu" (tacos):',
      puzzleAnswer: ['タ','コ','ス'], puzzleDistractors: ['テ','ト','ホ']
    },
    {
      id: 'k3', isScript: true, title: 'K3. Katakana: M, Y, R, W, N (マ–ン)', tag: 'Katakana 3/4',
      stage1Label: 'Etapa 1 • 46 Katakana Básicos Completos', stage2Label: 'Etapa 2 • Escucha y Repite (マ–ン)', stage3Label: 'Etapa 3 • Lee Katakana',
      ruleES: 'Últimas letras básicas de Katakana: M, Y, R, W (incluyendo ヲ) y ン (n).',
      ruleEN: 'Final basic Katakana rows including ヲ and ン.',
      chunks: mkKana([
        ['マ','ma','ma'],['ミ','mi','mi'],['ム','mu','mu'],['メ','me','me'],['モ','mo','mo'],
        ['ヤ','ya','ya'],['ユ','yu','yu'],['ヨ','yo','yo'],
        ['ラ','ra','ra'],['リ','ri','ri'],['ル','ru','ru'],['レ','re','re'],['ロ','ro','ro'],
        ['ワ','wa','wa'],['ヲ','o','wo/o'],['ン','n','n final'],['ー','—','alarga vocal']
      ], 'object'),
      puzzlePromptES: 'Escribe "ramen" (ラーメン):',
      puzzlePromptEN: 'Spell "rāmen":',
      puzzleAnswer: ['ラ','ー','メ','ン'], puzzleDistractors: ['マ','レ','ロ']
    },
    {
      id: 'k4', isScript: true, title: 'K4. Katakana Dakuten (ガ–ポ)', tag: 'Katakana 4/4',
      stage1Label: 'Etapa 1 • Cierre de Katakana (46 + 25 dakuten)', stage2Label: 'Etapa 2 • Escucha y Repite (G, Z, D, B, P)', stage3Label: 'Etapa 3 • Lee Katakana con Dakuten',
      ruleES: 'Comillas (゛) convierte K→G, S→Z, T→D, H→B; y circulito (゜) convierte H→P. ¡Dominas todo Katakana!',
      ruleEN: 'All 25 Katakana dakuten/handakuten.',
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
    {
      id: 'u3', title: '3. Fórmula Inglés → Katakana', tag: 'Katakana Aplicado',
      stage1Label: 'Etapa 1 • Fórmula de 4 Reglas (60s)', stage2Label: 'Etapa 2 • Escucha y Repite', stage3Label: 'Etapa 3 • Reconocimiento Katakana',
      ruleES: 'Usa estas 4 reglas para decodificar miles de palabras: 1) Sin consonantes solas (añade u/o), 2) L→R, 3) V→B, 4) Finales mudos ganan u/o.',
      ruleEN: '4 rules unlock Katakana loanwords.',
      chunks: [
        { jp: 'スマホ', romaji: 'sumaho', role: 'object', noteES: 'Smartphone → su-ma-ho', noteEN: 'Smartphone' },
        { jp: 'テレビ', romaji: 'terebi', role: 'object', noteES: 'Television → te-re-bi', noteEN: 'Television' },
        { jp: 'タコス', romaji: 'takosu', role: 'topic', noteES: 'Tacos → ta-ko-su', noteEN: 'Tacos' }
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
        { jp: 'です', romaji: 'desu', role: 'verb', noteES: 'Soy / Es', noteEN: 'Am / Is' }
      ],
      puzzlePromptES: 'Arma: "Yo soy estudiante"', puzzlePromptEN: 'Build: "I am a student"',
      puzzleAnswer: ['わたし','は','がくせい','です'], puzzleDistractors: ['せんせい']
    },
    {
      id: 'm1_g2', title: 'M1-2. Negación: じゃありません', tag: 'Gramática 2',
      stage1Label: 'Etapa 1 • Cómo Negar (60s)', stage2Label: 'Etapa 2 • Escucha y Repite (Kana por Kana)', stage3Label: 'Etapa 3 • Arma la Negación',
      ruleES: 'Para decir "no soy / no es", reemplaza です por じゃありません (ja + a + ri + ma + se + n).',
      ruleEN: 'Replace です with じゃありません.',
      chunks: [
        { jp: 'わたし', romaji: 'watashi', role: 'topic', noteES: 'Yo', noteEN: 'I' },
        { jp: 'は', romaji: 'wa', role: 'particle', noteES: 'Suena "wa"', noteEN: 'Topic' },
        { jp: 'せんせい', romaji: 'sensei', role: 'object', noteES: 'Profesor', noteEN: 'Teacher' },
        { jp: 'じゃ', romaji: 'ja', role: 'verb', noteES: 'ja', noteEN: 'ja' },
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
      ruleES: 'El verbo va SIEMPRE al final: "Yo [は] tacos [を] como". Trampas: は suena "wa", y を suena "o". Verbo: たべる → たべます.',
      ruleEN: 'Verb always goes last. は="wa", を="o". たべる → たべます.',
      chunks: [
        { jp: 'わたし', romaji: 'watashi', role: 'topic', noteES: 'Yo', noteEN: 'I' },
        { jp: 'は', romaji: 'wa', role: 'particle', noteES: 'Suena "wa"', noteEN: 'Topic' },
        { jp: 'タコス', romaji: 'takosu', role: 'object', noteES: 'Tacos', noteEN: 'Tacos' },
        { jp: 'を', romaji: 'o', role: 'particle', noteES: 'Suena "o"', noteEN: 'Object' },
        { jp: 'たべます', romaji: 'tabemasu', role: 'verb', noteES: 'De たべる → たべます', noteEN: 'Eat' }
      ],
      puzzlePromptES: 'Arma poniendo el verbo al final: "Yo como tacos"', puzzlePromptEN: 'Build: "I eat tacos"',
      puzzleAnswer: ['わたし','は','タコス','を','たべます'], puzzleDistractors: ['です','スマホ']
    },
    {
      id: 'u5', title: '5. Lugar Estático (に) vs Acción (で)', tag: 'Gramática 4',
      stage1Label: 'Etapa 1 • に vs で (60s)', stage2Label: 'Etapa 2 • Escucha y Repite', stage3Label: 'Etapa 3 • Arma la Oración',
      ruleES: 'Usa に para estar en un lugar, y で donde OCURRE una acción. Verbo: のむ → のみます.',
      ruleEN: 'Use に for static location and で for actions.',
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
    ...[
      ['kj1', 'KJ1. Kanji 1/8: 一 (uno)', '一', 'いち', 'ichi', 'Uno (いち / ひとつ). 1 trazo horizontal.', ['いち']],
      ['kj2', 'KJ2. Kanji 2/8: 二 (dos)', '二', 'に', 'ni', 'Dos (に / ふたつ). 2 trazos horizontales.', ['一']],
      ['kj3', 'KJ3. Kanji 3/8: 三 (tres)', '三', 'さん', 'san', 'Tres (さん / みっつ). 3 trazos horizontales.', ['一', '二']],
      ['kj4', 'KJ4. Kanji 4/8: 百 (cien)', '百', 'ひゃく', 'hyaku', 'Cien (ひゃく). Ej: 百円 = 100 yenes.', ['一', '三']],
      ['kj5', 'KJ5. Kanji 5/8: 円 (yen)', '円', 'えん', 'en', 'Yen (えん). Ej: 百円.', ['百', '二']],
      ['kj6', 'KJ6. Kanji 6/8: 本 (libro)', '本', 'ほん', 'hon', 'Libro / origen (ほん). Ej: わたしの本.', ['円', '一']],
      ['kj7', 'KJ7. Kanji 7/8: 日 (sol / día)', '日', 'に', 'ni / hi', 'Sol / día (に・ひ). Ej: 日本 = Japón.', ['本', '円']],
      ['kj8', 'KJ8. Kanji 8/8: 人 (persona)', '人', 'ひと', 'hito / jin', 'Persona (ひと・じん). Ej: メキシコ人.', ['日', '本']]
    ].map(([id, title, k, furi, rom, note, dist]) => ({
      id, isScript: true, title, tag: 'Kanji N5',
      stage1Label: 'Etapa 1 • Un Kanji a la Vez (60s)', stage2Label: 'Etapa 2 • Escucha y Repite (con Furigana)', stage3Label: 'Etapa 3 • Reconoce el Kanji',
      ruleES: `Ya conoces su lectura en hiragana (${furi}). El furigana arriba desaparecerá automáticamente tras dominarlo 3 veces.`,
      ruleEN: `You already know its kana reading (${furi}). Furigana fades after 3 correct answers.`,
      chunks: [{ jp: k, furigana: furi, romaji: rom, role: 'topic', noteES: note, noteEN: note }],
      puzzlePromptES: `Selecciona el kanji que se lee "${furi}":`,
      puzzlePromptEN: `Select the kanji read "${furi}":`,
      puzzleAnswer: [k], puzzleDistractors: dist
    }))
  ];

  lessons.length = 0;
  fullCurriculum.forEach((l) => lessons.push(l));
  if (!lessons.some((l) => l.id === activeLessonId)) activeLessonId = lessons[0].id;

  sixMonthOutline.length = 0;
  sixMonthOutline.push(
    { label: 'Mes 1 • Semanas 1–4 (ACTIVO)', title: 'Hiragana, Katakana, Bases N5 y 8 Kanji', detail: '46+25 Hiragana • 46+25 Katakana • 13 gramática • 8 Kanji • 2 historias i+1', minH: 0, maxH: 30 },
    { label: 'Mes 2 • Semanas 5–8 (Próximamente)', title: 'Verbos, Tiempo y Rutina (El Verbo Va Al Final)', detail: 'Próxima carga: verbos -masu, horas, rutina diaria y +10 kanji N5', minH: 30, maxH: 65 },
    { label: 'Mes 3 • Semanas 9–12 (Próximamente)', title: 'Adjetivos, Pasado y Forma -te', detail: 'Próxima carga: pasado, forma -te y nuevas historias i+1', minH: 65, maxH: 110 },
    { label: 'Mes 4 • Semanas 13–16 (Próximamente)', title: 'Peticiones, Permisos y Planes', detail: 'Próxima carga: permisos, planes y kanji N5', minH: 110, maxH: 165 },
    { label: 'Mes 5 • Semanas 17–20 (Próximamente)', title: 'Comparaciones y Opiniones', detail: 'Próxima carga: comparaciones, opiniones y lectura guiada', minH: 165, maxH: 225 },
    { label: 'Mes 6 • Semanas 21–24 (Próximamente)', title: 'Integración JLPT N5', detail: 'Próxima carga: repaso integral y simulacro N5', minH: 225, maxH: 9999 }
  );

  /* =========================================================
     IMMEDIATE SCRIPT SRS CARDS (UNLOCK FROM LESSON 1)
  ========================================================= */
  const baseScriptSrs = [
    { id: 's_a', reqLesson: 'u1', jp: 'あ', romaji: 'a', es: 'Vocal "a" (Hiragana)' },
    { id: 's_i', reqLesson: 'u1', jp: 'い', romaji: 'i', es: 'Vocal "i" (Hiragana)' },
    { id: 's_u', reqLesson: 'u1', jp: 'う', romaji: 'u', es: 'Vocal "u" (Hiragana)' },
    { id: 's_e', reqLesson: 'u1', jp: 'え', romaji: 'e', es: 'Vocal "e" (Hiragana)' },
    { id: 's_o', reqLesson: 'u1', jp: 'お', romaji: 'o', es: 'Vocal "o" (Hiragana)' },
    { id: 's_ai', reqLesson: 'u1', jp: 'あい', romaji: 'ai', es: 'Amor (palabra con vocales)' },
    { id: 's_ra', reqLesson: 'u2', jp: 'ら', romaji: 'ra', es: 'Sílaba "ra" (r suave)' },
    { id: 's_ro', reqLesson: 'u2', jp: 'ろ', romaji: 'ro', es: 'Sílaba "ro" (r suave)' },
    { id: 's_iro', reqLesson: 'u2', jp: 'いろ', romaji: 'iro', es: 'Color' },
    { id: 's_kore', reqLesson: 'h3', jp: 'これ', romaji: 'kore', es: 'Esto' },
    { id: 's_sushi', reqLesson: 'h4', jp: 'すし', romaji: 'sushi', es: 'Sushi' },
    { id: 's_desu', reqLesson: 'h5', jp: 'です', romaji: 'desu', es: 'Es / Soy (cortés)' },
    { id: 's_taberu', reqLesson: 'h6', jp: 'たべる', romaji: 'taberu', es: 'Comer (forma diccionario)' },
    { id: 's_watashi', reqLesson: 'h7', jp: 'わたし', romaji: 'watashi', es: 'Yo' },
    { id: 's_takosu', reqLesson: 'k2', jp: 'タコス', romaji: 'takosu', es: 'Tacos (Katakana)' },
    { id: 's_ramen', reqLesson: 'k3', jp: 'ラーメン', romaji: 'rāmen', es: 'Ramen (Katakana)' },
    { id: 's_terebi', reqLesson: 'k4', jp: 'テレビ', romaji: 'terebi', es: 'Televisión (Katakana)' }
  ];

  state.srs = (state.srs || []).filter((c) => c.reqLesson && c.jp !== 'カフェで本を読みます');
  baseScriptSrs.forEach((sc) => {
    if (!state.srs.some((c) => c.id === sc.id)) state.srs.push({ ...sc, interval: 1, nextDue: 0 });
  });
  if (typeof saveLocal === 'function') saveLocal(false);

  /* =========================================================
     SYNCHRONOUS 2 MONTH 1 STORIES
  ========================================================= */
  const mes1Stories = [
    {
      id: 'm1_st1', reqLesson: 'm1_g7', title: '🏫 Mes 1 • En clase (i+1)',
      level: 'Mes 1 • Nuevo: どうぞ (por favor / adelante)',
      lines: [
        { jp: 'こんにちは。わたし は カルロス です。', romaji: 'Konnichiwa. Watashi wa Karurosu desu.', es: 'Hola. Yo soy Carlos.', en: 'Hello. I am Carlos.' },
        { jp: 'わたし は メキシコじん です。がくせい です。', romaji: 'Watashi wa Mekishikojin desu. Gakusei desu.', es: 'Soy mexicano. Soy estudiante.', en: 'I am Mexican. I am a student.' },
        { jp: 'わたし は すし が すき です。ラーメン も すき です。', romaji: 'Watashi wa sushi ga suki desu. Rāmen mo suki desu.', es: 'Me gusta el sushi. También me gusta el ramen.', en: 'I like sushi. I like ramen too.' },
        { jp: 'これ は わたし の ほん です。どうぞ。', romaji: 'Kore wa watashi no hon desu. Dōzo.', es: 'Este es mi libro. Adelante (nueva: どうぞ = adelante).', en: 'This is my book. Here you go.' }
      ]
    },
    {
      id: 'm1_st2', reqLesson: 'm1_g8', title: '☕ Mes 1 • En el Café (i+1)',
      level: 'Mes 1 • Nuevo: いくら (¿cuánto cuesta?)',
      lines: [
        { jp: 'すみません、この コーヒー は いくら です か。', romaji: 'Sumimasen, kono kōhī wa ikura desu ka.', es: 'Disculpe, ¿cuánto cuesta este café? (nueva: いくら = cuánto).', en: 'How much is this coffee?' },
        { jp: 'それ は ひゃくえん です。', romaji: 'Sore wa hyakuen desu.', es: 'Ese cuesta 100 yenes.', en: 'That is 100 yen.' },
        { jp: 'わたし は コーヒー を ふたつ ください。', romaji: 'Watashi wa kōhī o futatsu kudasai.', es: 'Deme dos cafés por favor.', en: 'Two coffees please.' },
        { jp: 'カフェ に ともだち が います。カフェ で コーヒー を のみます。', romaji: 'Kafe ni tomodachi ga imasu. Kafe de kōhī o nomimasu.', es: 'Mi amigo está en el café. Tomo café en el café.', en: 'My friend is at the cafe. I drink coffee at the cafe.' }
      ]
    }
  ];

  stories.length = 0;
  mes1Stories.forEach((s) => stories.push(s));
  activeStoryId = stories[0].id;

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

  /* =========================================================
     WORKSPACE RENDERER (FURIGANA & ROMAJI FADING)
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
     GATED TAB 3 (STROKE PRACTICE & CLINIC)
  ========================================================= */
  const gatedDrawPool = [
    { char: 'あ', reqLesson: 'u1', romaji: 'a', hint: '3 trazos: horizontal, curva vertical, lazo final.' },
    { char: 'い', reqLesson: 'u1', romaji: 'i', hint: '2 trazos: izquierdo más largo con gancho, derecho corto.' },
    { char: 'う', reqLesson: 'u1', romaji: 'u', hint: '2 trazos: tilde arriba + curva derecha.' },
    { char: 'え', reqLesson: 'u1', romaji: 'e', hint: '2 trazos: tilde arriba + trazo en Z.' },
    { char: 'お', reqLesson: 'u1', romaji: 'o', hint: '3 trazos: horizontal, lazo vertical, punto derecho.' },
    { char: 'ら', reqLesson: 'u2', romaji: 'ra', hint: '2 trazos: tilde arriba + curva como un 5.' },
    { char: 'シ', reqLesson: 'k1', romaji: 'shi', hint: '3 trazos: dos gotas horizontales + trazo que SUBE.' },
    { char: 'ツ', reqLesson: 'k2', romaji: 'tsu', hint: '3 trazos: dos gotas verticales + trazo que BAJA.' },
    { char: '一', reqLesson: 'kj1', romaji: 'ichi • uno', hint: '1 trazo horizontal.' },
    { char: '二', reqLesson: 'kj2', romaji: 'ni • dos', hint: '2 trazos horizontales.' },
    { char: '三', reqLesson: 'kj3', romaji: 'san • tres', hint: '3 trazos horizontales.' },
    { char: '百', reqLesson: 'kj4', romaji: 'hyaku • cien', hint: '6 trazos.' },
    { char: '円', reqLesson: 'kj5', romaji: 'en • yen', hint: '4 trazos.' },
    { char: '本', reqLesson: 'kj6', romaji: 'hon • libro', hint: '5 trazos.' },
    { char: '日', reqLesson: 'kj7', romaji: 'nichi • sol/día', hint: '4 trazos.' },
    { char: '人', reqLesson: 'kj8', romaji: 'hito • persona', hint: '2 trazos.' }
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
        } else if (card.dataset.origHtml) card.innerHTML = card.dataset.origHtml;
      }
      if (txt.includes('箸') || txt.includes('Pitch') || txt.includes('Acento')) {
        if (!hasDone('kj8')) {
          card.dataset.origHtml = card.dataset.origHtml || card.innerHTML;
          card.innerHTML = `<span class="tag tag-amber">Clínica de Acento (Bloqueada)</span><p style="margin-top:8px;">🔒 Completa <strong>KJ8. Kanji</strong> en la Pestaña 1 para desbloquear la clínica de acento tonal.</p>`;
        } else if (card.dataset.origHtml) card.innerHTML = card.dataset.origHtml;
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
      gateTab3Clinic(); return;
    }
    if (!unlocked.some((u) => u.char === currentDrawChar?.char)) currentDrawChar = unlocked[0];
    el.innerHTML = unlocked.map((c) => `
      <button class="pill-btn jp ${c.char === currentDrawChar.char ? 'active' : ''}" onclick="selectGatedChar('${c.char}')">
        ${state.practicedChars.includes(c.char) ? '✓ ' : ''}${c.char}
      </button>`).join('');
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
     GATED SRS + TAB 4 SHADOWING
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
        el.innerHTML = `<div class="card-alt">🔒 Completa la Lección 1 en la Pestaña 1 para desbloquear tus primeras tarjetas SRS.</div>`;
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
    { reqLesson: 'u4', jp: 'わたし は タコス を たべます。', romaji: 'Watashi wa takosu o tabemasu.', es: 'Yo como tacos.' }
  ];
  window._shadowIdx = 0;
  window.nextShadowingLine = function () { window._shadowIdx++; renderTab4LowerSections(); };

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
          ` : `<div class="card-alt">🔒 Completa la Lección 1 para desbloquear Shadowing.</div>`}
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
     WEEKLY VOCABULARY BROWSER (BOTTOM OF TAB 1)
  ========================================================= */
  const allVocab = {
    'Semana 1 — Saludos y Personas': [
      ['わたし', 'watashi', 'yo', 'わたし は がくせい です。'],
      ['せんせい', 'sensei', 'profesor / maestro', 'たなかさん は せんせい です。'],
      ['がくせい', 'gakusei', 'estudiante', 'わたし は がくせい です。'],
      ['にほん', 'Nihon', 'Japón', 'わたし は にほん が すき です。'],
      ['メキシコ', 'Mekishiko', 'México', 'わたし は メキシコじん です。']
    ],
    'Semana 2 — Números y Objetos': [
      ['ひゃく', 'hyaku', 'cien', 'これ は ひゃくえん です。'],
      ['ほん', 'hon', 'libro', 'これ は わたし の ほん です。'],
      ['スマホ', 'sumaho', 'smartphone', 'これ は わたし の スマホ です。']
    ],
    'Semana 3 — Comida y Bebida': [
      ['コーヒー', 'kōhī', 'café', 'わたし は コーヒー を のみます。'],
      ['タコス', 'takosu', 'tacos', 'わたし は タコス を たべます。'],
      ['すし', 'sushi', 'sushi', 'わたし は すし が すき です。']
    ],
    'Semana 4 — Tiempo y Lugares': [
      ['あした', 'ashita', 'mañana', 'あした とうきょう に いきます。'],
      ['えき', 'eki', 'estación', 'あれ は えき です。'],
      ['こうえん', 'kōen', 'parque', 'こうえん に こども が います。']
    ]
  };

  function mountVocabBrowser() {
    const tabRoadmap = document.getElementById('tab-roadmap');
    if (!tabRoadmap) return;
    let card = document.getElementById('mes1VocabCard');
    if (!card) {
      card = document.createElement('div');
      card.id = 'mes1VocabCard';
      card.className = 'card';
      tabRoadmap.appendChild(card);
    }
    const weeks = Object.keys(allVocab);
    const prevIdx = parseInt(document.getElementById('vocabWeekSelect')?.value || '0', 10);
    card.innerHTML = `
      <div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:8px;margin-bottom:10px;">
        <div>
          <span class="tag tag-amber">Vocabulario por Semana (Solo Gramática Enseñada)</span>
          <h3 style="margin-top:4px;">Vocabulario por Semana</h3>
        </div>
        <select id="vocabWeekSelect">
          ${weeks.map((w, i) => `<option value="${i}" ${i === prevIdx ? 'selected' : ''}>${w} (${allVocab[w].length})</option>`).join('')}
        </select>
      </div>
      <div id="vocabWeekGrid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:8px;"></div>
    `;
    const renderWeek = (idx) => {
      const list = allVocab[weeks[idx]] || [];
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
    document.getElementById('vocabWeekSelect').addEventListener('change', (e) => renderWeek(parseInt(e.target.value, 10)));
    renderWeek(Math.min(prevIdx, weeks.length - 1));
  }

  mountVocabBrowser();

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
    if (tabId === 'reading') renderStory();
    if (tabId === 'writing') renderCharButtons();
  };

  if (typeof refreshAll === 'function') refreshAll();

  /* =========================================================
     ASYNC LOAD: /data/mes1.json
  ========================================================= */
  fetch('/data/mes1.json?v=20261127')
    .then((r) => (r.ok ? r.json() : null))
    .then((mes1) => {
      if (!mes1 || !mes1.vocab) return;
      Object.entries(mes1.vocab).forEach(([w, list]) => { allVocab[w] = list; });
      mountVocabBrowser();
      const weekReqs = ['m1_g1', 'm1_g3', 'u4', 'm1_g8'];
      Object.entries(mes1.vocab).forEach(([weekLabel, words], idx) => {
        const reqLesson = weekReqs[idx] || 'm1_g8';
        words.forEach(([jp, romaji, es, example]) => {
          if (!state.srs.some((c) => c.jp === jp)) {
            state.srs.push({ id: 'm1_' + jp, jp, romaji, es: `${es} — Ej: ${example}`, interval: 1, nextDue: 0, reqLesson });
          }
        });
      });
      if (typeof saveLocal === 'function') saveLocal(false);
      if (typeof refreshAll === 'function') refreshAll();
    })
    .catch((err) => console.error('[mes-loader] Error loading mes1.json:', err));

  /* =========================================================
     ASYNC LOAD: /data/mes2.json (DEFENSIVE KANJI + VISIBLE ERRORS)
  ========================================================= */
  fetch('/data/mes2.json?v=20261127')
    .then((r) => (r.ok ? r.json() : null))
    .then((mes2) => {
      if (!mes2) return;

      const registerUnit = (u) => {
        if (!u || !u.id) return;
        if (!lessons.some((l) => l.id === u.id)) lessons.push(u);
        (u.chunks || []).forEach((c) => {
          if (c.jp) romajiMap[c.jp] = c.romaji || '';
          if (c.jp && c.furigana) furiganaMap[c.jp] = c.furigana;
        });
      };

      // Step 1: Append Month 2 grammar AND any lesson-unit kanji records into lessons
      (mes2.grammar || []).forEach(registerUnit);
      (mes2.kanji || []).forEach((k) => {
        if (k && k.id && Array.isArray(k.chunks)) registerUnit(k);
      });

      // Step 2: Build Tab 3 draw-pool entries defensively from EITHER kanji shape
      (mes2.kanji || []).forEach((k) => {
        const ch = k.char || k.chunks?.[0]?.jp;
        if (!ch || gatedDrawPool.some((d) => d.char === ch)) return;
        const reqLesson = k.reqLesson || k.id || 'm2_kj1';
        const romaji = k.romaji || k.chunks?.[0]?.romaji || '';
        const wordsStr = Array.isArray(k.words) && k.words.length ? ` — Ej: ${k.words.join(' / ')}` : '';
        const readingsStr = (k.on || k.kun) ? `On: ${k.on || '—'} | Kun: ${k.kun || '—'}` : '';
        const baseHint = k.hint || k.chunks?.[0]?.noteES || k.ruleES || '';
        const hint = [readingsStr, wordsStr, baseHint].filter(Boolean).join(' ').trim();
        gatedDrawPool.push({ char: ch, reqLesson, romaji, hint });
      });

      // Step 3: Append Month 2 gated stories & update Tab 2 count to 4
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

      // Step 4: Gate Month 2 Weeks 5–8 vocab into SRS & merge into Tab 1 Vocab Browser
      const m2WeekReqs = ['m2_g3', 'm2_g6', 'm2_g9', 'm2_g10'];
      Object.entries(mes2.vocab || {}).forEach(([weekLabel, words], idx) => {
        allVocab[weekLabel] = words;
        const reqLesson = m2WeekReqs[idx] || 'm2_g10';
        words.forEach(([jp, romaji, es, example]) => {
          if (!state.srs.some((c) => c.jp === jp)) {
            state.srs.push({ id: 'm2_' + jp, jp, romaji, es: `${es} — Ej: ${example}`, interval: 1, nextDue: 0, reqLesson });
          }
        });
      });
      mountVocabBrowser();

      // Step 5: Mark Month 2 as ACTIVE in 6-Month Plan
      if (sixMonthOutline[1]) {
        sixMonthOutline[1].label = 'Mes 2 • Semanas 5–8 (ACTIVO)';
        sixMonthOutline[1].detail = 'Preguntas • 10 verbos • Pasado y Negación • Hora/Días • 10 Kanji • 2 historias i+1';
      }

      if (typeof saveLocal === 'function') saveLocal(false);
      if (typeof refreshAll === 'function') refreshAll();
    })
    .catch((err) => console.error('[mes-loader] Error loading mes2.json:', err));
/* =========================================================
     ETAPA 3 MULTI-EXERCISE MINI-QUEUE (MONTH 1 DRILLS)
  ========================================================= */
  const month1Drills = {
    u1: [
      { promptES: 'Escribe "ai" (amor):', answer: ['あ','い'], distractors: ['う','え','お'] },
      { promptES: 'Escribe "ie" (casa):', answer: ['い','え'], distractors: ['あ','う','お'] },
      { promptES: 'Escribe "ue" (arriba):', answer: ['う','え'], distractors: ['あ','い','お'] },
      { promptES: 'Escribe "ao" (azul):', answer: ['あ','お'], distractors: ['い','う','え'] },
      { promptES: 'Escribe "au" (encontrarse):', answer: ['あ','う'], distractors: ['い','え','お'] },
      { promptES: 'Escribe "oi" (oye / sobrino):', answer: ['お','い'], distractors: ['あ','う','え'] }
    ],
    u2: [
      { promptES: 'Escribe "iro" (color):', answer: ['い','ろ'], distractors: ['ら','る','あ'] },
      { promptES: 'Escribe "aru" (haber / existir):', answer: ['あ','る'], distractors: ['ら','れ','ろ'] },
      { promptES: 'Escribe "ura" (parte trasera):', answer: ['う','ら'], distractors: ['り','る','ろ'] },
      { audioOnly: true, promptES: 'Escucha y toca la sílaba correcta (sin romaji):', answer: ['る'], distractors: ['ら','り','れ','ろ'] }
    ],
    h3: [
      { promptES: 'Escribe "kore" (esto):', answer: ['こ','れ'], distractors: ['か','き','ろ'] },
      { promptES: 'Escribe "kao" (cara):', answer: ['か','お'], distractors: ['き','く','け'] },
      { promptES: 'Escribe "ike" (estanque):', answer: ['い','け'], distractors: ['か','く','こ'] },
      { audioOnly: true, promptES: 'Escucha y toca la sílaba correcta (sin romaji):', answer: ['ぎ'], distractors: ['が','ぐ','げ','ご'] }
    ],
    h4: [
      { promptES: 'Escribe "sushi" (すし):', answer: ['す','し'], distractors: ['さ','せ','そ'] },
      { promptES: 'Escribe "kasa" (paraguas):', answer: ['か','さ'], distractors: ['し','す','せ'] },
      { promptES: 'Escribe "kaze" (viento):', answer: ['か','ぜ'], distractors: ['ざ','じ','ず'] },
      { audioOnly: true, promptES: 'Escucha y toca la sílaba correcta (sin romaji):', answer: ['ぞ'], distractors: ['ざ','じ','ず','ぜ'] }
    ],
    h5: [
      { promptES: 'Escribe "desu" (es / soy):', answer: ['で','す'], distractors: ['て','た','と'] },
      { promptES: 'Escribe "chizu" (mapa):', answer: ['ち','ず'], distractors: ['た','つ','て'] },
      { promptES: 'Escribe "soto" (afuera):', answer: ['そ','と'], distractors: ['た','て','ど'] },
      { audioOnly: true, promptES: 'Escucha y toca la sílaba correcta (sin romaji):', answer: ['つ'], distractors: ['た','ち','て','と'] }
    ],
    h6: [
      { promptES: 'Escribe "taberu" (comer):', answer: ['た','べ','る'], distractors: ['は','に','の'] },
      { promptES: 'Escribe "hana" (flor):', answer: ['は','な'], distractors: ['ひ','ぬ','ね'] },
      { promptES: 'Escribe "neko" (gato):', answer: ['ね','こ'], distractors: ['な','ぬ','の'] },
      { audioOnly: true, promptES: 'Escucha y toca la sílaba correcta (sin romaji):', answer: ['ぴ'], distractors: ['ぱ','ぷ','ぺ','ぽ'] }
    ],
    h7: [
      { promptES: 'Escribe "watashi" (yo):', answer: ['わ','た','し'], distractors: ['ま','も','ん'] },
      { promptES: 'Escribe "yama" (montaña):', answer: ['や','ま'], distractors: ['ゆ','よ','み'] },
      { promptES: 'Escribe "hon" (libro):', answer: ['ほ','ん'], distractors: ['わ','を','も'] },
      { audioOnly: true, promptES: 'Escucha y toca la sílaba correcta (sin romaji):', answer: ['ん'], distractors: ['わ','を','ま','も'] }
    ],
    k1: [
      { promptES: 'Escribe "aisu" (helado / frío):', answer: ['ア','イ','ス'], distractors: ['カ','コ','シ'] },
      { promptES: 'Escribe "kokoa" (cocoa):', answer: ['コ','コ','ア'], distractors: ['カ','ク','ケ'] },
      { promptES: 'Escribe "kisu" (beso):', answer: ['キ','ス'], distractors: ['シ','セ','ソ'] },
      { audioOnly: true, promptES: 'Escucha y toca la sílaba correcta (sin romaji):', answer: ['シ'], distractors: ['サ','ス','セ','ソ'] }
    ],
    k2: [
      { promptES: 'Escribe "takosu" (tacos):', answer: ['タ','コ','ス'], distractors: ['テ','ト','ホ'] },
      { promptES: 'Escribe "kafe" (cafetería):', answer: ['カ','フェ'], distractors: ['ハ','ヒ','フ'] },
      { promptES: 'Escribe "kōhī" (café):', answer: ['コ','ー','ヒ','ー'], distractors: ['ハ','ヘ','ホ'] },
      { audioOnly: true, promptES: 'Escucha y toca la sílaba correcta (sin romaji):', answer: ['ツ'], distractors: ['タ','チ','テ','ト'] }
    ],
    k3: [
      { promptES: 'Escribe "rāmen" (ramen):', answer: ['ラ','ー','メ','ン'], distractors: ['マ','レ','ロ'] },
      { promptES: 'Escribe "kamera" (cámara):', answer: ['カ','メ','ラ'], distractors: ['マ','ミ','ム'] },
      { promptES: 'Escribe "memo" (nota):', answer: ['メ','モ'], distractors: ['マ','ミ','ム'] },
      { audioOnly: true, promptES: 'Escucha y toca la sílaba correcta (sin romaji):', answer: ['ン'], distractors: ['ワ','ヲ','ラ','ロ'] }
    ],
    k4: [
      { promptES: 'Escribe "terebi" (televisión):', answer: ['テ','レ','ビ'], distractors: ['ピ','ペ','デ'] },
      { promptES: 'Escribe "pan" (pan):', answer: ['パ','ン'], distractors: ['バ','ビ','ブ'] },
      { promptES: 'Escribe "basu" (autobús):', answer: ['バ','ス'], distractors: ['パ','ダ','ザ'] },
      { audioOnly: true, promptES: 'Escucha y toca la sílaba correcta (sin romaji):', answer: ['ポ'], distractors: ['パ','ピ','プ','ペ'] }
    ],
    u3: [
      { promptES: 'Selecciona en orden: "Tacos" + "Smartphone"', answer: ['タコス','スマホ'], distractors: ['テレビ'] },
      { promptES: 'Selecciona en orden: "Televisión" + "Tacos"', answer: ['テレビ','タコス'], distractors: ['スマホ'] },
      { promptES: 'Selecciona en orden: "Smartphone" + "Televisión"', answer: ['スマホ','テレビ'], distractors: ['タコス'] }
    ],
    m1_g1: [
      { promptES: 'Arma: "Yo soy estudiante"', answer: ['わたし','は','がくせい','です'], distractors: ['せんせい'] },
      { promptES: 'Arma: "Esto es café"', answer: ['これ','は','コーヒー','です'], distractors: ['がくせい'] },
      { promptES: 'Arma: "Esto es ramen"', answer: ['これ','は','ラーメン','です'], distractors: ['わたし'] }
    ],
    m1_g2: [
      { promptES: 'Arma: "Yo no soy profesor" (deletreando じゃありません):', answer: ['わたし','は','せんせい','じゃ','あ','り','ま','せ','ん'], distractors: ['です'] },
      { promptES: 'Arma: "Yo no soy estudiante":', answer: ['わたし','は','がくせい','じゃ','あ','り','ま','せ','ん'], distractors: ['です'] },
      { promptES: 'Arma: "Esto no es café":', answer: ['これ','は','コーヒー','じゃ','あ','り','ま','せ','ん'], distractors: ['です'] }
    ],
    u4: [
      { promptES: 'Arma (verbo al final): "Yo como tacos"', answer: ['わたし','は','タコス','を','たべます'], distractors: ['です'] },
      { promptES: 'Arma: "Yo como ramen"', answer: ['わたし','は','ラーメン','を','たべます'], distractors: ['です'] },
      { promptES: 'Arma: "Yo como sushi"', answer: ['わたし','は','すし','を','たべます'], distractors: ['です'] }
    ],
    u5: [
      { promptES: 'Acción en un lugar (に vs で): "Yo tomo café en la cafetería"', answer: ['わたし','は','カフェ','で','コーヒー','を','のみます'], distractors: ['に'] },
      { promptES: 'Cambia la acción: "Yo como tacos en la cafetería"', answer: ['わたし','は','カフェ','で','タコス','を','たべます'], distractors: ['に'] },
      { promptES: 'Cambia el lugar: "Yo como ramen en casa"', answer: ['わたし','は','いえ','で','ラーメン','を','たべます'], distractors: ['に'] }
    ],
    u6: [
      { promptES: 'Arma: "Este ramen no es caro"', answer: ['この','ラーメン','は','たかくない'], distractors: ['たかい','これ'] },
      { promptES: 'Arma: "Este café es caro"', answer: ['この','コーヒー','は','たかい'], distractors: ['たかくない','これ'] },
      { promptES: 'Contraste これ vs この: "Esto no es caro"', answer: ['これ','は','たかくない'], distractors: ['この','たかい'] }
    ],
    u7: [
      { promptES: 'Pide: "Yo quiero dos cafés, por favor"', answer: ['わたし','は','コーヒー','を','ふたつ','ください'], distractors: ['ひとつ'] },
      { promptES: 'Cambia cantidad: "Yo quiero un ramen, por favor"', answer: ['わたし','は','ラーメン','を','ひとつ','ください'], distractors: ['ふたつ'] },
      { promptES: 'Cambia comida: "Yo quiero dos tacos, por favor"', answer: ['わたし','は','タコス','を','ふたつ','ください'], distractors: ['ひとつ'] }
    ],
    u8: [
      { promptES: 'Omite "yo": "Mañana voy a Tokio"', answer: ['あした','とうきょう','に','いきます'], distractors: ['で','を'] },
      { promptES: 'Cambia destino: "Mañana voy a la cafetería"', answer: ['あした','カフェ','に','いきます'], distractors: ['で','を'] },
      { promptES: 'Contraste に vs で: "En Tokio como ramen"', answer: ['とうきょう','で','ラーメン','を','たべます'], distractors: ['に'] }
    ],
    m1_g3: [
      { promptES: 'Pregunta: "¿Esto cuesta 100 yenes?"', answer: ['これ','は','ひゃくえん','です','か'], distractors: ['この'] },
      { promptES: 'Pregunta: "¿Esto es café?"', answer: ['これ','は','コーヒー','です','か'], distractors: ['この'] },
      { promptES: 'Pregunta: "¿Mañana vas a Tokio?"', answer: ['あした','とうきょう','に','いきます','か'], distractors: ['で'] }
    ],
    m1_g4: [
      { promptES: 'Arma: "Esto es mi libro"', answer: ['これ','は','わたし','の','ほん','です'], distractors: ['を','か'] },
      { promptES: 'Cambia objeto: "Esto es mi smartphone"', answer: ['これ','は','わたし','の','スマホ','です'], distractors: ['を'] },
      { promptES: 'Cambia dueño: "Esto es el libro del profesor"', answer: ['これ','は','せんせい','の','ほん','です'], distractors: ['を'] }
    ],
    m1_g5: [
      { promptES: 'Arma: "Aquello es la estación"', answer: ['あれ','は','えき','です'], distractors: ['これ','それ'] },
      { promptES: 'Cambia distancia: "Eso es mi libro"', answer: ['それ','は','わたし','の','ほん','です'], distractors: ['これ','あれ'] },
      { promptES: 'Cambia distancia: "Esto es mi café"', answer: ['これ','は','わたし','の','コーヒー','です'], distractors: ['それ','あれ'] }
    ],
    m1_g6: [
      { promptES: 'Arma: "Yo también soy mexicano"', answer: ['わたし','も','メキシコじん','です'], distractors: ['は','を'] },
      { promptES: 'Cambia profesión: "Yo también soy estudiante"', answer: ['わたし','も','がくせい','です'], distractors: ['は'] },
      { promptES: 'も reemplaza を: "También como ramen"', answer: ['ラーメン','も','たべます'], distractors: ['を','は'] }
    ],
    m1_g7: [
      { promptES: 'Arma: "Me gusta el sushi"', answer: ['わたし','は','すし','が','すき です'], distractors: ['を','も'] },
      { promptES: 'Cambia comida: "Me gusta el café"', answer: ['わたし','は','コーヒー','が','すき です'], distractors: ['を'] },
      { promptES: 'Combina con も: "También me gusta el ramen"', answer: ['わたし','は','ラーメン','も','すき です'], distractors: ['を'] }
    ],
    m1_g8: [
      { promptES: 'Seres vivos (います): "Hay niños en el parque"', answer: ['こうえん','に','こども','が','います'], distractors: ['あります','で'] },
      { promptES: 'Objetos/lugares (あります): "Hay una cafetería en la estación"', answer: ['えき','に','カフェ','が','あります'], distractors: ['います','で'] },
      { promptES: 'Seres vivos (います): "Hay un profesor en la cafetería"', answer: ['カフェ','に','せんせい','が','います'], distractors: ['あります','で'] }
    ],
    kj1: [
      { promptES: '1/3 Reconoce el kanji de "uno":', answer: ['一'], distractors: ['二','三'] },
      { promptES: '2/3 Elige la lectura correcta de 一:', answer: ['いち'], distractors: ['に','さん'] },
      { promptES: '3/3 Forma "una cosa" (ひとつ):', answer: ['一','つ'], distractors: ['二','えん'] }
    ],
    kj2: [
      { promptES: '1/3 Reconoce el kanji de "dos":', answer: ['二'], distractors: ['一','三'] },
      { promptES: '2/3 Elige la lectura correcta de 二:', answer: ['に'], distractors: ['いち','さん'] },
      { promptES: '3/3 Forma "dos cosas" (ふたつ):', answer: ['二','つ'], distractors: ['一','三'] }
    ],
    kj3: [
      { promptES: '1/3 Reconoce el kanji de "tres":', answer: ['三'], distractors: ['一','二'] },
      { promptES: '2/3 Elige la lectura correcta de 三:', answer: ['さん'], distractors: ['いち','に'] },
      { promptES: '3/3 Forma "tres cosas" (みっつ):', answer: ['三','つ'], distractors: ['一','二'] }
    ],
    kj4: [
      { promptES: '1/3 Reconoce el kanji de "cien":', answer: ['百'], distractors: ['一','三'] },
      { promptES: '2/3 Elige la lectura correcta de 百:', answer: ['ひゃく'], distractors: ['いち','えん'] },
      { promptES: '3/3 Forma "100 yenes" (ひゃくえん):', answer: ['百','えん'], distractors: ['一','つ'] }
    ],
    kj5: [
      { promptES: '1/3 Reconoce el kanji de "yen":', answer: ['円'], distractors: ['百','二'] },
      { promptES: '2/3 Elige la lectura correcta de 円:', answer: ['えん'], distractors: ['ひゃく','ほん'] },
      { promptES: '3/3 Forma "100 yenes" en kanji (百円):', answer: ['百','円'], distractors: ['一','二'] }
    ],
    kj6: [
      { promptES: '1/3 Reconoce el kanji de "libro":', answer: ['本'], distractors: ['円','一'] },
      { promptES: '2/3 Elige la lectura correcta de 本:', answer: ['ほん'], distractors: ['えん','に'] },
      { promptES: '3/3 Forma "mi libro" (わたし の 本):', answer: ['わたし','の','本'], distractors: ['円','を'] }
    ],
    kj7: [
      { promptES: '1/3 Reconoce el kanji de "sol / día":', answer: ['日'], distractors: ['本','円'] },
      { promptES: '2/3 Elige la lectura de 日 en 日本:', answer: ['に'], distractors: ['ほん','ひと'] },
      { promptES: '3/3 Forma "Japón" (日本):', answer: ['日','本'], distractors: ['円','一'] }
    ],
    kj8: [
      { promptES: '1/3 Reconoce el kanji de "persona":', answer: ['人'], distractors: ['日','本'] },
      { promptES: '2/3 Elige la lectura correcta de 人:', answer: ['ひと'], distractors: ['ほん','に'] },
      { promptES: '3/3 Forma "mexicano/a" (メキシコ人):', answer: ['メキシコ','人'], distractors: ['日','本'] }
    ]
  };

  window._drillLessonId = null;
  window._drillIdx = 0;

  function getLessonQueue(l) {
    if (month1Drills[l.id]) return month1Drills[l.id];
    return [{ promptES: l.puzzlePromptES, promptEN: l.puzzlePromptEN, answer: l.puzzleAnswer, distractors: l.puzzleDistractors }];
  }

  window.renderLessonWorkspace = function () {
    const l = lessons.find((x) => x.id === activeLessonId) || lessons[0];
    if (window._drillLessonId !== l.id) {
      window._drillLessonId = l.id;
      window._drillIdx = 0;
      puzzleSelected = [];
    }
    const queue = getLessonQueue(l);
    const step = queue[Math.min(window._drillIdx, queue.length - 1)];
    const isES = state.lang === 'es';
    const allTiles = [...new Set([...step.answer, ...step.distractors])].sort();
    const s1 = l.stage1Label || 'Etapa 1 • Concepto (60s)';
    const s2 = l.stage2Label || 'Etapa 2 • Escucha y Repite';
    const s3 = `${l.stage3Label || 'Etapa 3 • Práctica'} • Ejercicio ${window._drillIdx + 1}/${queue.length}`;
    const tapHint = 'Toca cada bloque arriba para escuchar y repetir.';
    const zoneHint = step.audioOnly ? 'Escucha el audio y toca la sílaba correcta...' : (l.isScript ? 'Toca las letras de abajo...' : 'Toca los bloques de abajo para armar la oración...');

    const renderTileLabel = (t) => {
      const rom = romajiMap[t] || '';
      const mastered = (state.blockMastery[t] || 0) >= 3;
      const showRom = !step.audioOnly && rom && !mastered;
      return `<span class="jp" style="display:block;">${renderRuby(t)}</span>${showRom ? `<span class="romaji" style="display:block;font-size:0.72rem;color:var(--muted);">${rom}</span>` : ''}`;
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
      <p style="font-weight:700; margin-top:6px;">${step.promptES}</p>

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
        <button class="btn btn-primary" onclick="speakJP('${step.answer.join('')}')">🔊 ${step.audioOnly ? 'Escuchar Sílaba' : 'Escuchar Frase'}</button>
      </div>
      <div id="puzzleFeedback" style="margin-top:10px; font-weight:700;"></div>
    `;
  };

  window.checkPuzzle = function (lessonId) {
    const l = lessons.find((x) => x.id === lessonId);
    const queue = getLessonQueue(l);
    const step = queue[Math.min(window._drillIdx, queue.length - 1)];
    const ok = JSON.stringify(puzzleSelected) === JSON.stringify(step.answer);
    const fb = document.getElementById('puzzleFeedback');
    if (ok) {
      speakJP(step.answer.join(''));
      step.answer.forEach((t) => { state.blockMastery[t] = (state.blockMastery[t] || 0) + 1; });
      if (window._drillIdx < queue.length - 1) {
        fb.style.color = 'var(--green)';
        fb.textContent = `✅ ¡Correcto! (${window._drillIdx + 1}/${queue.length}) Siguiente ejercicio...`;
        setTimeout(() => {
          window._drillIdx++;
          puzzleSelected = [];
          renderLessonWorkspace();
          const nextStep = queue[window._drillIdx];
          if (nextStep && nextStep.audioOnly) speakJP(nextStep.answer.join(''));
        }, 850);
      } else {
        fb.style.color = 'var(--green)';
        fb.textContent = `🎉 ¡Set completo (${queue.length}/${queue.length})! Dominaste esta lección.`;
        if (!state.completedLessons.includes(lessonId)) state.completedLessons.push(lessonId);
        saveLocal(true);
        refreshAll();
      }
    } else {
      fb.style.color = 'var(--coral)';
      fb.textContent = `❌ Casi. Respuesta esperada: ${step.answer.join(' ')}`;
    }
  };

  if (typeof renderLessonWorkspace === 'function') renderLessonWorkspace();
})();