// Enhanced Citation Formater - Parse Claude responses first
const items = $input.all();
console.log("=== CITATION FORMATER DEBUG ===");
console.log("Processing items:", items.length);

let allCitations = [];
let company = null;

// ============== helpers to coerce/normalize citations ==============
function toStr(v) {
  return (v == null ? "" : String(v)).trim();
}
function isHttpUrl(s) {
  const v = toStr(s);
  return /^https?:\/\//i.test(v);
}
function domainOf(u) {
  const s = toStr(u);
  if (!s) return "";
  try {
    return new URL(s).hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return s
      .replace(/^https?:\/\//i, "")
      .replace(/^www\./i, "")
      .split("/")[0]
      .toLowerCase();
  }
}
// Try to extract a bare domain from arbitrary text (without scheme)
function extractDomainFromText(text) {
  const s = toStr(text);
  if (!s) return "";
  const match = s.match(/\b([a-z0-9-]+\.)+[a-z]{2,}\b/i);
  if (match) return match[0].replace(/^www\./i, "").toLowerCase();
  return "";
}
// Client-agnostic: do not hardcode source-name → domain mappings
const KNOWN_SOURCE_DOMAINS = [];

// Client-agnostic defaults
function inferMetaFromTextAndDomain(text, dom) {
  const yearMatch = toStr(text).match(/\b(19|20)\d{2}\b/);
  const approxDate = yearMatch ? `${yearMatch[0]}-01-01` : null;
  return {
    publication_date: approxDate,
    author: null,
    author_credibility_score: 5,
    authority_score: 5,
    verification_status: dom ? "unverified" : "unverified",
    content_type: dom ? "professional" : "competitive_research",
  };
}
function coerceToCitationObjects(possibleCitations) {
  if (!Array.isArray(possibleCitations)) return [];
  return possibleCitations
    .filter((c) => c != null)
    .map((c) => {
      // Already an object with fields → pass through
      if (typeof c === "object") return c;

      // If string, convert to minimal citation object
      const text = toStr(c);
      const hasUrl = isHttpUrl(text);
      const url = hasUrl ? text : null;
      let dom = hasUrl
        ? domainOf(text)
        : text.includes(" ")
        ? null
        : domainOf(text);
      if (!dom) {
        const found = extractDomainFromText(text);
        if (found) dom = found;
      }
      if (!dom) {
        for (const hint of KNOWN_SOURCE_DOMAINS) {
          if (hint.test.test(text)) {
            dom = hint.domain;
            break;
          }
        }
      }
      const inferred = inferMetaFromTextAndDomain(text, dom);
      return {
        claim_text: `Source reference: ${text}`,
        claim_category: "competitive_analysis",
        claim_impact_score: Math.max(
          3,
          Math.min(9, inferred.authority_score || 5)
        ),
        source_type: dom ? "web_research" : "other",
        source_url: url,
        source_domain: dom || null,
        publication_date: inferred.publication_date,
        author: inferred.author,
        author_credibility_score: inferred.author_credibility_score,
        source_origin: dom ? "web_research" : "unknown",
        training_data_cutoff: "2025-01",
        authority_score: inferred.authority_score,
        verification_status: inferred.verification_status,
        content_type: inferred.content_type,
        bias_indicators: "unknown",
        cross_references: 0,
        confidence_level: "medium",
        supporting_evidence: text,
        real_time_indicators: [],
        brand_mention_type: "other",
        sentiment_direction: "neutral",
        influence_weight: 0.5,
        strategic_relevance: "other",
        actionability_score: 5,
        geographic_scope: "regional",
        time_sensitivity: "annual",
        tags: ["competitive_analysis"],
      };
    });
}

// Try to get company from workflow execution context first
try {
  if (typeof $workflow !== "undefined" && $workflow.execution) {
    const execution = $workflow.execution;
    if (execution.data && execution.data.nodes) {
      const parseGroupData = execution.data.nodes["003_parseGroupData"];
      if (
        parseGroupData &&
        parseGroupData.output &&
        parseGroupData.output.company
      ) {
        company = parseGroupData.output.company;
        console.log("Found company from workflow execution:", company);
      }
    }
  }
} catch (e) {
  console.log("Could not access workflow execution:", e.message);
}

items.forEach((item, index) => {
  console.log(`Processing item ${index}:`, Object.keys(item.json || {}));

  let parsedCitations = [];

  // Try to capture company from upstream items (fallback)
  try {
    const j = item.json || {};
    if (!company) company = j.report_metadata?.company || j.company || null;
  } catch {}

  // Handle Claude API response format
  if (item.json?.content?.[0]?.text) {
    try {
      const responseText = item.json.content[0].text;
      console.log("Found Claude response text");

      // Try to extract JSON from Claude response
      const jsonMatch =
        responseText.match(/```json\n([\s\S]*?)\n```/) ||
        responseText.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const extractedData = JSON.parse(jsonMatch[1] || jsonMatch[0]);
        if (extractedData.source_citations) {
          parsedCitations = coerceToCitationObjects(
            extractedData.source_citations
          );
        }
      }
    } catch (error) {
      console.error(`Error parsing item ${index}:`, error.message);
    }
  }

  // Handle direct citation arrays
  if (item.json?.source_citations) {
    parsedCitations = parsedCitations.concat(
      coerceToCitationObjects(item.json.source_citations)
    );
  }

  allCitations = allCitations.concat(parsedCitations);
});

