import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SECTION_KEYS = [
  "contentTitle", "hooks", "voiceOverScript", "sceneTimeline", "presenterActions",
  "screenFootage", "onScreenCaptions", "videoPrompt", "instagramCaption",
  "facebookPageCaption", "facebookGroupCaption", "carouselCopy", "storyFrames",
  "cta", "keywords", "hashtags", "thumbnailHeadline", "postingTime",
  "publishingChecklist", "targetAudience", "expectedAction", "objective",
] as const;

function fallbackOutput(input: Record<string, unknown>): Record<string, string> {
  const topic = String(input.topic ?? "your topic");
  const platform = String(input.platform ?? "Instagram");
  const format = String(input.format ?? "30-second Reel");
  const tone = String(input.tone ?? "Educational");
  const audience = String(input.audience ?? "beginners learning AI");
  const cta = String(input.ctaType ?? "Follow for more");
  const obj: Record<string, string> = {};
  obj.contentTitle = `${topic} — ${format} for ${platform}`;
  obj.hooks = `1. Stop scrolling if you've ever felt overwhelmed by AI tools.\n2. In the next ${input.videoDuration ?? "30"} seconds, you'll learn ${topic}.\n3. Most beginners get this wrong — here's the right way.`;
  obj.voiceOverScript = `[${tone} tone] Hi ${audience}! Today we're covering ${topic}. Let's break it down step by step so you can apply it immediately.`;
  obj.sceneTimeline = `0-3s: Hook on screen\n3-10s: Introduce topic\n10-25s: Step-by-step demo\n25-30s: CTA: ${cta}`;
  obj.presenterActions = `Face camera for hook. Gesture to screen during demo. Point to CTA card at end.`;
  obj.screenFootage = input.screenFootage === "Yes" ? `Show real screen recording of the AI tool in action while explaining each step.` : `Use animated slides or stock B-roll to illustrate the steps.`;
  obj.onScreenCaptions = `Bold, high-contrast captions synced to voice-over. Highlight key terms in brand orange.`;
  obj.videoPrompt = `Cinematic close-up of a friendly presenter at a clean desk, warm ivory background, explaining AI tools with screen recordings, professional educational style, soft natural lighting, brand orange accents.`;
  obj.instagramCaption = `${topic} simplified for ${audience}. ${cta} Save this for later! #AILearnerHub`;
  obj.facebookPageCaption = `Learn ${topic} in under a minute. Follow AI Learner Hub for beginner-friendly AI tutorials. ${cta}`;
  obj.facebookGroupCaption = `Hey community! Let's explore ${topic} together. Share your questions below. ${cta}`;
  obj.carouselCopy = `Slide 1: "${topic} — 5 key takeaways"\nSlide 2: Why it matters\nSlide 3-4: Step-by-step\nSlide 5: Pro tip\nSlide 6: CTA`;
  obj.storyFrames = `Frame 1: Question sticker "${topic}?"\nFrame 2: Quick tip\nFrame 3: Swipe up / link sticker`;
  obj.cta = cta;
  obj.keywords = `${topic}, AI tools, beginner AI, ${platform}, educational, tutorial`;
  obj.hashtags = `#AILearnerHub #AITools #LearnAI #AIForBeginners #ContentCreation #${platform.replace(/\s/g, "")}`;
  obj.thumbnailHeadline = `${topic.toUpperCase()} in ${input.videoDuration ?? "30"}s`;
  obj.postingTime = `Best time: 7-9 PM ${input.timezone ?? "local time"} for ${platform}`;
  obj.publishingChecklist = `1. Proofread captions\n2. Add hashtags\n3. Attach asset URL\n4. Set scheduled time\n5. Confirm platform\n6. Publish\n7. Enter results`;
  obj.targetAudience = audience;
  obj.expectedAction = `Viewers will ${cta.toLowerCase()} and share the post with friends interested in AI.`;
  obj.objective = String(input.objective ?? `Educate ${audience} about ${topic} and drive engagement on ${platform}.`);
  return obj;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  try {
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      const body = await req.json().catch(() => ({}));
      const input = (body && body.input) ? body.input : {};
      return new Response(
        JSON.stringify({ output: fallbackOutput(input), geminiConnected: false }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const body = await req.json();
    const input = body?.input ?? {};
    const prompt = `You are an expert AI content strategist for "AI Learner Hub", a premium educational AI community.
Generate a COMPLETE content campaign as STRICT JSON with these exact string fields:
${SECTION_KEYS.map((k) => `- "${k}"`).join("\n")}

Context:
- Topic: ${input.topic}
- Objective: ${input.objective}
- Target audience: ${input.audience}
- Platform: ${input.platform}
- Format: ${input.format}
- Language: ${input.language}
- Tone: ${input.tone}
- Video duration: ${input.videoDuration} seconds
- CTA type: ${input.ctaType}
- Key info: ${input.keyInfo}
- Offer/giveaway: ${input.offer}
- Extra instructions: ${input.instructions}
- Screen footage available: ${input.screenFootage}
- Presenter required: ${input.presenter}
- Urgency: ${input.urgency}
- Education level: ${input.educationLevel}

Rules:
- "hooks" must be three numbered scroll-stopping hooks separated by newlines.
- "sceneTimeline" must be a timed breakdown.
- "carouselCopy" must list each slide.
- "storyFrames" must describe each frame.
- "hashtags" must be a space-separated list.
- "publishingChecklist" must be a numbered list.
- Return ONLY valid JSON, no markdown fences.`;

    const genRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json", temperature: 0.8 },
        }),
      }
    );
    if (!genRes.ok) {
      const errText = await genRes.text();
      throw new Error(`Gemini API error: ${genRes.status} ${errText.slice(0, 200)}`);
    }
    const genData = await genRes.json();
    const text = genData?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    let parsed: Record<string, unknown> = {};
    try { parsed = JSON.parse(text); } catch {
      const m = text.match(/\{[\s\S]*\}/);
      if (m) { try { parsed = JSON.parse(m[0]); } catch { /* ignore */ } }
    }
    const output: Record<string, string> = {};
    for (const k of SECTION_KEYS) {
      const v = parsed[k];
      if (typeof v === "string") output[k] = v;
      else if (Array.isArray(v)) output[k] = v.map((x) => typeof x === "string" ? x : JSON.stringify(x)).join("\n");
      else if (v && typeof v === "object") output[k] = JSON.stringify(v, null, 2);
      else output[k] = "";
    }
    return new Response(
      JSON.stringify({ output, geminiConnected: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err?.message ?? "Generation failed", geminiConnected: true }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
