// Ensure Valid JSON (Prompt 31) — robust extractor for Claude in n8n
// Works with either the Anthropic Messages node or a raw HTTP Request node.

const resp = $input.first().json; // <-- read from upstream input

function getText(r) {
  if (!r) return "";
  if (typeof r === "string") return r;

  // Anthropic Messages (n8n node) common shapes
  if (r.content?.[0]?.text) return r.content[0].text; // { content: [{text}] }
  if (r.response?.content?.[0]?.text) return r.response.content[0].text; // { response: { content: [{text}] } }
  if (r.messages?.[0]?.content?.[0]?.text) return r.messages[0].content[0].text;

  // Raw HTTP Request → parsed JSON body (Anthropic /v1/messages)
  if (r?.type === "message" && r.content?.[0]?.text) return r.content[0].text;

  // OpenAI-ish fallback (not expected here, but safe)
  if (r?.choices?.[0]?.message?.content) return r.choices[0].message.content;
  if (r?.data?.[0]?.message?.content) return r.data[0].message.content;

  // Last resort: stringify
  return JSON.stringify(r);
}

let txt = getText(resp);

// Strip accidental code fences if any
txt = String(txt)
  .replace(/^```(?:json)?\s*/i, "")
  .replace(/```$/m, "");

// Find fenced JSON
const m = txt.match(/<<JSON_START>>\s*([\s\S]*?)\s*<<JSON_END>>/);
if (!m) {
  throw new Error(
    "JSON markers not found. First 300 chars: " + txt.slice(0, 300)
  );
}

// Parse and clean control chars if necessary
let obj;
try {
  obj = JSON.parse(m[1]);
} catch {
  const safe = m[1].replace(/[\u0000-\u001F\u007F]/g, "");
  obj = JSON.parse(safe);
}

// Minimal schema checks
if (!Array.isArray(obj.scenarios)) {
  throw new Error("Missing 'scenarios' array.");
}
if (obj.scenarios.length !== 12) {
  throw new Error(
    `Expected 12 scenarios, got ${obj.scenarios.length}. Increase max_tokens or shorten scenario fields.`
  );
}
if (!Array.isArray(obj.source_citations)) {
  throw new Error("Missing 'source_citations' array (should be []).");
}

return [{ json: obj }];
