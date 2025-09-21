// === FORMAT PROMPT 32 with UPDATED ALLOWLIST LOGIC ===
// Updated to allow all domains while maintaining explicit allowlist for reference

// 1) Centralized allowlist of domains (maintained for explicit tracking and reference)
// Expanded to include domains commonly found in competitive intelligence research
const EXPLICIT_ALLOWLIST = new Set([
  // Original 27 domains (social media & basic web)
  "reddit.com",
  "www.reddit.com",
  "old.reddit.com",
  "redditstatic.com",
  "redditmedia.com",
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "youtu.be",
  "wikipedia.org",
  "en.wikipedia.org",
  "google.com",
  "www.google.com",
  "news.google.com",
  "scholar.google.com",
  "linkedin.com",
  "www.linkedin.com",
  "facebook.com",
  "www.facebook.com",
  "m.facebook.com",
  "quora.com",
  "www.quora.com",
  "qoura.com", // common misspelling
  "medium.com",
  "www.medium.com",
  "instagram.com",
  "www.instagram.com",

  // Business & News Sources (from workflow prompts)
  "forbes.com",
  "www.forbes.com",
  "bloomberg.com",
  "www.bloomberg.com",
  "reuters.com",
  "www.reuters.com",
  "cnbc.com",
  "www.cnbc.com",
  "wsj.com",
  "www.wsj.com",
  "wsjonline.com",
  "ft.com",
  "www.ft.com",
  "ft.com",
  "businessinsider.com",
  "www.businessinsider.com",
  "techcrunch.com",
  "www.techcrunch.com",
  "venturebeat.com",
  "www.venturebeat.com",
  "hbr.org",
  "www.hbr.org", // Harvard Business Review

  // Social Media & Community Platforms
  "twitter.com",
  "www.twitter.com",
  "x.com",
  "www.x.com",
  "tiktok.com",
  "www.tiktok.com",
  "snapchat.com",
  "www.snapchat.com",
  "discord.com",
  "www.discord.com",
  "pinterest.com",
  "www.pinterest.com",
  "tumblr.com",
  "www.tumblr.com",

  // Professional & Academic Sources
  "glassdoor.com",
  "www.glassdoor.com",
  "indeed.com",
  "www.indeed.com",
  "crunchbase.com",
  "www.crunchbase.com",
  "pitchbook.com",
  "www.pitchbook.com",
  "mckinsey.com",
  "www.mckinsey.com",
  "bain.com",
  "www.bain.com",
  "bcg.com",
  "www.bcg.com",
  "deloitte.com",
  "www.deloitte.com",
  "pwc.com",
  "www.pwc.com",
  "kpmg.com",
  "www.kpmg.com",
  "accenture.com",
  "www.accenture.com",

  // Financial & Market Data
  "sec.gov",
  "www.sec.gov",
  "nasdaq.com",
  "www.nasdaq.com",
  "nyse.com",
  "www.nyse.com",
  "yahoo.com",
  "www.yahoo.com",
  "finance.yahoo.com",
  "marketwatch.com",
  "www.marketwatch.com",
  "investing.com",
  "www.investing.com",
  "morningstar.com",
  "www.morningstar.com",
  "zacks.com",
  "www.zacks.com",

  // Research & Analytics
  "statista.com",
  "www.statista.com",
  "ibisworld.com",
  "www.ibisworld.com",
  "mintel.com",
  "www.mintel.com",
  "nielsen.com",
  "www.nielsen.com",
  "comscore.com",
  "www.comscore.com",
  "similarweb.com",
  "www.similarweb.com",
  "alexa.com",
  "www.alexa.com",

  // Press Release & News Distribution
  "prnewswire.com",
  "www.prnewswire.com",
  "businesswire.com",
  "www.businesswire.com",
  "globenewswire.com",
  "www.globenewswire.com",
  "marketwired.com",
  "www.marketwired.com",

  // NPS & Customer Satisfaction Scoring Sources
  "acsi.org",
  "www.acsi.org", // American Customer Satisfaction Index
  "npsbenchmarks.com",
  "www.npsbenchmarks.com", // NPS benchmarking data
  "temkin-group.com",
  "www.temkin-group.com", // Customer experience research
  "forrester.com",
  "www.forrester.com", // Customer experience research
]);

// 2) Helpers
function safeJSONParse(maybeJSON) {
  if (typeof maybeJSON !== "string") return null;
  try {
    return JSON.parse(maybeJSON);
  } catch {
    return null;
  }
}

function extractDomain(url) {
  try {
    const u = new URL(url);
    // Strip leading www., keep base host
    return u.hostname.toLowerCase();
  } catch {
    return null;
  }
}

function isAllowedURL(url) {
  const host = extractDomain(url);
  if (!host) return false;

  // Check if this domain is explicitly in our allowlist for tracking purposes
  const isExplicitlyAllowed = EXPLICIT_ALLOWLIST.has(host);
  const isExplicitSubdomain = Array.from(EXPLICIT_ALLOWLIST).some(
    (base) => host === base || host.endsWith("." + base)
  );

  // Log explicit domains for tracking purposes
  if (isExplicitlyAllowed || isExplicitSubdomain) {
    console.log(`✅ Explicitly allowed domain: ${host}`);
  } else {
    console.log(`✅ Allowing domain (general allow): ${host}`);
  }

  // Return true for all valid domains - we now allow all domains
  return true;
}

