import { createServer as createHttpServer } from "node:http";
import { existsSync, readFileSync } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { dirname, extname, join, normalize } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const rootDir = dirname(fileURLToPath(import.meta.url));
const env = loadEnv();

const config = {
  port: Number(env.PORT || 5173),
  nodeEnv: env.NODE_ENV || "development",
  geminiApiKey: env.GEMINI_API_KEY || "",
  geminiModel: env.GEMINI_MODEL || "gemini-3.5-flash",
  supabaseUrl: env.SUPABASE_URL || "",
  supabasePublishableKey: env.SUPABASE_PUBLISHABLE_KEY || "",
  adminEmails: String(env.ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean),
  allowDemoAuth: String(env.ALLOW_DEMO_AUTH || "false").toLowerCase() === "true"
};

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".pdf": "application/pdf",
  ".ico": "image/x-icon"
};

const rateBuckets = new Map();

function loadEnv(filePath = join(rootDir, ".env")) {
  const loaded = { ...process.env };
  if (!existsSync(filePath)) return loaded;
  const text = readFileSync(filePath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const index = trimmed.indexOf("=");
    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!loaded[key]) loaded[key] = value;
  }
  return loaded;
}

function securityHeaders(contentType = "application/json; charset=utf-8") {
  return {
    "Content-Type": contentType,
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "X-Frame-Options": "DENY",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    "Cross-Origin-Resource-Policy": "same-origin"
  };
}

function sendJson(response, status, payload) {
  response.writeHead(status, {
    ...securityHeaders(),
    "Cache-Control": "no-store"
  });
  response.end(JSON.stringify(payload));
}

function sendText(response, status, text, contentType = "text/plain; charset=utf-8") {
  response.writeHead(status, {
    ...securityHeaders(contentType),
    "Cache-Control": "no-store"
  });
  response.end(text);
}

async function readJsonBody(request, limitBytes = 80_000) {
  let body = "";
  for await (const chunk of request) {
    body += chunk;
    if (body.length > limitBytes) {
      const error = new Error("Request body is too large.");
      error.status = 413;
      throw error;
    }
  }
  if (!body.trim()) return {};
  try {
    return JSON.parse(body);
  } catch {
    const error = new Error("Request body must be valid JSON.");
    error.status = 400;
    throw error;
  }
}

function rateLimit(key, max, windowMs) {
  const now = Date.now();
  const bucket = rateBuckets.get(key) || { count: 0, resetAt: now + windowMs };
  if (now > bucket.resetAt) {
    bucket.count = 0;
    bucket.resetAt = now + windowMs;
  }
  bucket.count += 1;
  rateBuckets.set(key, bucket);
  return {
    ok: bucket.count <= max,
    retryAfter: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000))
  };
}

function clientIp(request) {
  const forwarded = request.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) return forwarded.split(",")[0].trim();
  return request.socket.remoteAddress || "unknown";
}

async function requireUser(request) {
  if (config.allowDemoAuth && request.headers["x-peakpoint-demo-user"]) {
    return {
      id: "demo-user",
      email: String(request.headers["x-peakpoint-demo-user"]).toLowerCase(),
      app_metadata: { role: request.headers["x-peakpoint-demo-admin"] ? "admin" : "student" },
      user_metadata: { name: "Demo Student" }
    };
  }

  const auth = request.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!token) {
    const error = new Error("Please log in to use this feature.");
    error.status = 401;
    throw error;
  }
  if (!config.supabaseUrl || !config.supabasePublishableKey) {
    const error = new Error("Server auth verification is not configured.");
    error.status = 503;
    throw error;
  }

  const response = await fetch(`${config.supabaseUrl.replace(/\/$/, "")}/auth/v1/user`, {
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: config.supabasePublishableKey
    }
  });
  if (!response.ok) {
    const error = new Error("Your session could not be verified. Please log in again.");
    error.status = 401;
    throw error;
  }
  return response.json();
}

function isAdmin(user) {
  const email = String(user?.email || "").toLowerCase();
  const role = user?.app_metadata?.role || user?.user_metadata?.role;
  return role === "admin" || (email && config.adminEmails.includes(email));
}

function aiUnavailablePayload() {
  return {
    unavailable: true,
    message: "PeakPoint AI is not available yet. Add GEMINI_API_KEY on the server to turn this on."
  };
}

function compactText(value, max = 4000) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
}

