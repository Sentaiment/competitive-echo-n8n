// Fixed Data Sources & Citations DB
// Use this AFTER the Citation Response Formatter
// Now handles multiple inputs: Citation Formater (index 0) and Prompt 32 Formatter (index 1)

const items = $input.all().map((i) => i.json);

console.log("=== CITATIONS DB DEBUG ===");
console.log("Items received:", items.length);

// Log detailed input structure
items.forEach((item, index) => {
  console.log(`\n--- Input Item ${index} ---`);
  console.log("Keys:", Object.keys(item || {}));
  console.log("Has source_citations:", !!item?.source_citations);
  console.log("Has enhanced_citations:", !!item?.enhanced_citations);
  console.log("Has data_sources:", !!item?.data_sources);
  console.log("Has enhanced_sources:", !!item?.enhanced_sources);
  console.log(
    "Sample data:",
    JSON.stringify(item, null, 2).substring(0, 500) + "..."
  );
});

/** ========== utils ========== **/
const ORIGINS = new Set([
  "training_data",
  "real_time_search",
  "hybrid",
  "web_research",
  "company_filing",
  "unknown",
]);

function toStr(v) {
  return (v == null ? "" : String(v)).trim();
}
function normUrl(u) {
  const s = toStr(u);
  if (!s) return "";
  try {
    const url = new URL(s);
    url.hash = "";
    for (const p of Array.from(url.searchParams.keys())) {
      if (/^utm_|^fbclid$|^gclid$|^mc_cid$|^mc_eid$|^ref$|^ref_src$/i.test(p))
        url.searchParams.delete(p);
    }
    return url.toString();
  } catch {
    return s.toLowerCase();
  }
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
function shortUrl(u) {
  const s = toStr(u);
  if (!s) return "";
  try {
    const url = new URL(s);
    return `${url.hostname.replace(/^www\./, "")}${url.pathname}`;
  } catch {
    return s;
  }
}
function uniqBy(arr, keyFn) {
  const m = new Map();
  for (const x of arr) {
    const k = keyFn(x);
    if (!m.has(k)) m.set(k, x);
  }
  return Array.from(m.values());
}
function hashCitation(c) {
  return `${toStr(c.claim_text).toLowerCase()}§${normUrl(c.source_url)}`;
}
function safeGetFromNode(nodeName, selectorFn) {
  try {
    const n = $(nodeName);
    if (!n) return undefined;
    const j = n.first()?.json;
    return selectorFn ? selectorFn(j) : j;
  } catch {
    return undefined;
  }
}

const calculateSourceQuality = (source, citations) => {
  let qualityScore = 0;
  if (source.origin === "real_time_search") qualityScore += 3;
  else if (source.origin === "hybrid") qualityScore += 2;
  else qualityScore += 1;

  if (source.source_name && source.source_name.startsWith("http"))
    qualityScore += 2;

  const relatedCitations = citations.filter(
    (c) => c.source_url === source.source_name
  );
  if (relatedCitations.length > 0) {
    const avgCredibility =
      relatedCitations.reduce(
        (sum, c) => sum + (c.author_credibility_score || 0),
        0
      ) / relatedCitations.length;
    qualityScore += Math.floor(avgCredibility / 2);
  }

  return Math.min(10, qualityScore);
};

const generateQualityReport = (sources, citations) => {
  if (sources.length === 0 || citations.length === 0) {
    return `### Source Quality Metrics\nNo sources or citations found after formatting.\n\n`;
  }

  const realTimeSources = sources.filter(
    (s) => s.origin === "real_time_search"
  ).length;
  const hybridSources = sources.filter((s) => s.origin === "hybrid").length;
  const verifiedCitations = citations.filter(
    (c) => String(c.verification_status || "").toLowerCase() === "verified"
  ).length;
  const highAuthority = citations.filter(
    (c) => (c.authority_score || 0) >= 8
  ).length;
  const withUrls = citations.filter(
    (c) => c.source_url && c.source_url.startsWith("http")
  ).length;

  return `### Source Quality Metrics
- Real-time sources: ${realTimeSources}/${sources.length} (${Math.round(
    (realTimeSources / sources.length) * 100
  )}%)
- Hybrid sources: ${hybridSources}/${sources.length} (${Math.round(
    (hybridSources / sources.length) * 100
  )}%)
- Verified citations: ${verifiedCitations}/${citations.length} (${Math.round(
    (verifiedCitations / citations.length) * 100
  )}%)
- High authority (8+): ${highAuthority}/${citations.length} (${Math.round(
    (highAuthority / citations.length) * 100
  )}%)
- With accessible URLs: ${withUrls}/${citations.length} (${Math.round(
    (withUrls / citations.length) * 100
  )}%)

`;
};

/** ========== derive company safely (no unexecuted-node errors) ========== **/
const company =
  safeGetFromNode("Parse & Group Data", (j) => j?.company) ||
  safeGetFromNode("Merge & Rollups", (j) =>
    Array.isArray(j?.whitelist) ? j.whitelist[0] : undefined
  ) ||
  items.find((x) => x.company)?.company ||
  items.find((x) => x.report_metadata?.company)?.report_metadata?.company ||
  items.find((x) => x.company_name)?.company_name ||
  items.find((x) => x.target_company)?.target_company ||
  // Try to extract from scenarios if available
  (() => {
    for (const item of items) {
      if (
        item.scenarios &&
        Array.isArray(item.scenarios) &&
        item.scenarios.length > 0
      ) {
        const firstScenario = item.scenarios[0];
        if (
          firstScenario.top_competitors &&
          Array.isArray(firstScenario.top_competitors) &&
          firstScenario.top_competitors.length > 0
        ) {
          return firstScenario.top_competitors[0].company;
        }
      }
      if (
        item.scenario_rankings &&
        Array.isArray(item.scenario_rankings) &&
        item.scenario_rankings.length > 0
      ) {
        const firstScenario = item.scenario_rankings[0];
        if (
          firstScenario.competitors_ranked &&
          Array.isArray(firstScenario.competitors_ranked) &&
          firstScenario.competitors_ranked.length > 0
        ) {
          return firstScenario.competitors_ranked[0].company;
        }
      }
    }
    return null;
  })() ||
  // Extract from form data or workflow context
  (() => {
    // Look for company name from form input or workflow context
    for (const item of items) {
      // Check for company name in various form/input structures
      if (item.company_name) return item.company_name;
      if (item.company) return item.company;
      if (item.target_company) return item.target_company;
      if (item.form_data && item.form_data.company_name)
        return item.form_data.company_name;
      if (item.form_data && item.form_data.company)
        return item.form_data.company;
      if (item.workflow_data && item.workflow_data.company_name)
        return item.workflow_data.company_name;
      if (item.workflow_data && item.workflow_data.company)
        return item.workflow_data.company;

      // Check for company in metadata
      if (item.metadata && item.metadata.company_name)
        return item.metadata.company_name;
      if (item.metadata && item.metadata.company) return item.metadata.company;

      // Check for company in processing metadata
      if (item.processing_metadata && item.processing_metadata.company_name)
        return item.processing_metadata.company_name;
      if (item.processing_metadata && item.processing_metadata.company)
        return item.processing_metadata.company;

      // Check for form trigger data structure
      if (item.form_data && item.form_data.values) {
        const companyField = item.form_data.values.find(
          (field) =>
            field.fieldLabel === "Company Name" ||
            field.name === "company_name" ||
            field.key === "company_name"
        );
        if (companyField && companyField.value) return companyField.value;
      }

      // Check for direct form values
      if (item.form_values && item.form_values.company_name)
        return item.form_values.company_name;
      if (item.form_values && item.form_values.company)
        return item.form_values.company;
    }
    return null;
  })() ||
  // Try to get from workflow execution context
  (() => {
    try {
      // Check if we can access workflow execution data
      if (typeof $workflow !== "undefined" && $workflow.execution) {
        const execution = $workflow.execution;
        if (execution.data && execution.data.form_data) {
          const formData = execution.data.form_data;
          if (formData.company_name) return formData.company_name;
          if (formData.company) return formData.company;
        }
      }
    } catch (e) {
      console.log("Could not access workflow context:", e.message);
    }
    return null;
  })() ||
  // Try to get from workflow execution data (look for parse group data results)
  (() => {
    try {
      // Check if we can access the results from 003_parseGroupData
      if (typeof $workflow !== "undefined" && $workflow.execution) {
        const execution = $workflow.execution;
        // Look for data from the parse group data node
        if (execution.data && execution.data.nodes) {
          const parseGroupData = execution.data.nodes["003_parseGroupData"];
          if (parseGroupData && parseGroupData.output) {
            const output = parseGroupData.output;
            if (output.company) {
              console.log(
                "Found company from workflow execution parse group data:",
                output.company
              );
              return output.company;
            }
          }
        }
      }
    } catch (e) {
      console.log(
        "Could not access workflow execution parse group data:",
        e.message
      );
    }
    return null;
  })() ||
  // Try to get from Parse & Group Data node output (company field)
  (() => {
    try {
      // Look for company data that might have been passed through from 003_parseGroupData
      for (const item of items) {
        // Check if this item has company data from the parse step
        if (
          item.company &&
          typeof item.company === "string" &&
          item.company.trim()
        ) {
          console.log("Found company from parse group data:", item.company);
          return item.company.trim();
        }
        // Check for company in any nested data structures
        if (item.parsed_data && item.parsed_data.company) {
          console.log(
            "Found company in parsed_data:",
            item.parsed_data.company
          );
          return item.parsed_data.company;
        }
        if (item.business_context && item.business_context.company) {
          console.log(
            "Found company in business_context:",
            item.business_context.company
          );
          return item.business_context.company;
        }
        // Check for company in whitelist (first item is usually the target company)
        if (
          item.whitelist &&
          Array.isArray(item.whitelist) &&
          item.whitelist.length > 0
        ) {
          console.log("Found company in whitelist:", item.whitelist[0]);
          return item.whitelist[0];
        }
      }
    } catch (e) {
      console.log("Could not access parse group data:", e.message);
    }
    return null;
  })() ||
  // Try to extract company name from citation data (look for company mentions)
  (() => {
    try {
      // Look through citations for company mentions
      for (const item of items) {
        if (item.enhanced_citations && Array.isArray(item.enhanced_citations)) {
          // Look for citations that mention specific companies
          const companyMentions = item.enhanced_citations
            .map((c) => c.claim_text)
            .filter((text) => text && typeof text === "string")
            .join(" ")
            .toLowerCase();

          // Check for common company patterns (generic approach)
          // Extract first capitalized company name found in citations
          const companyNameMatch = companyMentions.match(
            /\b[A-Z][a-zA-Z\s&]+(?:Inc|Corp|Company|LLC|Ltd|Group|Systems|Solutions|Technologies|Services|Enterprises)\b/
          );
          if (companyNameMatch) {
            return companyNameMatch[0];
          }

          // Fallback: look for any capitalized multi-word company names
          const genericCompanyMatch = companyMentions.match(
            /\b[A-Z][a-zA-Z\s&]{2,}\b/
          );
          if (genericCompanyMatch) {
            return genericCompanyMatch[0];
          }
        }
      }
    } catch (e) {
      console.log("Could not extract company from citations:", e.message);
    }
    return null;
  })() ||
  "Unknown Company";

console.log("Company determination debug:");
console.log("- Items count:", items.length);
console.log(
  "- Items keys:",
  items.map((item) => Object.keys(item || {}))
);
console.log("- Looking for company in items...");
items.forEach((item, index) => {
  console.log(`  Item ${index}:`, {
    hasCompany: !!item.company,
    hasReportMetadata: !!item.report_metadata,
    reportMetadataCompany: item.report_metadata?.company,
    hasCompanyName: !!item.company_name,
    hasTargetCompany: !!item.target_company,
    hasScenarios: !!item.scenarios,
    hasScenarioRankings: !!item.scenario_rankings,
    hasFormData: !!item.form_data,
    hasFormValues: !!item.form_values,
    hasWorkflowData: !!item.workflow_data,
    hasMetadata: !!item.metadata,
    hasProcessingMetadata: !!item.processing_metadata,
  });

  // Log the actual structure of the first item for debugging
  if (index === 0) {
    console.log("  First item full structure:", JSON.stringify(item, null, 2));
  }
});
console.log("Final company determined:", company);

/** ========== collect data from formatted inputs ========== **/
let allSources = [];
let allCites = [];

for (const [index, it] of items.entries()) {
  console.log(`\nProcessing formatted item ${index}:`);
  console.log("Keys:", Object.keys(it));

  // Handle different input types
  if (it.processing_type === "prompt_32_formatter") {
    // This is from Prompt 32 Formatter
    console.log("Processing Prompt 32 Formatter input");

    // Extract sources and citations from Prompt 32 Formatter output
    const citations = it.source_citations || it.enhanced_citations || [];
    const sources = it.data_sources || it.enhanced_sources || [];

    if (Array.isArray(citations)) {
      console.log(`Found ${citations.length} citations from Prompt 32`);
      allCites = allCites.concat(citations);
    }

    if (Array.isArray(sources)) {
      console.log(`Found ${sources.length} sources from Prompt 32`);
      allSources = allSources.concat(sources);
    }

    // Also check if there are sources/citations in the scenario data
    if (it.scenario_rankings && Array.isArray(it.scenario_rankings)) {
      for (const scenario of it.scenario_rankings) {
        if (scenario.sources && Array.isArray(scenario.sources)) {
          console.log(
            `Found ${scenario.sources.length} sources in scenario ${scenario.scenario_id}`
          );
          allSources = allSources.concat(scenario.sources);
        }
        if (scenario.citations && Array.isArray(scenario.citations)) {
          console.log(
            `Found ${scenario.citations.length} citations in scenario ${scenario.scenario_id}`
          );
          allCites = allCites.concat(scenario.citations);
        }
      }
    }
  } else {
    // This is from Citation Formater (original logic)
    console.log("Processing Citation Formater input");

    // Collect sources and citations from formatter
    // Handle both direct access and json-wrapped access
    const citations =
      it.source_citations ||
      it.enhanced_citations ||
      it.json?.source_citations ||
      it.json?.enhanced_citations;
    const sources =
      it.data_sources ||
      it.enhanced_sources ||
      it.json?.data_sources ||
      it.json?.enhanced_sources;

    if (Array.isArray(citations)) {
      console.log(`Found ${citations.length} citations from Citation Formater`);
      allCites = allCites.concat(citations);
    }

    if (Array.isArray(sources)) {
      console.log(`Found ${sources.length} sources from Citation Formater`);
      allSources = allSources.concat(sources);
    }

    const extractionMethod = it.extraction_method || it.json?.extraction_method;
    if (extractionMethod) {
      console.log(`Extraction method: ${extractionMethod}`);
    }
  }
}

console.log("\nTotal collected:");
console.log("- Sources:", allSources.length);
console.log("- Citations:", allCites.length);

// Early return if no data
if (allCites.length === 0 && allSources.length === 0) {
  console.log("No data found - returning empty result");
  return [
    {
      json: {
        company,
        sources_table_rows: [],
        citations_table_rows: [],
        top_sources_by_authority: [],
        top_domains_by_citations: [],
        unresolved: {
          sources_invalid_origin: [],
          sources_origin_conf_out_of_range: [],
          citations_cutoff_conflict: [],
          citations_missing_min_fields: [],
          citations_incomplete_fields: [],
          citations_orphan_urls: [],
        },
        markdown_preview:
          "### No Data Found\nThe formatter found no citations or sources in the Claude responses.",
        summary_stats: {
          total_sources: 0,
          total_citations: 0,
          real_time_sources: 0,
          verified_citations: 0,
          high_authority_citations: 0,
          citations_with_urls: 0,
        },
        debug_info: {
          input_items_processed: items.length,
          data_extraction_attempts: "no_data_found",
        },
      },
    },
  ];
}

// Generate sources from citations if none exist
if (allSources.length === 0 && allCites.length > 0) {
  console.log("Generating sources from citations");
  const sourceMap = new Map();
  allCites.forEach((c) => {
    if (c.source_url) {
      const key = normUrl(c.source_url);
      if (!sourceMap.has(key)) {
        sourceMap.set(key, {
          id: `gen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          source_name: c.source_url,
          title: null,
          publisher: c.source_domain || domainOf(c.source_url),
          author: c.author || null,
          published_date: c.publication_date || null,
          date_accessed: new Date().toISOString().split("T")[0],
          authoritative: c.authority_score >= 8,
          origin: c.source_origin || "unknown",
          origin_confidence: 0.7,
          origin_notes: "Generated from citation data",
          authority_score: c.authority_score, // carry if present
        });
      }
    }
  });
  allSources = Array.from(sourceMap.values());
  console.log("Generated", allSources.length, "sources");
}

// Normalize sources
allSources = allSources
  .filter((s) => s && (s.id || s.source_name))
  .map((s) => ({
    id:
      toStr(s.id) ||
      `source_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    source_name: toStr(s.source_name) || null,
    title: toStr(s.title) || null,
    publisher: toStr(s.publisher) || null,
    author: toStr(s.author) || null,
    published_date: toStr(s.published_date) || null,
    date_accessed: toStr(s.date_accessed) || null,
    authoritative: !!s.authoritative,
    origin: ORIGINS.has(toStr(s.origin)) ? toStr(s.origin) : "unknown",
    origin_confidence: Number.isFinite(s.origin_confidence)
      ? Math.max(0, Math.min(1, s.origin_confidence))
      : 0.5,
    origin_notes: toStr(s.origin_notes) || null,
    // optional numeric authority if upstream provided; fallback later
    authority_score: Number.isFinite(s.authority_score)
      ? s.authority_score
      : undefined,
  }));

// Dedupe sources
allSources = uniqBy(allSources, (s) => s.id || `url:${normUrl(s.source_name)}`);

// Normalize citations with better defaults
allCites = allCites
  .filter((c) => c && (toStr(c.claim_text) || toStr(c.source_url)))
  .map((c) => ({
    claim_text: toStr(c.claim_text),
    claim_category: toStr(c.claim_category) || "other",
    claim_impact_score: Number.isFinite(c.claim_impact_score)
      ? c.claim_impact_score
      : 5,
    source_type: toStr(c.source_type) || "other",
    source_url: toStr(c.source_url) || null,
    source_domain:
      toStr(c.source_domain) || (c.source_url ? domainOf(c.source_url) : null),
    publication_date: toStr(c.publication_date) || null,
    author: toStr(c.author) || "Unknown",
    author_credibility_score: Number.isFinite(c.author_credibility_score)
      ? c.author_credibility_score
      : 5,
    source_origin: ORIGINS.has(toStr(c.source_origin))
      ? toStr(c.source_origin)
      : "unknown",
    training_data_cutoff: toStr(c.training_data_cutoff) || "2025-01",
    authority_score: Number.isFinite(c.authority_score) ? c.authority_score : 5,
    verification_status: toStr(c.verification_status) || "unverified",
    content_type: toStr(c.content_type) || "professional",
    bias_indicators: toStr(c.bias_indicators) || "unknown",
    cross_references: Number.isFinite(c.cross_references)
      ? c.cross_references
      : 0,
    confidence_level: toStr(c.confidence_level) || "medium",
    supporting_evidence:
      toStr(c.supporting_evidence) || "No additional evidence provided",
    real_time_indicators: Array.isArray(c.real_time_indicators)
      ? c.real_time_indicators
      : [],
    brand_mention_type: toStr(c.brand_mention_type) || "other",
    sentiment_direction: toStr(c.sentiment_direction) || "neutral",
    influence_weight: Number.isFinite(c.influence_weight)
      ? Math.max(0, Math.min(1, c.influence_weight))
      : 0.5,
    tags: Array.isArray(c.tags) ? c.tags : [],
  }));

// Dedupe citations
allCites = uniqBy(allCites, hashCitation);

console.log("After normalization:");
console.log("- Sources:", allSources.length);
console.log("- Citations:", allCites.length);

// Create final tables
const sources_table_rows = allSources.map((s) => ({
  id: s.id,
  source_name: s.source_name,
  source_domain: s.source_name ? domainOf(s.source_name) : null,
  title: s.title,
  publisher: s.publisher,
  author: s.author,
  published_date: s.published_date,
  date_accessed: s.date_accessed,
  authoritative: s.authoritative,
  origin: s.origin,
  origin_confidence: s.origin_confidence,
  origin_notes: s.origin_notes,
  authority_score: Number.isFinite(s.authority_score)
    ? s.authority_score
    : s.authoritative
    ? 8
    : null,
  quality_score: calculateSourceQuality(s, allCites),
}));

const citations_table_rows = allCites.map((c) => ({
  claim_text: c.claim_text,
  claim_category: c.claim_category,
  claim_impact_score: c.claim_impact_score,
  source_type: c.source_type,
  source_url: c.source_url,
  source_domain: c.source_domain,
  publication_date: c.publication_date,
  author: c.author,
  author_credibility_score: c.author_credibility_score,
  source_origin: c.source_origin,
  training_data_cutoff: c.training_data_cutoff,
  authority_score: c.authority_score,
  verification_status: c.verification_status,
  content_type: c.content_type,
  bias_indicators: c.bias_indicators,
  cross_references: c.cross_references,
  confidence_level: c.confidence_level,
  supporting_evidence: c.supporting_evidence,
  real_time_indicators: JSON.stringify(c.real_time_indicators || []),
  brand_mention_type: c.brand_mention_type,
  sentiment_direction: c.sentiment_direction,
  influence_weight: c.influence_weight,
  tags: JSON.stringify(c.tags || []),
}));

/** ========== aggregates requested ========== **/
// Top sources by authority (fallback: authoritative→8); then by quality_score
const top_sources_by_authority = sources_table_rows
  .slice()
  .sort((a, b) => {
    const aa = (b.authority_score || 0) - (a.authority_score || 0);
    if (aa !== 0) return aa;
    return (b.quality_score || 0) - (a.quality_score || 0);
  })
  .slice(0, 10)
  .map((s) => ({
    id: s.id,
    publisher: s.publisher || s.source_domain || "N/A",
    title: s.title || "",
    url: s.source_name || "",
    origin: s.origin || "unknown",
    authority_score: s.authority_score ?? null,
    quality_score: s.quality_score,
  }));

// Top domains by number of citations
const domainCounts = {};
for (const c of citations_table_rows) {
  const d =
    c.source_domain ||
    (c.source_url ? domainOf(c.source_url) : "unknown") ||
    "unknown";
  domainCounts[d] = (domainCounts[d] || 0) + 1;
}
const top_domains_by_citations = Object.entries(domainCounts)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 10)
  .map(([domain, count]) => ({ domain, citations: count }));

// Generate preview
let md = generateQualityReport(sources_table_rows, citations_table_rows);
md += `### Aggregated Sources (${sources_table_rows.length})\n`;
md += `| id | origin | quality | auth | publisher | title | URL |\n|---|---|---:|---:|---|---|---|\n`;
for (const s of sources_table_rows) {
  const auth = s.authoritative ? "✔︎" : "—";
  md += `| \`${s.id}\` | ${s.origin} | ${s.quality_score} | ${auth} | ${toStr(
    s.publisher
  )} | ${toStr(s.title)} | ${shortUrl(s.source_name)} |\n`;
}
md += `\n### Aggregated Citations (${citations_table_rows.length})\n`;
md += `| impact | origin | authority | domain | claim |\n|---:|---|---:|---|---|\n`;
for (const c of citations_table_rows) {
  md += `| ${c.claim_impact_score} | ${c.source_origin} | ${
    c.authority_score
  } | ${toStr(c.source_domain)} | ${c.claim_text.substring(0, 50)}... |\n`;
}

console.log("=== FINAL RESULTS ===");
console.log("Company:", company);
console.log("Sources:", sources_table_rows.length);
console.log("Citations:", citations_table_rows.length);

return [
  {
    json: {
      company, // ← included for downstream Notion title
      sources_table_rows,
      citations_table_rows,
      top_sources_by_authority, // ← aggregate
      top_domains_by_citations, // ← aggregate
      unresolved: {
        sources_invalid_origin: [],
        sources_origin_conf_out_of_range: [],
        citations_cutoff_conflict: [],
        citations_missing_min_fields: [],
        citations_incomplete_fields: [],
        citations_orphan_urls: [],
      },
      markdown_preview: md,
      summary_stats: {
        total_sources: sources_table_rows.length,
        total_citations: citations_table_rows.length,
        real_time_sources: sources_table_rows.filter(
          (s) => s.origin === "real_time_search"
        ).length,
        verified_citations: citations_table_rows.filter(
          (c) =>
            String(c.verification_status || "").toLowerCase() === "verified"
        ).length,
        high_authority_citations: citations_table_rows.filter(
          (c) => (c.authority_score || 0) >= 8
        ).length,
        citations_with_urls: citations_table_rows.filter(
          (c) => c.source_url && c.source_url.startsWith("http")
        ).length,
      },
      debug_info: {
        input_items_processed: items.length,
        data_extraction_success: true,
        sources_found: allSources.length,
        citations_found: allCites.length,
      },
    },
  },
];
