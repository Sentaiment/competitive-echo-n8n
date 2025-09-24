/**
 * n8n Code node (JavaScript)
 * Enhanced Data Collector - Fixed to properly get company name from upstream nodes
 *
 * Inputs:
 * - Input 0: From 013_prompt32Formatter (scenario data with competitors)
 * - Input 1: From 018_webscraper (citation data)
 * - Input 2: (NEW) From 003_parseGroupData (company data) - CONNECT THIS!
 *
 * Output: Merged data with enhanced scenarios and citations for HTML report generation
 */

console.log("=== ENHANCED DATA COLLECTOR (FIXED) ===");

// Get all input items
const inputItems = $input.all();
console.log("Total input items:", inputItems.length);

// DEBUG: Show what we're actually receiving
console.log("\n=== DEBUGGING INPUT DATA ===");
inputItems.forEach((item, index) => {
  const data = item.json || {};
  console.log(`\nInput ${index}:`);
  console.log("- Keys:", Object.keys(data));
  console.log("- Has scenario_rankings:", !!data.scenario_rankings);
  console.log("- Has scenarios:", !!data.scenarios);
  console.log("- Has enhanced_citations:", !!data.enhanced_citations);
  console.log("- Has source_citations:", !!data.source_citations);
  console.log("- Has company:", !!data.company);
  console.log("- Has report_metadata:", !!data.report_metadata);
  if (data.scenario_rankings)
    console.log("- scenario_rankings length:", data.scenario_rankings.length);
  if (data.scenarios) console.log("- scenarios length:", data.scenarios.length);
  if (data.enhanced_citations)
    console.log("- enhanced_citations length:", data.enhanced_citations.length);
  if (data.source_citations)
    console.log("- source_citations length:", data.source_citations.length);
  console.log(
    "- Sample data:",
    JSON.stringify(data, null, 2).substring(0, 200) + "..."
  );
});

// Enhanced company name detection
let targetCompany = "Unknown Company";
let companySource = "default";
let companyLocked = false;

// Method 1: Look for company data in input items (most reliable)
console.log("🔍 Searching for company data in inputs...");

for (const item of inputItems) {
  const data = item.json || {};

  // Direct company field
  if (data.company && data.company !== "Unknown Company") {
    targetCompany = data.company;
    companySource = "direct_input";
    companyLocked = true;
    console.log("✅ Found company from direct input:", targetCompany);
    break;
  }

  // Company in business_context
  if (data.business_context && data.business_context.company) {
    targetCompany = data.business_context.company;
    companySource = "business_context";
    companyLocked = true;
    console.log("✅ Found company from business_context:", targetCompany);
    break;
  }

  // Company in report_metadata
  if (
    data.report_metadata &&
    data.report_metadata.company &&
    data.report_metadata.company !== "Unknown Company"
  ) {
    targetCompany = data.report_metadata.company;
    companySource = "report_metadata";
    companyLocked = true;
    console.log("✅ Found company from report_metadata:", targetCompany);
    break;
  }

  // Look in scenario data for frequently mentioned company
  if (data.scenario_rankings && Array.isArray(data.scenario_rankings)) {
    const companyMentions = {};

    data.scenario_rankings.forEach((scenario) => {
      if (
        scenario.competitors_ranked &&
        Array.isArray(scenario.competitors_ranked)
      ) {
        scenario.competitors_ranked.forEach((comp) => {
          if (comp.company && comp.company !== "Unknown Company") {
            companyMentions[comp.company] =
              (companyMentions[comp.company] || 0) + 1;
          }
        });
      }
    });

    // Get most mentioned company
    const mostMentioned = Object.entries(companyMentions).sort(
      ([, a], [, b]) => b - a
    )[0];

    if (mostMentioned && mostMentioned[1] > 1) {
      // Mentioned more than once
      targetCompany = mostMentioned[0];
      companySource = "scenario_analysis";
      console.log(
        `✅ Found company from scenario analysis: ${targetCompany} (mentioned ${mostMentioned[1]} times)`
      );
      break;
    }
  }
}

