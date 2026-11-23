import { callLLM } from "@/lib/ai-service";
import { parseJsonSafe, type ActionAiContext } from "@/lib/ai-qa-actions";

export interface IssueAgentChatMessage {
  role: "user" | "assistant";
  content: string;
  imageBase64?: string;
  mimeType?: string;
}

export interface IssueAgentTicketDraft {
  project?: string;
  module?: string;
  bugType?: string;
  title?: string;
  preconditions?: string;
  stepsToReproduce?: string;
  expectedResult?: string;
  actualResult?: string;
  severity?: string;
  priority?: string;
  evidence?: string;
  suspectedCause?: string;
}

export interface IssueAgentPayload {
  messages?: IssueAgentChatMessage[];
  prompt?: string;
  project?: string;
  preset?: "standard" | "compact" | "technical";
  activeDraft?: IssueAgentTicketDraft;
  imageBase64?: string;
  mimeType?: string;
  customRules?: string;
}

export interface IssueAgentResult {
  hasTicketData: boolean;
  chatTitle: string;
  assistantReply: string;
  ticket: IssueAgentTicketDraft | null;
}

export async function actionIssueAgent(
  payload: IssueAgentPayload,
  ai: ActionAiContext
): Promise<IssueAgentResult> {
  const {
    messages = [],
    prompt = "",
    project = "General",
    preset = "standard",
    activeDraft,
    imageBase64: singleImageBase64,
    mimeType: singleMimeType = "image/png",
    customRules = "",
  } = payload;

  const chatHistory: IssueAgentChatMessage[] =
    Array.isArray(messages) && messages.length > 0
      ? messages
      : [{ role: "user", content: prompt || "", imageBase64: singleImageBase64, mimeType: singleMimeType }];

  const lastMsg = chatHistory[chatHistory.length - 1];
  if (!lastMsg || (!lastMsg.content?.trim() && !lastMsg.imageBase64)) {
    throw new Error("Message content or screenshot is required");
  }

  // Fast bypass for bare greetings without LLM call (same as snapTest)
  const GREETING_RE = /^(hi|hello|hey|halo|hai|p|pagi|test|tes|thanks|thank you|makasih|terima kasih)[.!?]*$/i;
  const ID_GREETING_RE = /^(halo|hai|pagi|tes|makasih|terima kasih)[.!?]*$/i;
  if (chatHistory.length === 1 && !lastMsg.imageBase64 && GREETING_RE.test(lastMsg.content.trim())) {
    const isId = ID_GREETING_RE.test(lastMsg.content.trim());
    return {
      hasTicketData: false,
      chatTitle: "New Bug Draft",
      assistantReply: isId
        ? "Halo! Ceritakan bug atau kendala yang ingin dilaporkan. Kamu juga bisa melampirkan screenshot atau link error."
        : "Hi! Tell me about the bug or issue you'd like to report. You can also paste screenshots or error URLs.",
      ticket: null,
    };
  }

  const systemPrompt = `You are a Senior QA Manager and Technical Product Manager acting as an autonomous Issue & Bug Agent in Aksora.
Your role is to converse naturally with the QA/Dev engineer to gather information, auto-detect the affected module and bug type, ask targeted clarification questions when info is incomplete, and assemble a flawless, professional engineering bug report.

RULES FOR "has_ticket_data":
1. Set "has_ticket_data": false if:
   - The user message is just a bare greeting (e.g. "hi", "hello", "halo", "test", "thanks", "p").
   - The user provided extremely vague input without specific bug/feature details (e.g. just "error", "rusak", "tolong").
   - The user is only chatting or asking a general QA question WITHOUT describing or reporting an actual bug, AND no [ACTIVE BUG DRAFT] exists to edit.
   - CRITICAL: In all non-ticket cases, set "has_ticket_data": false AND set ticket fields to null!
2. Set "has_ticket_data": true ONLY when:
   - The user is genuinely reporting, describing, or editing an actual software bug, defect, or providing bug evidence/error logs/screenshots.
   - TICKET ITERATION / EDIT TURNS: If the conversation contains an [ACTIVE BUG DRAFT] and the user asks to modify, update, remove, or reformat any part of it (e.g. "hapus langkah-langkahnya", "ubah judulnya", "ganti module ke Payments", "severity naikkan jadi critical"):
     * Set "has_ticket_data": true.
     * MODIFY and return the updated ticket based on the existing draft and user's instruction. Keep existing valid fields unless specifically requested to change.

CONVERSATIONAL INTELLIGENCE & AGENT PERSONALITY:
- Tone: Professional, articulate, helpful, QA-focused.
- When "has_ticket_data" is false:
  * Technical / QA question: Provide a clear, insightful answer with concrete examples in "assistant_reply" using clean Markdown.
  * Greetings: Warmly introduce your capabilities in Aksora Bug Agent.
  * Vague hints: Ask 2-3 focused clarification questions to help them describe the issue (which page/module, what action triggered it, what was expected vs observed, error message).
- When "has_ticket_data" is true:
  * Provide a concise, helpful summary in "assistant_reply" (1-2 sentences) confirming the bug has been drafted, highlighting key detected fields (e.g. module, severity).

TEMPLATE FORMAT RULES:
- Title formula: "[ModuleName] - [Specific concise issue summary naming trigger and failure]"
  * Examples: "[Checkout] - Pay Now button becomes unresponsive after selecting QRIS"
  * Examples: "[Auth] - Session terminates unexpectedly when refreshing the profile page"
  * CRITICAL TITLE RULE: Determine and use the real, detected feature or module name (e.g. [Checkout], [Auth], [Orders], [Dashboard]). NEVER output literal meta-strings like "[Feature/Module Name]", "[Module Name]", or "[TBD]".
- Module: Clean name of the affected subsystem or feature (e.g. "Checkout", "Authentication", "Orders", "Dashboard").
- Bug Type: Exactly one of: "Functional" | "UI/UX" | "Performance" | "Validation" | "API" | "Security" | "Compatibility". Default is "Functional".
- Preconditions: Clean prerequisites needed before triggering the bug (e.g. "User is logged in and cart contains at least 1 item") or "None".
- Steps to Reproduce:
  * Numbered deterministic user steps with concrete navigation and inputs:
    1. Navigate to ...
    2. Perform action ...
    3. Observe the failure.
  * (CRITICAL: Omit Steps to Reproduce completely if preset is "compact" or user requested no-steps).
- Expected Result: 1-2 sentences stating the correct or intended system behavior only (do NOT repeat steps).
- Actual Result: 1-2 sentences stating the exact failure or error observed (do NOT repeat steps).
- Severity: Exactly one of: "critical" | "high" | "medium" | "low". (Critical = crash/blocker/data loss, High = major feature broken, Medium = normal defect, Low = cosmetic/minor).
- Priority: Exactly one of: "P0" | "P1" | "P2" | "P3". (P0 = Blocker/Immediate, P1 = High, P2 = Medium, P3 = Low).
- Evidence: Exact URL from user input (BugSnap, Loom, Drive, error URL) or note about attached screenshot.

STRICT FORMAT PRESETS:
${
  preset === "compact"
    ? `STRICT FORMAT PRESET: Format Ringkas (Tanpa Steps). Omit Steps to Reproduce completely. Provide ONLY the problem summary and technical notes.`
    : preset === "technical"
    ? `STRICT FORMAT PRESET: Format Teknis. Focus on endpoint/API, HTTP status codes, payload, response error, and console/network logs.`
    : `STRICT FORMAT PRESET: Standard. Full standard format with numbered reproduction steps, expected and actual results.`
}

LANGUAGE & DEVELOPER-FRIENDLY INDONESIAN QA RULES:
Write all generated field contents (title, module, preconditions, stepsToReproduce, expectedResult, actualResult) AND "assistant_reply" in clear, professional language, matching the language the user is writing in (e.g. reply in Indonesian if the user writes in Indonesian).
WHEN WRITING IN INDONESIAN (STANDARD SOFTWARE ENGINEERING & QA IN INDONESIA):
1. Gaya Bahasa: Lugas, objektif, dan to the point agar developer langsung paham tanpa kebingungan.
2. Istilah Teknis: JANGAN terjemahkan istilah teknis baku software engineering menjadi terjemahan harfiah kaku (tetap gunakan istilah: endpoint, API, payload, response, UI/UX, crash, timeout, query, token, session, console error, network log, status code 4xx/500, dsb).
3. Format Judul (title):
   - Pola: "[NamaModul] - [Aksi/kondisi pemicu] menyebabkan [kegagalan spesifik/hasil teramati]"
   - Contoh: "[Checkout] - Tombol Bayar Sekarang tidak merespons setelah memilih metode QRIS"
4. Hasil yang Diharapkan (expectedResult): Maksimal 1-2 kalimat menyatakan perilaku sistem yang benar.
5. Hasil Aktual (actualResult): Maksimal 1-2 kalimat menyatakan kegagalan/error yang terjadi.

MULTIMODAL (IMAGE / SCREENSHOT):
When a screenshot or error image is provided:
1. Visually inspect error banners, crash traces, HTTP 4xx/5xx status codes, broken alignment, missing assets, or abnormal UI state.
2. Accurately transcribe exact error messages or code traces seen in the image into actualResult or technical notes.
3. Formulate reproduction steps leading to the screen shown in the image.

${customRules ? `USER CUSTOM RULES:\n${customRules}\n` : ""}

OUTPUT FORMAT:
Return ONLY a valid JSON object (no markdown code blocks, no \`\`\`json):
{
  "has_ticket_data": boolean,
  "chat_title": "Short 3-5 word topic title",
  "assistant_reply": "Conversational reply in the user's language",
  "project": "${project}",
  "module": "Detected module name (e.g. Checkout)",
  "bugType": "Functional",
  "title": "[ModuleName] - Clear concise bug title",
  "preconditions": "Prerequisites needed or None",
  "stepsToReproduce": "1. Step one\\n2. Step two\\n3. Step three",
  "expectedResult": "Expected outcome in 1-2 sentences",
  "actualResult": "Observed failure or error in 1-2 sentences",
  "severity": "high",
  "priority": "P1",
  "evidence": "URL or null",
  "suspectedCause": "Brief hypothesis or null"
}`;

  let latestImageBase64: string | undefined = undefined;
  let latestMimeType = "image/png";

  const conversationLines: string[] = [];
  if (activeDraft?.title) {
    conversationLines.push(
      `[ACTIVE BUG DRAFT]\nProject: ${activeDraft.project || project}\nModule: ${activeDraft.module || ""}\nBug Type: ${activeDraft.bugType || "Functional"}\nTitle: ${activeDraft.title}\nPreconditions: ${activeDraft.preconditions || "None"}\nSteps:\n${activeDraft.stepsToReproduce || ""}\nExpected Result: ${activeDraft.expectedResult || ""}\nActual Result: ${activeDraft.actualResult || ""}\nSeverity: ${activeDraft.severity || "medium"}\nPriority: ${activeDraft.priority || "P2"}\nEvidence: ${activeDraft.evidence || ""}\n---`
    );
  }

  for (let i = 0; i < chatHistory.length; i++) {
    const m = chatHistory[i];
    const rolePrefix = m.role === "assistant" ? "Assistant" : "User";
    const textPart = m.content ? `${rolePrefix}: ${m.content}` : "";
    if (textPart) conversationLines.push(textPart);

    if (m.imageBase64 && i === chatHistory.length - 1) {
      latestImageBase64 = m.imageBase64;
      if (m.mimeType) latestMimeType = m.mimeType;
    }
  }

  const userPrompt = conversationLines.join("\n\n");

  const res = await callLLM({
    provider: ai.provider,
    model: ai.model,
    apiKey: ai.apiKey,
    publicBaseUrl: ai.publicUrl,
    usage: ai.usage || { feature: "qa-agent:issue_agent" },
    systemPrompt,
    userPrompt,
    imageBase64: latestImageBase64,
    mimeType: latestMimeType,
    jsonMode: true,
    maxTokens: 2500,
  });

  const parsed = parseJsonSafe<Record<string, unknown>>(res.content, {});
  const hasTicketData = parsed.has_ticket_data === true;
  const chatTitle = String(parsed.chat_title || "Bug Draft").trim();
  const assistantReply = String(
    parsed.assistant_reply ||
      (hasTicketData ? "I have drafted the bug report based on your details." : "How can I help you report this bug?")
  ).trim();

  if (!hasTicketData) {
    return {
      hasTicketData: false,
      chatTitle,
      assistantReply,
      ticket: null,
    };
  }

  const rawSeverity = String(parsed.severity || "medium").toLowerCase().trim();
  const normalizedSeverity = ["critical", "high", "medium", "low"].includes(rawSeverity) ? rawSeverity : "medium";

  const rawPriority = String(parsed.priority || "P2").toUpperCase().trim();
  const normalizedPriority = ["P0", "P1", "P2", "P3"].includes(rawPriority) ? rawPriority : "P2";

  const rawBugType = String(parsed.bugType || "Functional").trim();
  const allowedBugTypes = ["Functional", "UI/UX", "Performance", "Validation", "API", "Security", "Compatibility"];
  const matchedBugType =
    allowedBugTypes.find((t) => t.toLowerCase() === rawBugType.toLowerCase()) || "Functional";

  const extractedUrl = String(payload.prompt || "").match(/https?:\/\/[^\s)]+/i)?.[0] || "";

  const ticket: IssueAgentTicketDraft = {
    project: String(parsed.project || project || "General").trim(),
    module: String(parsed.module || "").trim(),
    bugType: matchedBugType,
    title: String(parsed.title || "").trim(),
    preconditions: String(parsed.preconditions || "None").trim(),
    stepsToReproduce: String(parsed.stepsToReproduce || "").trim(),
    expectedResult: String(parsed.expectedResult || "").trim(),
    actualResult: String(parsed.actualResult || "").trim(),
    severity: normalizedSeverity,
    priority: normalizedPriority,
    evidence: String(parsed.evidence || extractedUrl || (latestImageBase64 ? "Attached screenshot" : "")).trim(),
    suspectedCause: parsed.suspectedCause ? String(parsed.suspectedCause).trim() : undefined,
  };

  return {
    hasTicketData: true,
    chatTitle,
    assistantReply,
    ticket,
  };
}
