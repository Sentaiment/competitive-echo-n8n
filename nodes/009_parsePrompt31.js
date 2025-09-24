// Ensure Valid JSON (Prompt 31) — robust extractor for Claude in n8n
// Works with either the Anthropic Messages node or a raw HTTP Request node.

// Read AI response from first input
const aiResponse = $input.first().json;

// Try to read original metadata from second input (prompt preparation node)
let originalData = {};
try {
  originalData = $input.last().json || {};
} catch (e) {
  console.log("No second input available, using fallback metadata");
}

// Debug logging
console.log("=== INPUT DEBUGGING ===");
console.log("AI Response keys:", Object.keys(aiResponse));
console.log("Original data keys:", Object.keys(originalData));
console.log("Number of inputs:", $input.all().length);

// Preserve metadata from the original input
const originalMetadata = {
  whitelist: originalData.whitelist || [],
  business_context: originalData.business_context || {},
  system_content: originalData.system_content,
  user_content: originalData.user_content,
};

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

let txt = getText(aiResponse);

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

// Fallback: If no original metadata, try to extract from scenarios
let fallbackMetadata = {};
if (!originalMetadata.whitelist || originalMetadata.whitelist.length === 0) {
  console.log("No whitelist found, attempting to extract from scenarios");

  // Extract company names from the first scenario's user_query
  const firstScenario = obj.scenarios[0];
  if (firstScenario && firstScenario.user_query) {
    // Extract company names from the user query by finding the list after "at" or "for"
    const queryText = firstScenario.user_query;

    // Look for patterns like "at Company1, Company2, Company3" or "for Company1, Company2, Company3"
    const companyListMatch = queryText.match(/(?:at|for)\s+([^.]+)/);
    if (companyListMatch) {
      const companyList = companyListMatch[1];
      // Split by comma and clean up
      const companies = companyList
        .split(",")
        .map((name) => name.trim())
        .filter((name) => name.length > 0);

      if (companies.length > 0) {
        fallbackMetadata.whitelist = companies;
        console.log(
          "Extracted whitelist from scenarios:",
          fallbackMetadata.whitelist
        );
      }
    }
  }

  // Set basic business context - keep it minimal and generic
  fallbackMetadata.business_context = {
    industry: "General Business",
    contextual_focus: "competitive analysis and market positioning",
    brand_themes: ["value", "performance", "reliability"],
  };
}

// Merge parsed scenarios with original metadata (or fallback)
const output = {
  ...obj,
  ...originalMetadata,
  ...fallbackMetadata,
};

console.log("=== PROMPT 31 PARSER OUTPUT ===");
console.log("Scenarios parsed:", output.scenarios.length);
console.log("Whitelist preserved:", output.whitelist.length);
console.log("Whitelist contents:", output.whitelist);
console.log(
  "Business context keys:",
  Object.keys(output.business_context || {})
);
console.log("Full output keys:", Object.keys(output));
console.log("Original data keys:", Object.keys(originalData));

return [{ json: output }];