// Method 2: Try workflow context as backup
if (targetCompany === "Unknown Company") {
  console.log("🔍 Trying workflow context...");
  try {
    if (
      typeof $workflow !== "undefined" &&
      $workflow.context &&
      $workflow.context.target_company
    ) {
      targetCompany = $workflow.context.target_company;
      companySource = "workflow_context";
      console.log("✅ Found company from workflow context:", targetCompany);
    } else {
      console.log("❌ Workflow context not available or empty");
    }
  } catch (e) {
    console.log("❌ Could not access workflow context:", e.message);
  }
}

// Method 3: Extract from URL or domain patterns in citations
if (targetCompany === "Unknown Company") {
  console.log("🔍 Trying to extract from citation data...");

  const domains = [];
  for (const item of inputItems) {
    const data = item.json || {};

    // Check citation sources
    if (data.source_url) domains.push(data.source_url);
    if (data.enhanced_citations && Array.isArray(data.enhanced_citations)) {
      data.enhanced_citations.forEach((citation) => {
        if (citation.source_url) domains.push(citation.source_url);
        if (citation.source_domain) domains.push(citation.source_domain);
      });
    }
  }

  // Look for company domains (you can expand this list)
  const knownCompanyDomains = {
    "wynnlasvegas.com": "Wynn Las Vegas",
    "wynn.com": "Wynn Resorts",
    "mgmresorts.com": "MGM Resorts",
    "caesars.com": "Caesars Entertainment",
    // Add more as needed
  };

  for (const url of domains) {
    for (const [domain, company] of Object.entries(knownCompanyDomains)) {
      if (url.includes(domain)) {
        targetCompany = company;
        companySource = "domain_analysis";
        console.log(`✅ Found company from domain analysis: ${targetCompany}`);
        break;
      }
    }
    if (targetCompany !== "Unknown Company") break;
  }
}

console.log(`🏢 Final company: ${targetCompany} (source: ${companySource})`);

// Persist company to workflow context for downstream consistency
try {
  if (typeof $workflow !== "undefined") {
    $workflow.context = $workflow.context || {};
    $workflow.context.target_company = targetCompany;
    console.log("✅ Stored company in workflow context:", targetCompany);
  }
} catch (e) {
  console.log("⚠️ Could not store company in workflow context:", e.message);
}

// Quick summary of what we're getting
let summary = {
  has_scenario_rankings: 0,
  has_scenarios: 0,
  has_enhanced_citations: 0,
  has_source_citations: 0,
  has_scraping_results: 0,
  has_research_results: 0,
  has_company_data: 0,
  empty_inputs: 0,
  total_keys: 0,
};

inputItems.forEach((item) => {
  const data = item.json || {};
  const keys = Object.keys(data);
  summary.total_keys += keys.length;

  if (keys.length === 0) {
    summary.empty_inputs++;
  } else {
    if (data.scenario_rankings) summary.has_scenario_rankings++;
    if (data.scenarios) summary.has_scenarios++;
    if (data.enhanced_citations) summary.has_enhanced_citations++;
    if (data.source_citations) summary.has_source_citations++;
    if (data.scraping_results) summary.has_scraping_results++;
    if (data.research_results) summary.has_research_results++;
    if (data.company || data.business_context) summary.has_company_data++;
  }
});

console.log("\n=== INPUT SUMMARY ===");
console.log("Total inputs:", inputItems.length);
console.log("Empty inputs:", summary.empty_inputs);
console.log("Inputs with company data:", summary.has_company_data);
console.log("Inputs with scenario_rankings:", summary.has_scenario_rankings);
console.log("Inputs with scenarios:", summary.has_scenarios);
console.log("Inputs with enhanced_citations:", summary.has_enhanced_citations);
console.log("Inputs with source_citations:", summary.has_source_citations);
console.log("Inputs with scraping_results:", summary.has_scraping_results);
console.log("Inputs with research_results:", summary.has_research_results);
console.log("Total keys across all inputs:", summary.total_keys);

