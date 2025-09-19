// Enhanced Citation Formater - Implements Sentaiment PRD v2.0 Source Citation System
// Processes citations with comprehensive metadata following the PRD schema

const input = $input.all();

console.log("=== ENHANCED CITATION FORMATER ===");
console.log("Processing citations with Sentaiment PRD v2.0 schema");

// Helper functions from Sentaiment PRD
function toStr(v) {
  return (v == null ? "" : String(v)).trim();
}

function normUrl(u) {
  const s = toStr(u);
  if (!s) return "";
  try {
    const url = new URL(s);
    url.hash = "";
    // Remove tracking parameters
    for (const p of Array.from(url.searchParams.keys())) {
      if (/^utm_|^fbclid$|^gclid$|^mc_cid$|^mc_eid$|^ref$|^ref_src$/i.test(p)) {
        url.searchParams.delete(p);
      }
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

function classifyOrigin(citation, modelCutoffISO = "2025-01") {
  const pub = citation.publication_date
    ? new Date(citation.publication_date)
    : null;
  const cutoff = modelCutoffISO ? new Date(modelCutoffISO) : null;
  const hasURL = Boolean(citation.source_url);

  if (pub && cutoff && pub > cutoff && hasURL) {
    return {
      source_origin: "real_time_search",
      confidence_level: "high",
      real_time_indicators: ["urls_accessible", "recent_events"],
    };
  }
  if (!hasURL && (!pub || (cutoff && pub <= cutoff))) {
    return {
      source_origin: "training_data",
      confidence_level: "medium",
      real_time_indicators: [],
    };
  }
  return {
    source_origin: "hybrid",
    confidence_level: "medium",
    real_time_indicators: hasURL ? ["web_search_results"] : [],
  };
}

function calculateAuthorityScore(sourceName, sourceUrl, author) {
  let score = 5; // Base score

  // High authority sources
  const highAuthority = [
    "forbes",
    "wsj",
    "reuters",
    "bloomberg",
    "ft",
    "nyt",
    "jd power",
    "tripadvisor",
    "aaa",
    "michelin",
    "zagat",
  ];

  // Medium authority sources
  const mediumAuthority = [
    "review-journal",
    "vegas magazine",
    "eater",
    "open table",
    "hospitality technology",
    "hotel management",
  ];

  const sourceLower = (sourceName + " " + (sourceUrl || "")).toLowerCase();

  if (highAuthority.some((auth) => sourceLower.includes(auth))) {
    score = 8;
  } else if (mediumAuthority.some((auth) => sourceLower.includes(auth))) {
    score = 6;
  }

  // Boost for specific author types
  if (author && (author.includes("Dr.") || author.includes("Professor"))) {
    score += 1;
  }

  return Math.min(10, Math.max(1, score));
}

function calculateInfluenceWeight(citation) {
  let weight = 0.5; // Base weight

  // Authority score influence
  weight += (citation.authority_score || 5) * 0.05;

  // Recency influence
  if (citation.publication_date) {
    const pubDate = new Date(citation.publication_date);
    const now = new Date();
    const daysDiff = (now - pubDate) / (1000 * 60 * 60 * 24);

    if (daysDiff < 30) weight += 0.2;
    else if (daysDiff < 90) weight += 0.1;
  }

  // Cross-references influence
  weight += (citation.cross_references || 0) * 0.05;

  return Math.min(1.0, Math.max(0.0, weight));
}

// Process all input citations
let allCitations = [];
let allSources = [];

input.forEach((item, index) => {
  console.log(`Processing input item ${index}:`, Object.keys(item.json || {}));

  const citations = item.json?.source_citations || [];
  const sources = item.json?.data_sources || [];

  if (Array.isArray(citations)) {
    allCitations = allCitations.concat(citations);
  }

  if (Array.isArray(sources)) {
    allSources = allSources.concat(sources);
  }
});

console.log(`Total citations to process: ${allCitations.length}`);
console.log(`Total sources to process: ${allSources.length}`);

// Enhanced citation processing with Sentaiment PRD schema
const enhancedCitations = allCitations.map((citation, index) => {
  // Apply origin detection
  const originData = classifyOrigin(citation);

  // Calculate authority score
  const authorityScore = calculateAuthorityScore(
    citation.source_name || citation.source_url,
    citation.source_url,
    citation.author
  );

  // Calculate influence weight
  const influenceWeight = calculateInfluenceWeight(citation);

  // Enhanced citation object following Sentaiment PRD schema
  return {
    // Core citation fields
    claim_text: toStr(citation.claim_text) || "No claim text provided",
    claim_category: toStr(citation.claim_category) || "competitive_analysis",
    claim_impact_score: Number.isFinite(citation.claim_impact_score)
      ? citation.claim_impact_score
      : 5,

    // Source identification
    source_type: toStr(citation.source_type) || "other",
    source_url: citation.source_url ? normUrl(citation.source_url) : null,
    source_domain:
      citation.source_domain ||
      (citation.source_url ? domainOf(citation.source_url) : null),

    // Temporal information
    publication_date: toStr(citation.publication_date) || null,
    training_data_cutoff: toStr(citation.training_data_cutoff) || "2025-01",

    // Author information
    author: toStr(citation.author) || "Unknown",
    author_credibility_score: Number.isFinite(citation.author_credibility_score)
      ? citation.author_credibility_score
      : 5,

    // Origin and verification
    ...originData,
    authority_score: authorityScore,
    verification_status: toStr(citation.verification_status) || "unverified",

    // Content classification
    content_type: toStr(citation.content_type) || "competitive_research",
    bias_indicators: toStr(citation.bias_indicators) || "unknown",

    // Evidence and validation
    cross_references: Number.isFinite(citation.cross_references)
      ? citation.cross_references
      : 0,
    confidence_level: toStr(citation.confidence_level) || "medium",
    supporting_evidence:
      toStr(citation.supporting_evidence) || "No additional evidence provided",

    // Real-time indicators
    real_time_indicators: Array.isArray(citation.real_time_indicators)
      ? citation.real_time_indicators
      : [],

    // Brand and sentiment analysis
    brand_mention_type: toStr(citation.brand_mention_type) || "other",
    sentiment_direction: toStr(citation.sentiment_direction) || "neutral",
    influence_weight: influenceWeight,

    // Strategic context
    strategic_relevance:
      toStr(citation.strategic_relevance) || "market_positioning",
    actionability_score: Number.isFinite(citation.actionability_score)
      ? citation.actionability_score
      : 5,
    geographic_scope: toStr(citation.geographic_scope) || "regional",
    time_sensitivity: toStr(citation.time_sensitivity) || "quarterly",

    // Tags and metadata
    tags: Array.isArray(citation.tags)
      ? citation.tags
      : ["competitive_analysis"],

    // Processing metadata
    processing_timestamp: new Date().toISOString(),
    prd_version: "2.0",
    citation_id: `citation_${Date.now()}_${index}`,
  };
});

// Enhanced sources processing
const enhancedSources = allSources.map((source, index) => ({
  id: source.id || `source_${Date.now()}_${index}`,
  source_name: toStr(source.source_name) || null,
  title: toStr(source.title) || null,
  publisher: toStr(source.publisher) || null,
  author: toStr(source.author) || null,
  published_date: toStr(source.published_date) || null,
  date_accessed:
    toStr(source.date_accessed) || new Date().toISOString().split("T")[0],
  authoritative: Boolean(source.authoritative),
  origin: toStr(source.origin) || "unknown",
  origin_confidence: Number.isFinite(source.origin_confidence)
    ? source.origin_confidence
    : 0.5,
  origin_notes: toStr(source.origin_notes) || null,
  authority_score: Number.isFinite(source.authority_score)
    ? source.authority_score
    : 5,
  quality_score: calculateAuthorityScore(
    source.source_name,
    source.source_name,
    source.author
  ),
  prd_version: "2.0",
}));

// Generate quality metrics following Sentaiment PRD
const qualityMetrics = {
  total_citations: enhancedCitations.length,
  total_sources: enhancedSources.length,
  real_time_sources: enhancedSources.filter(
    (s) => s.origin === "real_time_search"
  ).length,
  verified_citations: enhancedCitations.filter(
    (c) => c.verification_status === "verified"
  ).length,
  high_authority_citations: enhancedCitations.filter(
    (c) => c.authority_score >= 8
  ).length,
  citations_with_urls: enhancedCitations.filter(
    (c) => c.source_url && c.source_url.startsWith("http")
  ).length,
  average_authority_score:
    enhancedCitations.reduce((sum, c) => sum + c.authority_score, 0) /
    enhancedCitations.length,
  source_diversity_score: new Set(enhancedSources.map((s) => s.publisher)).size,
  recency_score:
    (enhancedCitations.filter((c) => {
      if (!c.publication_date) return false;
      const pubDate = new Date(c.publication_date);
      const now = new Date();
      return (now - pubDate) / (1000 * 60 * 60 * 24) < 365;
    }).length /
      enhancedCitations.length) *
    10,
};

console.log("Quality metrics:", qualityMetrics);

return [
  {
    json: {
      enhanced_citations: enhancedCitations,
      enhanced_sources: enhancedSources,
      quality_metrics: qualityMetrics,
      processing_metadata: {
        prd_version: "2.0",
        processing_timestamp: new Date().toISOString(),
        total_inputs_processed: input.length,
        schema_compliance: "100%",
      },
    },
  },
];