function sanitizeTutorContext(context = {}, submitted = false) {
  const question = context.question || {};
  const choices = Array.isArray(question.choices) ? question.choices.map((choice) => compactText(choice, 500)) : [];
  const safeQuestion = {
    id: compactText(question.id, 120),
    prompt: compactText(question.prompt || question.text, 2500),
    passage: compactText(question.passage, 3000),
    choices,
    subject: compactText(question.subject || question.section, 80),
    domain: compactText(question.domain, 120),
    skill: compactText(question.skillName || question.skill, 120),
    difficulty: compactText(question.difficulty, 40),
    estimatedTime: compactText(question.estimatedTime || question.estimatedSeconds, 40),
    explanation: submitted ? compactText(question.explanation, 2500) : undefined
  };

  if (submitted) {
    safeQuestion.correctAnswer = question.correctAnswer ?? question.answerLabel ?? question.correctChoice ?? null;
  }

  return {
    submitted: !!submitted,
    action: compactText(context.action, 80),
    selectedAnswer: submitted ? compactText(context.selectedAnswer, 1000) : undefined,
    recentWeaknesses: Array.isArray(context.recentWeaknesses)
      ? context.recentWeaknesses.slice(0, 6).map((item) => compactText(item, 120))
      : [],
    previousHints: Array.isArray(context.previousHints)
      ? context.previousHints.slice(-5).map((item) => compactText(item, 500))
      : [],
    question: safeQuestion
  };
}

function buildTutorPayload(body) {
  const submitted = !!body?.context?.submitted;
  const safeContext = sanitizeTutorContext(body?.context, submitted);
  const beforeSubmitRule = submitted
    ? "The student has submitted an answer, so you may fully explain the correct answer and the student's mistake."
    : "The student has not submitted an answer. Do not reveal the correct answer, do not identify the correct choice, and do not eliminate choices down to one option. Give hints, concepts, and guiding questions only.";

  return {
    system_instruction:
      "You are PeakPoint AI Tutor, a concise, friendly SAT tutor inside PeakPoint SAT Prep. " +
      beforeSubmitRule +
      " Keep responses accurate, student-safe, and focused on SAT strategy. Never claim content is official College Board content.",
    input: JSON.stringify({
      studentMessage: compactText(body?.message, 1500),
      requestedHelp: compactText(body?.action || safeContext.action, 80),
      context: safeContext
    })
  };
}

function buildExplanationPayload(body) {
  const context = sanitizeTutorContext({ question: body?.question, selectedAnswer: body?.selectedAnswer }, true);
  return {
    system_instruction:
      "You write SAT-style answer explanations for PeakPoint. Cover why the correct answer is correct, why each incorrect answer is incorrect, the tested concept, the fastest method, a common trap, a takeaway rule, and Desmos guidance when useful. Be concise and do not invent official-source claims.",
    input: JSON.stringify({
      requestType: compactText(body?.requestType || "full explanation", 80),
      context
    })
  };
}

function buildSummaryPayload(body) {
  return {
    system_instruction:
      "You are PeakPoint's study coach. Summarize SAT progress in plain, encouraging language. Use only the provided metrics. Do not calculate scores; explain the given deterministic results.",
    input: JSON.stringify({
      kind: compactText(body?.kind || "progress", 80),
      metrics: body?.metrics || {}
    })
  };
}

function buildAdminQuestionPayload(body) {
  const count = Math.max(1, Math.min(10, Number.parseInt(body?.count, 10) || 1));
  return {
    system_instruction:
      "You create original SAT-style, digital-SAT-aligned practice questions for PeakPoint. Do not copy, paraphrase, or imply official College Board content. Return strict JSON only.",
    input: JSON.stringify({
      instructions:
        "Generate original questions. Each item must include prompt, optional passage, choices array of 4 strings, correctAnswer as A/B/C/D, explanation, subject, domain, skill, difficulty, questionType, estimatedSeconds, sourceType set to ai-generated, and qualityNotes.",
      subject: compactText(body?.subject, 80),
      domain: compactText(body?.domain, 120),
      skill: compactText(body?.skill, 120),
      difficulty: compactText(body?.difficulty, 40),
      questionType: compactText(body?.questionType, 80),
      count,
      additionalInstructions: compactText(body?.additionalInstructions, 1200),
      jsonShape: {
        questions: [
          {
            prompt: "string",
            passage: "string or empty",
            choices: ["A choice", "B choice", "C choice", "D choice"],
            correctAnswer: "A",
            explanation: "string",
            subject: "Math or Reading and Writing or Vocabulary",
            domain: "string",
            skill: "string",
            difficulty: "Easy/Medium/Hard",
            questionType: "string",
            estimatedSeconds: 75,
            sourceType: "ai-generated",
            qualityNotes: "string"
          }
        ]
      }
    })
  };
}

async function callGemini(payload, { json = false } = {}) {
  if (!config.geminiApiKey) return aiUnavailablePayload();

  const response = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": config.geminiApiKey
    },
    body: JSON.stringify({
      model: config.geminiModel,
      store: false,
      system_instruction: payload.system_instruction,
      input: payload.input,
      generation_config: {
        temperature: json ? 0.35 : 0.55,
        thinking_level: "low"
      }
    })
  });

  const text = await response.text();
  if (!response.ok) {
    const error = new Error("PeakPoint AI could not complete the request. Please try again soon.");
    error.status = response.status >= 500 ? 502 : 400;
    throw error;
  }

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = { output_text: text };
  }
  const output = extractGeminiText(parsed);
  return json ? { text: output, json: parseGeminiJson(output) } : { text: output };
}