// Initialize merged data structure
let mergedData = {
  // Scenario data
  scenario_rankings: [],
  scenarios: [],

  // Citation data
  enhanced_citations: [],
  source_citations: [],
  scraping_results: [],
  research_results: [],

  // Metadata
  report_metadata: {
    company: targetCompany,
    company_source: companySource,
    total_scenarios: 0,
    competitors_analyzed: [],
  },

  // Processing metadata
  merge_metadata: {
    merge_timestamp: new Date().toISOString(),
    input_count: inputItems.length,
    processing_version: "2.1_fixed",
  },
};

// Process each input item
inputItems.forEach((item, index) => {
  const data = item.json || {};
  console.log(`\n--- Processing Input ${index} ---`);

  // Check if this is a scenario data object
  if (data.scenario_rankings && Array.isArray(data.scenario_rankings)) {
    console.log(`Found ${data.scenario_rankings.length} scenario rankings`);
    mergedData.scenario_rankings = mergedData.scenario_rankings.concat(
      data.scenario_rankings
    );
  }

  if (data.scenarios && Array.isArray(data.scenarios)) {
    console.log(`Found ${data.scenarios.length} scenarios`);
    mergedData.scenarios = mergedData.scenarios.concat(data.scenarios);
  }

  // Check if this is a citation array
  if (data.enhanced_citations && Array.isArray(data.enhanced_citations)) {
    console.log(`Found ${data.enhanced_citations.length} enhanced citations`);
    mergedData.enhanced_citations = mergedData.enhanced_citations.concat(
      data.enhanced_citations
    );
  }

  if (data.source_citations && Array.isArray(data.source_citations)) {
    console.log(`Found ${data.source_citations.length} source citations`);
    mergedData.source_citations = mergedData.source_citations.concat(
      data.source_citations
    );
  }

  if (data.scraping_results && Array.isArray(data.scraping_results)) {
    console.log(`Found ${data.scraping_results.length} scraping results`);
    mergedData.scraping_results = mergedData.scraping_results.concat(
      data.scraping_results
    );
  }

  if (data.research_results && Array.isArray(data.research_results)) {
    console.log(`Found ${data.research_results.length} research results`);
    mergedData.research_results = mergedData.research_results.concat(
      data.research_results
    );
  }

  // Handle individual citation objects (current data structure)
  if (data.claim_text && data.source_url) {
    console.log(
      `Found individual citation: ${data.claim_text.substring(0, 50)}...`
    );
    mergedData.enhanced_citations.push(data);
  }

  // Preserve business context and other metadata
  if (data.business_context) {
    mergedData.business_context = data.business_context;
    console.log("Found business context data");
  }

  if (data.whitelist) {
    mergedData.whitelist = data.whitelist;
    console.log(`Found whitelist with ${data.whitelist.length} entries`);
  }

  if (data.competitors) {
    mergedData.competitors = data.competitors;
    console.log(`Found ${data.competitors.length} competitors`);
  }
});

// Enhanced scenario processing - fix missing competitors
console.log("\n=== ENHANCING SCENARIO DATA ===");
console.log(
  `Processing ${mergedData.scenario_rankings.length} scenario rankings`
);