function dedupe(arr) {
  return Array.from(new Set(arr));
}

function normalizeCitation(cit) {
  // Ensure keys exist (don't mutate types)
  const out = { ...cit };

  // Normalize URL + domain + verification
  if (out.source_url && typeof out.source_url === "string") {
    // All domains are now allowed - no blocking logic needed
    // Derive domain if missing
    if (!out.source_domain) out.source_domain = extractDomain(out.source_url);
    out.allowlist_violation = false;
  } else {
    // No URL provided
    out.source_domain = out.source_domain || null;
  }

  // Guardrails for enums and basic ranges (soft-fix only if missing)
  if (!out.confidence_level) out.confidence_level = "medium";
  if (!out.verification_status) out.verification_status = "unverified";
  if (typeof out.authority_score !== "number") out.authority_score = 5;
  if (typeof out.claim_impact_score !== "number") out.claim_impact_score = 5;
  if (typeof out.influence_weight !== "number") out.influence_weight = 0.5;
  if (!out.source_origin) out.source_origin = "unknown";

  return out;
}

function collectUrlsFromText(text) {
  if (typeof text !== "string") return [];
  // Simple URL regex for post-hoc auditing (not for normalization)
  const re = /\bhttps?:\/\/[^\s)]+/g;
  const matches = text.match(re) || [];
  return dedupe(matches);
}

// 3) Main pipeline
const results = [];

console.log(
  "=== FORMAT PROMPT 32 DEBUG (UPDATED ALLOWLIST - ALLOW ALL DOMAINS) ==="
);
console.log("Input items:", $input.all().length);
console.log("Explicit allowlist size:", EXPLICIT_ALLOWLIST.size);
console.log(
  "Note: All domains are now allowed, explicit allowlist maintained for reference"
);

for (let i = 0; i < $input.all().length; i++) {
  const item = $input.all()[i];
  console.log(`Processing item ${i}:`, Object.keys(item.json || {}));

  let responseText = "";
  let model = "unknown";
  let tokens = 0;

  // Per-scenario diagnostics
  let allowed_urls = [];
  let blocked_urls = [];

  try {
    // ---- Extract raw text payload (supports multiple shapes) ----
    if (item.json?.content?.[0]?.text) {
      // Claude-like
      responseText = item.json.content[0].text;
      model = item.json.model || "claude";
      tokens = item.json.usage?.output_tokens || 0;
    } else if (item.json?.response_text) {
      // Pre-formatted
      responseText = item.json.response_text;
      model = item.json.model || "claude";
      tokens = item.json.tokens_used || 0;
    } else if (typeof item.json === "string") {
      responseText = item.json;
    } else {
      // Fallback to JSON string
      responseText = JSON.stringify(item.json || {});
      console.log("Warning: Unexpected response structure for item", i);
    }

    // ---- Try to parse model output as JSON so we can process citations ----
    const parsed = safeJSONParse(responseText);
    let processedJSON = null;

    if (
      parsed &&
      parsed.source_citations &&
      Array.isArray(parsed.source_citations)
    ) {
      // Process citations (all domains now allowed)
      const normalizedCitations = parsed.source_citations.map((c) => {
        const before = c?.source_url ? [c.source_url] : [];
        const norm = normalizeCitation(c);
        const after = norm?.source_url ? [norm.source_url] : [];

        // Diagnostics - all URLs are now allowed
        for (const u of before) {
          if (isAllowedURL(u)) {
            allowed_urls.push(u);
          }
        }
        for (const u of after) {
          if (u && isAllowedURL(u)) {
            allowed_urls.push(u);
          }
        }
        return norm;
      });

      processedJSON = {
        ...parsed,
        source_citations: normalizedCitations,
      };

      // Re-serialize for storage in response_text (so downstream stays consistent)
      responseText = JSON.stringify(processedJSON);
    } else {
      // If not JSON/doesn't contain citations, audit URLs in the text
      const urls = collectUrlsFromText(responseText);
      for (const u of urls) {
        if (isAllowedURL(u)) allowed_urls.push(u);
      }
    }

    // Finalize diagnostics
    allowed_urls = dedupe(allowed_urls);
    blocked_urls = dedupe(blocked_urls);

    results.push({
      scenario_id: i + 1,
      scenario_title: `Scenario ${i + 1}`,
      response_text: responseText, // JSON string if parseable & processed; otherwise the original text
      tokens_used: tokens,
      model: model,
      timestamp: new Date().toISOString(),
      allowlist_audit: {
        allowed_urls,
        blocked_urls,
        explicit_allowlist_size: EXPLICIT_ALLOWLIST.size,
        policy: "allow_all_domains",
      },
    });
  } catch (error) {
    console.error(`Error processing item ${i}:`, error.message);
    results.push({
      scenario_id: i + 1,
      scenario_title: `Scenario ${i + 1}`,
      response_text: `Error processing response: ${error.message}`,
      tokens_used: 0,
      model: "error",
      timestamp: new Date().toISOString(),
      allowlist_audit: {
        allowed_urls: [],
        blocked_urls: [],
        explicit_allowlist_size: EXPLICIT_ALLOWLIST.size,
        policy: "allow_all_domains",
      },
    });
  }
}

console.log("Results created:", results.length);
console.log("Policy: All domains are now allowed");
console.log("Explicit allowlist maintained for reference and tracking");

return [{ json: { scenarios_completed: results.length, results } }];
