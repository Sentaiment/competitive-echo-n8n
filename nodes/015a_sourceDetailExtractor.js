// Source Detail Extractor - Implements Sentaiment PRD v2.0 Source Citation System
// This node extracts granular source details from competitive analysis data

console.log("=== SOURCE DETAIL EXTRACTOR ===");
console.log("Input data:", JSON.stringify($input.first().json, null, 2));

const inputData = $input.first().json;

// Debug: Check what type of data we're receiving
console.log("Input data type:", typeof inputData);
console.log("Input data keys:", Object.keys(inputData || {}));
console.log("Has scenario_rankings:", !!inputData?.scenario_rankings);
console.log("Has scenarios:", !!inputData?.scenarios);
console.log("Is array:", Array.isArray(inputData));

// Extract source references from competitive analysis scenarios
const sourceReferences = [];
let scenarios = [];

// Function to extract sources from a single scenario
function extractSourcesFromScenario(scenario) {
  const sources = [];

  console.log(`  Checking scenario ${scenario.scenario_id || scenario.title}:`);
  console.log(`  - Has sources array:`, !!scenario.sources);
  console.log(`  - Has analysis_details:`, !!scenario.analysis_details);
  console.log(`  - Has response_text:`, !!scenario.response_text);

  // Extract from sources array if present
  if (scenario.sources && Array.isArray(scenario.sources)) {
    console.log(
      `  - Found ${scenario.sources.length} sources in sources array`
    );
    scenario.sources.forEach((source) => {
      sources.push({
        source_name: source,
        source_url: extractUrlFromSource(source),
        source_domain: extractDomain(source),
        scenario_id: scenario.scenario_id,
        scenario_title: scenario.scenario_title || scenario.title,
        context: scenario.key_findings || [],
        source_type: determineSourceType(source),
      });
    });
  }

  // Extract from analysis_details if present (competitive analysis structure)
  if (
    scenario.analysis_details &&
    typeof scenario.analysis_details === "object"
  ) {
    console.log(
      `  - Found analysis_details with ${
        Object.keys(scenario.analysis_details).length
      } companies`
    );
    Object.values(scenario.analysis_details).forEach((detail, index) => {
      if (detail.sources && Array.isArray(detail.sources)) {
        console.log(
          `    - Company ${index + 1} has ${detail.sources.length} sources`
        );
        detail.sources.forEach((source) => {
          sources.push({
            source_name: source,
            source_url: extractUrlFromSource(source),
            source_domain: extractDomain(source),
            scenario_id: scenario.scenario_id,
            scenario_title: scenario.scenario_title || scenario.title,
            context: detail.highlights || detail.summary || [],
            source_type: determineSourceType(source),
          });
        });
      }
    });
  }

  // Extract from response_text if present (Claude response)
  if (scenario.response_text) {
    try {
      const jsonMatch = scenario.response_text.match(
        /```json\n([\s\S]*?)\n```/
      );
      if (jsonMatch) {
        const parsedData = JSON.parse(jsonMatch[1]);
        if (parsedData.sources && Array.isArray(parsedData.sources)) {
          parsedData.sources.forEach((source) => {
            sources.push({
              source_name: source,
              source_url: extractUrlFromSource(source),
              source_domain: extractDomain(source),
              scenario_id: scenario.scenario_id,
              scenario_title: scenario.scenario_title || scenario.title,
              context: parsedData.key_findings || [],
              source_type: determineSourceType(source),
            });
          });
        }
      }
    } catch (error) {
      console.log("Error parsing scenario response_text:", error);
    }
  }

  return sources;
}