mergedData.scenario_rankings.forEach((scenario, index) => {
  console.log(
    `\nProcessing scenario ${scenario.scenario_id}: ${scenario.scenario_title}`
  );

  // Check if scenario has competitors
  const hasCompetitors =
    scenario.competitors_ranked && scenario.competitors_ranked.length > 0;
  const hasAnalysisDetails =
    scenario.analysis_details &&
    Object.keys(scenario.analysis_details).length > 0;

  console.log(
    `  Has competitors_ranked: ${hasCompetitors} (${
      scenario.competitors_ranked?.length || 0
    })`
  );
  console.log(
    `  Has analysis_details: ${hasAnalysisDetails} (${
      Object.keys(scenario.analysis_details || {}).length
    })`
  );

  // Process sources from scenario data
  if (scenario.sources && scenario.sources.length > 0) {
    console.log(
      `  📚 Found ${scenario.sources.length} sources in scenario data`
    );

    // Add sources to the data_sources_table
    if (!mergedData.data_sources_table) {
      mergedData.data_sources_table = [];
    }

    // Add unique sources to the table
    scenario.sources.forEach((source) => {
      if (!mergedData.data_sources_table.includes(source)) {
        mergedData.data_sources_table.push(source);
      }
    });

    console.log(
      `  ✅ Added sources to data_sources_table. Total: ${mergedData.data_sources_table.length}`
    );
  } else {
    console.log(`  ⚠️  No sources found in scenario ${scenario.scenario_id}`);
  }

  // If no competitors but has analysis_details, build competitors from analysis_details
  if (!hasCompetitors && hasAnalysisDetails) {
    console.log(
      `  🔧 Building competitors from analysis_details for scenario ${scenario.scenario_id}`
    );

    const competitorsFromAnalysis = Object.entries(
      scenario.analysis_details
    ).map(([companyName, details], idx) => {
      // Calculate overall score from metrics if available
      let overallScore = null;
      let detailedMetrics = {};

      if (details.metrics && typeof details.metrics === "object") {
        detailedMetrics = { ...details.metrics };
        // Calculate average score from metrics
        const metricValues = Object.values(details.metrics).filter(
          (val) => typeof val === "number"
        );
        if (metricValues.length > 0) {
          overallScore = (
            metricValues.reduce((sum, val) => sum + val, 0) /
            metricValues.length
          ).toFixed(1);
        }
      }

      // Build rationale from summary and highlights
      const summaryText = details.summary || "";
      const highlightsText = (details.highlights || []).join("; ");
      const rationale = [summaryText, highlightsText]
        .filter((text) => text && text.length > 0)
        .join(" | ");

      return {
        company: companyName,
        score: overallScore,
        rationale: rationale,
        rank: idx + 1,
        detailed_metrics: detailedMetrics,
      };
    });

    // Sort by score (highest first) if scores are available
    competitorsFromAnalysis.sort((a, b) => {
      const scoreA = parseFloat(a.score) || 0;
      const scoreB = parseFloat(b.score) || 0;
      return scoreB - scoreA;
    });

    // Update ranks after sorting
    competitorsFromAnalysis.forEach((comp, idx) => {
      comp.rank = idx + 1;
    });

    scenario.competitors_ranked = competitorsFromAnalysis;
    console.log(
      `  ✅ Built ${competitorsFromAnalysis.length} competitors from analysis_details`
    );
  }

  // Ensure we have key_findings
  if (!scenario.key_findings || scenario.key_findings.length === 0) {
    if (
      scenario.analysis_details &&
      Object.keys(scenario.analysis_details).length > 0
    ) {
      // Generate key findings from analysis details
      const findings = [];
      Object.entries(scenario.analysis_details).forEach(
        ([company, details]) => {
          if (details.summary) {
            findings.push(`${company}: ${details.summary}`);
          }
          if (details.highlights && details.highlights.length > 0) {
            findings.push(
              `${company} highlights: ${details.highlights.join(", ")}`
            );
          }
        }
      );
      scenario.key_findings = findings;
      console.log(
        `  ✅ Generated ${findings.length} key findings from analysis_details`
      );
    }
  }
});

// Enhanced citation processing - consolidate all citation sources
console.log("\n=== ENHANCING CITATION DATA ===");

// Consolidate all citation sources into enhanced_citations
const allCitations = [];
allCitations.push(...mergedData.enhanced_citations);
allCitations.push(...mergedData.source_citations);
allCitations.push(...mergedData.scraping_results);
allCitations.push(...mergedData.research_results);

console.log(`Total citations from all sources: ${allCitations.length}`);

// Remove duplicates and enhance citations
const uniqueCitations = [];
const citationMap = new Map();