function extractGeminiText(response) {
  if (typeof response?.output_text === "string") return response.output_text.trim();
  const candidates = [];
  const visit = (value) => {
    if (!value) return;
    if (typeof value === "string") candidates.push(value);
    else if (Array.isArray(value)) value.forEach(visit);
    else if (typeof value === "object") {
      if (value.type === "text" && typeof value.text === "string") candidates.push(value.text);
      else Object.values(value).forEach(visit);
    }
  };
  visit(response?.steps);
  return candidates.join("\n").trim();
}

function parseGeminiJson(text) {
  const cleaned = String(text || "").replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1));
    }
    throw new Error("PeakPoint AI returned a response that could not be reviewed as JSON.");
  }
}

async function handleApi(request, response, pathname) {
  if (request.method === "GET" && pathname === "/api/health") {
    return sendJson(response, 200, {
      ok: true,
      ai: { available: !!config.geminiApiKey, model: config.geminiApiKey ? config.geminiModel : null }
    });
  }

  if (request.method !== "POST") {
    return sendJson(response, 405, { error: "Method not allowed." });
  }

  const body = await readJsonBody(request, pathname.startsWith("/api/admin/") ? 120_000 : 80_000);
  if (!config.geminiApiKey) {
    return sendJson(response, 503, aiUnavailablePayload());
  }

  const user = await requireUser(request);
  const key = `${user.id || clientIp(request)}:${pathname}`;
  const adminRoute = pathname.startsWith("/api/admin/");
  const limit = adminRoute ? rateLimit(key, 8, 60 * 60 * 1000) : rateLimit(key, 30, 60 * 1000);
  if (!limit.ok) {
    response.writeHead(429, { ...securityHeaders(), "Retry-After": String(limit.retryAfter) });
    return response.end(JSON.stringify({ error: "Slow down a bit and try again soon." }));
  }

  if (adminRoute && !isAdmin(user)) {
    return sendJson(response, 403, { error: "Administrator access is required." });
  }

  if (pathname === "/api/ai/tutor") {
    return sendJson(response, 200, await callGemini(buildTutorPayload(body)));
  }
  if (pathname === "/api/ai/explanation") {
    return sendJson(response, 200, await callGemini(buildExplanationPayload(body)));
  }
  if (pathname === "/api/ai/summary" || pathname === "/api/ai/recommendation" || pathname === "/api/ai/vocabulary") {
    return sendJson(response, 200, await callGemini(buildSummaryPayload(body)));
  }
  if (pathname === "/api/admin/generate-questions") {
    return sendJson(response, 200, await callGemini(buildAdminQuestionPayload(body), { json: true }));
  }

  return sendJson(response, 404, { error: "API route not found." });
}

async function serveStatic(response, pathname) {
  const requestedPath = pathname === "/" ? "/index.html" : pathname;
  const decoded = decodeURIComponent(requestedPath);
  const safePath = normalize(decoded).replace(/^(\.\.(\/|\\|$))+/, "");
  const fullPath = join(rootDir, safePath);

  if (!fullPath.startsWith(rootDir) || !existsSync(fullPath) || (await stat(fullPath)).isDirectory()) {
    return sendText(response, 404, "Not found");
  }

  const extension = extname(fullPath);
  const contentType = mimeTypes[extension] || "application/octet-stream";
  const content = await readFile(fullPath);
  response.writeHead(200, {
    ...securityHeaders(contentType),
    "Cache-Control": extension === ".html" ? "no-store" : "public, max-age=300"
  });
  response.end(content);
}

function createPeakPointServer() {
  return createHttpServer(async (request, response) => {
    try {
      const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);
      if (url.pathname.startsWith("/api/")) {
        await handleApi(request, response, url.pathname);
        return;
      }
      await serveStatic(response, url.pathname);
    } catch (error) {
      const status = Number(error?.status) || 500;
      const message = status >= 500 ? "Something went wrong. Please try again." : error.message;
      sendJson(response, status, { error: message });
    }
  });
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  function listen(port) {
    const server = createPeakPointServer();
    server.on("error", (error) => {
      if (error.code === "EADDRINUSE") {
        console.log(`Port ${port} is in use. Trying ${port + 1}.`);
        listen(port + 1);
        return;
      }
      throw error;
    });
    server.listen(port, "127.0.0.1", () => {
      console.log(`PeakPoint SAT Prep running at http://localhost:${port}`);
    });
  }
  listen(config.port);
}

export {
  buildAdminQuestionPayload,
  buildExplanationPayload,
  buildTutorPayload,
  callGemini,
  config,
  createPeakPointServer,
  extractGeminiText,
  loadEnv,
  parseGeminiJson,
  sanitizeTutorContext
};