console.log(`Total citations collected: ${allCitations.length}`);

// Normalization and de-duplication (small, safe defaults)
function normalizeCitation(raw) {
  const c = { ...(raw || {}) };

  // Normalize text fields
  c.claim_text =
    toStr(c.claim_text) ||
    (c.supporting_evidence ? toStr(c.supporting_evidence) : "");
  c.claim_category = toStr(c.claim_category) || "competitive_analysis";

  // Normalize numeric fields with bounds
  const toNumOr = (v, d) => (Number.isFinite(Number(v)) ? Number(v) : d);
  c.claim_impact_score = Math.max(
    1,
    Math.min(10, toNumOr(c.claim_impact_score, 5))
  );
  c.author_credibility_score = Math.max(
    1,
    Math.min(10, toNumOr(c.author_credibility_score, 5))
  );
  c.authority_score = Math.max(1, Math.min(10, toNumOr(c.authority_score, 5)));
  c.cross_references = Math.max(0, toNumOr(c.cross_references, 0));
  c.influence_weight = Math.max(
    0,
    Math.min(
      1,
      Number.isFinite(Number(c.influence_weight))
        ? Number(c.influence_weight)
        : 0.5
    )
  );

  // Normalize source url/domain
  const urlStr = toStr(c.source_url);
  const validUrl = urlStr && isHttpUrl(urlStr) ? urlStr : null;
  let dom = toStr(c.source_domain);
  if (!dom && validUrl) dom = domainOf(validUrl);
  if (!dom && c.supporting_evidence)
    dom = extractDomainFromText(c.supporting_evidence) || dom;
  if (!dom && c.claim_text) dom = extractDomainFromText(c.claim_text) || dom;
  c.source_url = validUrl; // keep null if invalid
  c.source_domain = dom || null;

  // Publication date: keep YYYY-MM-DD if present, else try to infer a year
  const pub = toStr(c.publication_date);
  if (!pub) {
    const inferred = inferMetaFromTextAndDomain(
      c.claim_text || c.supporting_evidence || "",
      dom
    );
    c.publication_date = inferred.publication_date;
    c.content_type = c.content_type || inferred.content_type;
    c.verification_status =
      c.verification_status || inferred.verification_status;
  } else {
    c.publication_date = pub;
  }

  // Arrays and enums
  c.real_time_indicators = Array.isArray(c.real_time_indicators)
    ? c.real_time_indicators
    : [];
  c.tags = Array.isArray(c.tags) ? c.tags : ["competitive_analysis"];
  const dir = toStr(c.sentiment_direction).toLowerCase();
  c.sentiment_direction = ["positive", "neutral", "negative"].includes(dir)
    ? dir
    : "neutral";

  // Origins/types
  c.source_origin =
    c.source_origin ||
    (validUrl || dom ? "web_research" : toStr(c.source_origin) || "unknown");
  c.source_type = c.source_type || (validUrl || dom ? "web_research" : "other");
  c.content_type = c.content_type || "competitive_research";
  c.training_data_cutoff = c.training_data_cutoff || "2025-01";

  return c;
}

// De-duplicate by (claim_text + source_domain)
const dedupeMap = new Map();
for (const raw of allCitations) {
  const norm = normalizeCitation(raw);
  const key = `${norm.claim_text}::${norm.source_domain || ""}`.toLowerCase();
  if (!dedupeMap.has(key)) dedupeMap.set(key, norm);
}
const normalizedCitations = Array.from(dedupeMap.values());
console.log(`Normalized citations: ${normalizedCitations.length}`);

return [
  {
    json: {
      ...(company ? { company } : {}),
      enhanced_citations: normalizedCitations, // Make sure this key is consistent
      processing_metadata: {
        total_citations: normalizedCitations.length,
        processing_timestamp: new Date().toISOString(),
        source: "citation_formater_fixed",
      },
    },
  },
];