// Helper function to extract URL from source string if it contains one
function extractUrlFromSource(source) {
  // Check if source already contains a URL
  const urlMatch = source.match(/(https?:\/\/[^\s,]+)/);
  if (urlMatch) {
    return urlMatch[1].replace(/[,\")]*$/, ""); // Clean trailing punctuation
  }
  return null;
}

// Helper function to extract domain from URL or source
function extractDomain(source) {
  try {
    // First check if there's a URL in the source
    const url = extractUrlFromSource(source);
    if (url) {
      return new URL(url).hostname;
    }

    // If no URL, try to extract domain patterns from text
    const domainMatch = source.match(/([a-zA-Z0-9-]+\.[a-zA-Z]{2,})/);
    if (domainMatch) {
      return domainMatch[1];
    }

    return source;
  } catch (error) {
    return source;
  }
}

// Helper function to determine source type based on content analysis
function determineSourceType(source) {
  const sourceLower = source.toLowerCase();

  // Industry guides and rating organizations
  if (sourceLower.includes("forbes") || sourceLower.includes("travel guide"))
    return "industry_guide";
  if (sourceLower.includes("j.d. power") || sourceLower.includes("jdpower"))
    return "industry_guide";
  if (sourceLower.includes("aaa") && sourceLower.includes("diamond"))
    return "industry_guide";

  // Review and consumer platforms
  if (sourceLower.includes("tripadvisor")) return "review_platform";
  if (sourceLower.includes("yelp")) return "review_platform";
  if (sourceLower.includes("google reviews")) return "review_platform";

  // Social media platforms
  if (sourceLower.includes("reddit")) return "social_media";
  if (sourceLower.includes("twitter") || sourceLower.includes("x.com"))
    return "social_media";
  if (sourceLower.includes("instagram")) return "social_media";
  if (sourceLower.includes("facebook")) return "social_media";
  if (sourceLower.includes("tiktok")) return "social_media";

  // Video content
  if (sourceLower.includes("youtube")) return "video_content";
  if (sourceLower.includes("vimeo")) return "video_content";

  // News and media
  if (
    sourceLower.includes("review-journal") ||
    sourceLower.includes("reviewjournal")
  )
    return "news_article";
  if (
    sourceLower.includes("cnn") ||
    sourceLower.includes("bbc") ||
    sourceLower.includes("reuters")
  )
    return "news_article";
  if (
    sourceLower.includes("travel + leisure") ||
    sourceLower.includes("conde nast")
  )
    return "travel_media";

  // Company sources
  if (sourceLower.includes("annual report") || sourceLower.includes("investor"))
    return "company_report";
  if (sourceLower.includes("press release")) return "company_report";
  if (
    sourceLower.includes("wynn") ||
    sourceLower.includes("mgm") ||
    sourceLower.includes("venetian") ||
    sourceLower.includes("fontainebleau")
  )
    return "company_website";

  // Academic and research
  if (sourceLower.includes("study") || sourceLower.includes("research"))
    return "research_report";
  if (sourceLower.includes("university") || sourceLower.includes("institute"))
    return "academic_source";

  // Government and regulatory
  if (sourceLower.includes(".gov") || sourceLower.includes("government"))
    return "government_source";
  if (sourceLower.includes("lvcva") || sourceLower.includes("convention"))
    return "government_source";

  // Default web research for anything with domain patterns
  if (
    sourceLower.includes(".com") ||
    sourceLower.includes(".org") ||
    sourceLower.includes(".net")
  )
    return "web_research";

  return "unknown";
}

// Check if this is scenario_rankings data (from competitive analysis workflow)
if (inputData.scenario_rankings && Array.isArray(inputData.scenario_rankings)) {
  console.log(
    "Processing scenario_rankings:",
    inputData.scenario_rankings.length
  );
  scenarios = inputData.scenario_rankings;

  // Extract sources from all scenarios
  scenarios.forEach((scenario, index) => {
    console.log(
      `Processing scenario ${index + 1}:`,
      scenario.scenario_id || scenario.title
    );
    const scenarioSources = extractSourcesFromScenario(scenario);
    console.log(
      `Found ${scenarioSources.length} sources in scenario ${index + 1}`
    );
    sourceReferences.push(...scenarioSources);
  });
}

// Check if this is an array of scenarios (competitive analysis data)
else if (Array.isArray(inputData)) {
  console.log("Processing array of scenarios:", inputData.length);
  scenarios = inputData;

  // Extract sources from all scenarios
  scenarios.forEach((scenario) => {
    const scenarioSources = extractSourcesFromScenario(scenario);
    sourceReferences.push(...scenarioSources);
  });
}

// Check if this is a single scenario object
else if (inputData.scenarios && Array.isArray(inputData.scenarios)) {
  console.log(
    "Processing scenarios from inputData.scenarios:",
    inputData.scenarios.length
  );
  scenarios = inputData.scenarios;

  scenarios.forEach((scenario) => {
    const scenarioSources = extractSourcesFromScenario(scenario);
    sourceReferences.push(...scenarioSources);
  });
}

// Check if this is Format Prompt 32 output (scenarios_completed structure)
else if (
  inputData.scenarios_completed &&
  Array.isArray(inputData.scenarios_completed)
) {
  console.log(
    "Processing scenarios_completed:",
    inputData.scenarios_completed.length
  );
  scenarios = inputData.scenarios_completed;

  // Extract sources from all scenarios
  scenarios.forEach((scenario, index) => {
    console.log(
      `Processing scenario ${index + 1}:`,
      scenario.scenario_id || scenario.title
    );
    const scenarioSources = extractSourcesFromScenario(scenario);
    console.log(
      `Found ${scenarioSources.length} sources in scenario ${index + 1}`
    );
    sourceReferences.push(...scenarioSources);
  });
}

// Check if this is results array from Format Prompt 32
else if (inputData.results && Array.isArray(inputData.results)) {
  console.log("Processing results array:", inputData.results.length);
  scenarios = inputData.results;

  // Extract sources from all scenarios
  scenarios.forEach((scenario, index) => {
    console.log(
      `Processing scenario ${index + 1}:`,
      scenario.scenario_id || scenario.title
    );
    const scenarioSources = extractSourcesFromScenario(scenario);
    console.log(
      `Found ${scenarioSources.length} sources in scenario ${index + 1}`
    );
    sourceReferences.push(...scenarioSources);
  });
}

// Check if this is a single scenario
else if (inputData.scenario_id) {
  console.log("Processing single scenario:", inputData.scenario_id);
  scenarios = [inputData];

  const scenarioSources = extractSourcesFromScenario(inputData);
  sourceReferences.push(...scenarioSources);
}

// Fallback: check for Claude response format
else if (inputData.content && Array.isArray(inputData.content)) {
  const content = inputData.content[0];
  if (content.text) {
    try {
      const jsonMatch = content.text.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        const parsedData = JSON.parse(jsonMatch[1]);
        if (
          parsedData.source_citations &&
          Array.isArray(parsedData.source_citations)
        ) {
          parsedData.source_citations.forEach((citation, index) => {
            sourceReferences.push({
              source_name:
                citation.source_url ||
                citation.source_domain ||
                `Source ${index + 1}`,
              source_url: citation.source_url,
              source_domain: citation.source_domain,
              publication_date: citation.publication_date,
              author: citation.author,
              scenario_id: `citation_${index + 1}`,
              scenario_title: `Citation ${index + 1}`,
              context: [citation.claim_text],
              citation_data: citation,
              source_type: determineSourceType(
                citation.source_url || citation.source_domain
              ),
            });
          });
        }
      }
    } catch (error) {
      console.log("Error parsing Claude response:", error);
    }
  }
}

console.log("Found source references:", sourceReferences.length);
console.log("Source references:", sourceReferences);

// Deduplicate sources by source_name, keeping the most complete version
const sourceMap = new Map();
sourceReferences.forEach((source) => {
  const key = source.source_name;
  if (
    !sourceMap.has(key) ||
    (source.source_url && !sourceMap.get(key).source_url) ||
    (source.author && !sourceMap.get(key).author)
  ) {
    sourceMap.set(key, source);
  }
});

const uniqueSources = Array.from(sourceMap.values());

console.log("Unique sources after deduplication:", uniqueSources.length);
console.log(
  "Source types distribution:",
  uniqueSources.reduce((acc, source) => {
    acc[source.source_type] = (acc[source.source_type] || 0) + 1;
    return acc;
  }, {})
);

// Generate source extraction prompts
const sourceExtractionPrompts = uniqueSources.map((ref, index) => {
  // Ensure all required properties exist
  const scenariosUsed = sourceReferences
    .filter((s) => s.source_name === ref.source_name)
    .map((s) => s.scenario_id || "unknown");

  const context = ref.context || [];
  const sourceName = ref.source_name || `Source ${index + 1}`;

  return {
    source_id: `source_${Date.now()}_${index}`,
    source_name: sourceName,
    source_url: ref.source_url || null,
    source_domain: ref.source_domain || null,
    publication_date: ref.publication_date || null,
    author: ref.author || null,
    scenarios_used: scenariosUsed,
    context: context,
    citation_data: ref.citation_data || null,
    source_type: ref.source_type || "unknown",
    extraction_prompt: {
      system_content: `You are a source detail extraction specialist implementing the Sentaiment PRD v2.0 source citation system. Extract comprehensive metadata for the given source reference with strict adherence to the JSON schema.

CORE REQUIREMENTS:
- Extract specific URLs, publication dates, authors, and metadata
- Determine authority scores (1-10) based on source credibility
- Assess verification status and confidence levels
- Identify source origin (training_data vs real_time_search vs hybrid)
- Calculate influence weights and bias indicators
- Extract cross-references and supporting evidence

RETURN ONLY VALID JSON matching the source_citation schema.`,
      user_content: `EXTRACT COMPREHENSIVE SOURCE METADATA

Source Reference: ${ref.source_name}
${ref.source_url ? `Source URL: ${ref.source_url}` : ""}
${ref.source_domain ? `Source Domain: ${ref.source_domain}` : ""}
${ref.publication_date ? `Publication Date: ${ref.publication_date}` : ""}
${ref.author ? `Author: ${ref.author}` : ""}
Used in Scenarios: ${scenariosUsed.join(", ")}
Context: ${context.slice(0, 2).join("; ")}

REQUIREMENTS:
IMPORTANT: If sources contain existing publication years (like '2023'), preserve those original dates exactly. Do not use current system date unless source completely lacks any date information.

1. Find the specific URL for this source (if available)
2. Extract exact publication date (YYYY-MM-DD format) - preserve original years from source names
3. Identify author(s) or organization
4. Determine authority score (1-10) based on:
   - Source credibility and reputation
   - Industry recognition
   - Peer validation
   - Historical accuracy
5. Assess verification status (verified/unverified/conflicting)
6. Determine source origin:
   - training_data: Information from model training
   - real_time_search: Recent web search results
   - hybrid: Mix of training and real-time data
7. Calculate influence weight (0.0-1.0)
8. Identify bias indicators (low/medium/high)
9. Extract any cross-references
10. Determine content type (competitive_research/earnings_call/press_release/analyst_report)
11. Assess sentiment direction (positive/negative/neutral)
12. Identify brand mention type (direct_comparison|market_positioning|strategic_move)
13. Calculate actionability score (1-10)
14. Determine geographic scope (global/regional|local)
15. Assess time sensitivity (immediate|quarterly|annual)

RETURN JSON FORMAT:
{
  "source_citations": [
    {
      "claim_text": "Specific claim from this source",
      "claim_category": "competitive_analysis",
      "claim_impact_score": 7,
      "source_type": "web_research|training_data|company_report|news_article",
      "source_url": "https://actual-source-url.com",
      "source_domain": "domain.com",
      "publication_date": "PRESERVE_ORIGINAL_YEAR_FROM_SOURCE_NAME",
      "author": "Actual Author Name or Organization",
      "author_credibility_score": 8,
      "source_origin": "web_research|training_data|company_filing",
      "training_data_cutoff": "2025-01",
      "authority_score": 8,
      "verification_status": "verified|unverified|conflicting",
      "content_type": "competitive_research|earnings_call|press_release|analyst_report",
      "bias_indicators": "low|medium|high",
      "cross_references": 2,
      "confidence_level": "high|medium|low",
      "supporting_evidence": "Specific data points or context",
      "real_time_indicators": ["recent_announcement", "market_movement"],
      "brand_mention_type": "direct_comparison|market_positioning|strategic_move",
      "sentiment_direction": "positive|negative|neutral",
      "influence_weight": 0.8,
      "strategic_relevance": "market_share|pricing|product_launch|expansion",
      "actionability_score": 8,
      "geographic_scope": "global|regional|local",
      "time_sensitivity": "immediate|quarterly|annual",
      "tags": ["competitive_analysis", "luxury_hospitality", "service_quality"]
    }
  ],
  "extraction_metadata": {
    "total_claims_found": 1,
    "high_impact_claims": 1,
    "source_diversity_score": 7,
    "recency_score": 6,
    "deduplication_applied": true,
    "data_processing_timestamp": "SYSTEM_GENERATED_DURING_EXTRACTION"
  }
}

Focus on extracting the most accurate and comprehensive metadata possible for this source.`,
    },
  };
});

console.log("Generated extraction prompts:", sourceExtractionPrompts.length);

return [
  {
    json: {
      source_extraction_prompts: sourceExtractionPrompts,
      original_data: inputData,
      extraction_metadata: {
        total_sources: uniqueSources.length,
        total_scenarios: scenarios.length,
        total_source_references: sourceReferences.length,
        data_extraction_run_timestamp: new Date().toISOString(),
        data_extraction_note:
          "Timestamp indicates when source extraction process was performed, not source publication dates",
        prd_version: "2.0",
        source_types: uniqueSources.reduce((acc, source) => {
          acc[source.source_type] = (acc[source.source_type] || 0) + 1;
          return acc;
        }, {}),
        scenarios_processed: scenarios.map((s) => ({
          id: s.scenario_id,
          title: s.scenario_title || s.title,
          sources_count: sourceReferences.filter(
            (sr) => sr.scenario_id === s.scenario_id
          ).length,
        })),
      },
    },
  },
];
