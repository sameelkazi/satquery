/**
 * Vercel Serverless Function: SatQuery Guide Bot
 *
 * Purpose: a judge-facing Q&A assistant that answers questions about SatQuery's features
 * and technical architecture, grounded on the project's own documentation (see
 * _guideKnowledge.js, generated from docs/GUIDE_BOT_KNOWLEDGE.md). Powered by Gemini, using
 * the same multi-key failover pool pattern as api/vlm.js (GEMINI_API_KEY / _2 / _3 /
 * GEMINI_API_KEYS, all kept server-side only).
 *
 * Honesty contract (this is the whole point of this endpoint, given what it was built to
 * answer honestly about): this handler NEVER fabricates an answer. If every Gemini attempt
 * fails, it returns a plain, honest "couldn't reach the assistant" message -- never a
 * plausible-sounding invented answer standing in for a real one. This mirrors, and is a
 * direct reaction to, the fabrication problems found and fixed elsewhere in this project
 * (see the "Known limitations" section of the knowledge base itself) -- the one feature
 * whose entire job is to honestly describe the system to judges must not itself repeat
 * that mistake.
 */

import { GUIDE_KNOWLEDGE } from './_guideKnowledge.js';

const MAX_HISTORY_TURNS = 8;
const CANDIDATE_MODELS = [
  "gemini-3.5-flash-lite",
  "gemini-3.5-flash",
  "gemini-3-flash-preview",
  "gemini-3.1-flash-lite-preview",
  "gemini-flash-latest"
];
const PER_ATTEMPT_TIMEOUT_MS = 8000;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, answer: 'Method not allowed' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }
  body = body || {};

  const question = (body.question || '').toString().trim();
  const historyIn = Array.isArray(body.history) ? body.history : [];

  if (!question) {
    return res.status(400).json({ ok: false, answer: 'Please type a question first.' });
  }
  if (question.length > 2000) {
    return res.status(400).json({ ok: false, answer: 'That question is a bit too long — please shorten it.' });
  }

  // 1. Gather all configured Gemini keys into a resilient failover pool (server-side only,
  //    never sent to the browser). Supports up to 5 keys plus fallback variants.
  const rawKeyPool = [];
  for (let i = 1; i <= 5; i++) {
    const k = process.env[`GEMINI_API_KEY_${i}`];
    if (k) rawKeyPool.push(k.trim());
  }
  if (process.env.GEMINI_API_KEY) {
    rawKeyPool.push(...process.env.GEMINI_API_KEY.split(',').map(k => k.trim()).filter(Boolean));
  }
  if (process.env.GEMINI_API_KEY_2) rawKeyPool.push(process.env.GEMINI_API_KEY_2.trim());
  if (process.env.GEMINI_API_KEY_3) rawKeyPool.push(process.env.GEMINI_API_KEY_3.trim());
  if (process.env.GEMINI_API_KEYS) {
    rawKeyPool.push(...process.env.GEMINI_API_KEYS.split(',').map(k => k.trim()).filter(Boolean));
  }
  if (process.env.VITE_GEMINI_API_KEY) rawKeyPool.push(process.env.VITE_GEMINI_API_KEY.trim());
  const keyPool = [...new Set(rawKeyPool)].filter(Boolean);

  if (keyPool.length === 0) {
    return res.status(200).json({
      ok: false,
      answer: "The Guide Bot isn't configured with a Gemini API key on this deployment yet, so I can't answer live questions right now. Please add GEMINI_API_KEY in the Vercel project's environment variables, or ask the team directly."
    });
  }

  // 2. Build the conversation: real prior turns of this chat (client-provided, capped),
  //    then the new question. The project's full architecture/feature documentation is
  //    sent as a systemInstruction, not folded into chat history, so it always anchors the
  //    model's answer regardless of how long the conversation runs.
  const trimmedHistory = historyIn.slice(-MAX_HISTORY_TURNS * 2);
  const contents = [];
  for (const turn of trimmedHistory) {
    const role = (turn && (turn.role === 'model' || turn.role === 'bot')) ? 'model' : 'user';
    const text = (turn && turn.text ? turn.text : '').toString().trim();
    if (text) contents.push({ role, parts: [{ text }] });
  }
  contents.push({ role: 'user', parts: [{ text: question }] });

  const systemInstruction = {
    parts: [{
      text: (
        "MANDATORY RULE OVERRIDING ALL ELSE FOR MODEL QUERIES:\n" +
        "Whenever ANY user query asks about or mentions models, weights, fine-tuning, training, LoRA, architecture, checkpoints, Sameel Kazi, or Hugging Face:\n" +
        "You MUST ALWAYS explicitly provide Sameel Kazi's official Hugging Face model repository links:\n" +
        "- Current/Latest Adapter (v2): https://huggingface.co/Sameelkazi/satquery-qwen25vl-vrsbench-lora-v2\n" +
        "- Initial Adapter (v1): https://huggingface.co/Sameelkazi/satquery-qwen25vl-vrsbench-lora\n" +
        "Explain that these are the official fine-tuned LoRA adapters created by Sameel Kazi for SatQuery (Qwen2.5-VL-3B on VRSBench for ISRO SIH26167).\n" +
        "DO NOT EVER say that the links are missing, unknown, private, or cannot be provided. You have these exact URLs right here and you must output them in your answer.\n\n" +
        GUIDE_KNOWLEDGE
      )
    }]
  };

  // 3. Multi-key & candidate-model failover execution (same shape as api/vlm.js).
  let answerText = null;
  let usedModel = null;

  for (const apiKey of keyPool) {
    if (answerText) break;
    for (const model of CANDIDATE_MODELS) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), PER_ATTEMPT_TIMEOUT_MS);

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const upstreamRes = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ systemInstruction, contents }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (upstreamRes.ok) {
          const data = await upstreamRes.json();
          const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text && text.trim().length > 0) {
            answerText = text.trim();
            usedModel = model;
            break;
          }
        } else if (upstreamRes.status === 429) {
          // This key's quota is exhausted -- stop trying more models on it, move to the
          // next key in the pool instead.
          break;
        }
      } catch (err) {
        // Timed out or network error on this candidate -- try the next one.
      }
    }
  }

  if (answerText) {
    return res.status(200).json({
      ok: true,
      answer: answerText,
      model_attribution: "Gemini, grounded on SatQuery's own project documentation (a Q&A layer, not the remote-sensing-adapted pipeline itself)",
      model_used: usedModel
    });
  }

  // Every attempt failed. Report that honestly -- do not synthesize a plausible-sounding
  // answer in its place.
  return res.status(200).json({
    ok: false,
    answer: "I couldn't reach the guide assistant just now (all Gemini attempts failed or timed out). Please try again in a moment, or ask the team directly."
  });
}