allCitations.forEach((citation) => {
  // Create a unique key for deduplication
  const key = `${citation.claim_text || citation.title || "unknown"}_${
    citation.source_url || citation.url || "no_url"
  }`;

  if (!citationMap.has(key)) {
    citationMap.set(key, citation);

    // Enhance citation with missing fields
    const enhancedCitation = {
      claim_text:
        citation.claim_text || citation.title || "No claim text provided",
      claim_category: citation.claim_category || "competitive_analysis",
      claim_impact_score: citation.claim_impact_score || 5,
      source_type: citation.source_type || "web_research",
      source_url: citation.source_url || citation.url || "",
      source_domain: citation.source_domain || citation.domain || "",
      publication_date:
        citation.publication_date || citation.published || citation.date || "",
      author: citation.author || "Unknown",
      author_credibility_score: citation.author_credibility_score || 5,
      source_origin: citation.source_origin || "real_time_search",
      training_data_cutoff: citation.training_data_cutoff || "2025-01",
      authority_score: citation.authority_score || 5,
      verification_status: citation.verification_status || "unverified",
      content_type: citation.content_type || "competitive_research",
      bias_indicators: citation.bias_indicators || "unknown",
      cross_references: citation.cross_references || 0,
      confidence_level: citation.confidence_level || "medium",
      supporting_evidence:
        citation.supporting_evidence ||
        citation.notes ||
        citation.description ||
        "No additional evidence provided",
      real_time_indicators: citation.real_time_indicators || [
        "live_web_scraping",
      ],
      brand_mention_type: citation.brand_mention_type || "other",
      sentiment_direction: citation.sentiment_direction || "neutral",
      influence_weight: citation.influence_weight || 0.5,
      strategic_relevance: citation.strategic_relevance || "market_positioning",
      actionability_score: citation.actionability_score || 5,
      geographic_scope: citation.geographic_scope || "regional",
      time_sensitivity: citation.time_sensitivity || "quarterly",
      tags: citation.tags || ["competitive_analysis"],
      ...citation, // Preserve any additional fields
    };

    uniqueCitations.push(enhancedCitation);
  }
});

mergedData.enhanced_citations = uniqueCitations;
console.log(
  `✅ Enhanced and deduplicated citations: ${uniqueCitations.length}`
);

// Update final metadata
mergedData.report_metadata.total_scenarios =
  mergedData.scenario_rankings.length;
mergedData.report_metadata.competitors_analyzed = [
  ...new Set(
    mergedData.scenario_rankings.flatMap((s) =>
      (s.competitors_ranked || []).map((c) => c.company || c)
    )
  ),
];

// Final summary
console.log("\n=== FINAL MERGED DATA SUMMARY ===");
console.log(
  `Company: ${mergedData.report_metadata.company} (${companySource})`
);
console.log(`Total scenarios: ${mergedData.scenario_rankings.length}`);
console.log(
  `Total enhanced citations: ${mergedData.enhanced_citations.length}`
);
console.log(
  `Competitors analyzed: ${mergedData.report_metadata.competitors_analyzed.length}`
);

// Debug scenario details
console.log("\n=== SCENARIO DETAILS ===");
mergedData.scenario_rankings.forEach((scenario, index) => {
  console.log(`Scenario ${scenario.scenario_id}: ${scenario.scenario_title}`);
  console.log(`  Competitors: ${scenario.competitors_ranked?.length || 0}`);
  console.log(`  Key findings: ${scenario.key_findings?.length || 0}`);
});

// DEBUG: Show what we're outputting
console.log("\n=== FINAL OUTPUT DEBUG ===");
console.log("Company:", mergedData.report_metadata.company);
console.log("Scenario rankings:", mergedData.scenario_rankings.length);
console.log("Scenarios:", mergedData.scenarios.length);
console.log("Enhanced citations:", mergedData.enhanced_citations.length);
console.log("Source citations:", mergedData.source_citations.length);
console.log("Scraping results:", mergedData.scraping_results.length);
console.log("Research results:", mergedData.research_results.length);
console.log(
  "Total scenarios in metadata:",
  mergedData.report_metadata.total_scenarios
);

return [{ json: mergedData }];
