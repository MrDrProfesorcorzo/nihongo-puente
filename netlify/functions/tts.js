export default async (req) => {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").trim();

  if (!q) {
    return new Response("Missing query", { status: 400 });
  }

  try {
    const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=ja&client=tw-ob&q=${encodeURIComponent(q.slice(0, 180))}`;
    const upstream = await fetch(ttsUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Referer": "https://translate.google.com/"
      }
    });

    if (!upstream.ok) {
      return new Response("TTS upstream error", { status: upstream.status });
    }

    const audioBuffer = await upstream.arrayBuffer();
    return new Response(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=86400",
        "Access-Control-Allow-Origin": "*"
      }
    });
  } catch (err) {
    return new Response(err.message, { status: 500 });
  }
};