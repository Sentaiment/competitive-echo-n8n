/**
 * n8n Code node (JavaScript)
 * Enhanced Data Collector - Replaces simple merge node with intelligent data merging
 *
 * Inputs:
 * - Input 0: From 013_prompt32Formatter (scenario data with competitors)
 * - Input 1: From 018_webscraper (citation data)
 *
 * Output: Merged data with enhanced scenarios and citations for HTML report generation
 */

console.log("=== ENHANCED DATA COLLECTOR ===");

// Get all input items
const inputItems = $input.all();
console.log("Total input items:", inputItems.length);

// Quick summary of what we're getting
let summary = {
  has_scenario_rankings: 0,
  has_scenarios: 0,
  has_enhanced_citations: 0,
  has_source_citations: 0,
  has_scraping_results: 0,
  has_research_results: 0,
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
  }
});

console.log("\n=== INPUT SUMMARY ===");
console.log("Total inputs:", inputItems.length);
console.log("Empty inputs:", summary.empty_inputs);
console.log("Inputs with scenario_rankings:", summary.has_scenario_rankings);
console.log("Inputs with scenarios:", summary.has_scenarios);
console.log("Inputs with enhanced_citations:", summary.has_enhanced_citations);
console.log("Inputs with source_citations:", summary.has_source_citations);
console.log("Inputs with scraping_results:", summary.has_scraping_results);
console.log("Inputs with research_results:", summary.has_research_results);
console.log("Total keys across all inputs:", summary.total_keys);

// Debug each input - but limit to first 5 to avoid spam
inputItems.slice(0, 5).forEach((item, index) => {
  const data = item.json || {};
  console.log(`\n--- Input ${index} Analysis ---`);
  console.log("Keys:", Object.keys(data));
  console.log("Has scenario_rankings:", !!data.scenario_rankings);
  console.log("Has scenarios:", !!data.scenarios);
  console.log("Has enhanced_citations:", !!data.enhanced_citations);
  console.log("Has scraping_results:", !!data.scraping_results);
  console.log("Has research_results:", !!data.research_results);
  console.log("Has source_citations:", !!data.source_citations);

  // Show actual data structure for first few inputs
  if (index < 3) {
    console.log("Full data structure:", JSON.stringify(data, null, 2));
  }

  if (data.scenario_rankings) {
    console.log(`Scenario rankings count: ${data.scenario_rankings.length}`);
    data.scenario_rankings.forEach((scenario, i) => {
      console.log(
        `  Scenario ${i + 1}: ${scenario.scenario_id} - ${
          scenario.scenario_title
        }`
      );
      console.log(
        `    Competitors: ${scenario.competitors_ranked?.length || 0}`
      );
      console.log(
        `    Analysis details: ${
          Object.keys(scenario.analysis_details || {}).length
        }`
      );
    });
  }

  if (data.enhanced_citations) {
    console.log(`Enhanced citations count: ${data.enhanced_citations.length}`);
  }

  if (data.scraping_results) {
    console.log(`Scraping results count: ${data.scraping_results.length}`);
  }
});

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
    company: "Unknown Company",
    total_scenarios: 0,
    competitors_analyzed: [],
  },

  // Processing metadata
  merge_metadata: {
    merge_timestamp: new Date().toISOString(),
    input_count: inputItems.length,
    processing_version: "2.0_enhanced",
  },
};

// Process each input item - but first let's see what we actually have
console.log("\n=== ANALYZING INPUTS ===");

// Let's look at the actual structure of inputs
let inputAnalysis = {
  total: inputItems.length,
  withData: 0,
  empty: 0,
  sampleKeys: new Set(),
  sampleData: [],
};

inputItems.forEach((item, index) => {
  const data = item.json || {};
  const keys = Object.keys(data);

  if (keys.length > 0) {
    inputAnalysis.withData++;
    keys.forEach((key) => inputAnalysis.sampleKeys.add(key));

    // Capture sample data from first few non-empty inputs
    if (inputAnalysis.sampleData.length < 3) {
      inputAnalysis.sampleData.push({
        index,
        keys: keys,
        sampleData: JSON.stringify(data, null, 2).substring(0, 500) + "...",
      });
    }
  } else {
    inputAnalysis.empty++;
  }
});

console.log("Input Analysis:", JSON.stringify(inputAnalysis, null, 2));

// Process each input item - handle individual citation objects
inputItems.forEach((item, index) => {
  const data = item.json || {};
  console.log(`\n--- Processing Input ${index} ---`);

  // Check if this is a scenario data object
  if (data.scenario_rankings && Array.isArray(data.scenario_rankings)) {
    console.log(`Found ${data.scenario_rankings.length} scenario rankings`);

    // Debug: Check competitor counts in each scenario
    data.scenario_rankings.forEach((scenario, idx) => {
      const competitorCount = scenario.competitors_ranked?.length || 0;
      console.log(
        `  Scenario ${scenario.scenario_id}: ${competitorCount} competitors`
      );
      if (competitorCount > 0) {
        scenario.competitors_ranked.forEach((comp, compIdx) => {
          console.log(
            `    ${compIdx + 1}. ${comp.company}: ${comp.score || "N/A"}`
          );
        });
      }
    });

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

  // Handle metadata
  if (data.company && data.company !== "Unknown Company") {
    mergedData.report_metadata.company = data.company;
  }

  if (data.report_metadata) {
    if (
      data.report_metadata.company &&
      data.report_metadata.company !== "Unknown Company"
    ) {
      mergedData.report_metadata.company = data.report_metadata.company;
    }
    if (data.report_metadata.total_scenarios) {
      mergedData.report_metadata.total_scenarios =
        data.report_metadata.total_scenarios;
    }
    if (data.report_metadata.competitors_analyzed) {
      mergedData.report_metadata.competitors_analyzed =
        data.report_metadata.competitors_analyzed;
    }
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

// Extract company name from scenario data
console.log("\n=== EXTRACTING COMPANY NAME ===");
if (mergedData.scenario_rankings.length > 0) {
  // Look for the most frequently mentioned company in top positions
  const companyMentions = {};

  mergedData.scenario_rankings.forEach((scenario) => {
    if (
      scenario.competitors_ranked &&
      Array.isArray(scenario.competitors_ranked)
    ) {
      scenario.competitors_ranked.forEach((comp, index) => {
        if (comp.company && comp.company !== "Unknown Company") {
          if (!companyMentions[comp.company]) {
            companyMentions[comp.company] = {
              count: 0,
              totalScore: 0,
              positions: [],
            };
          }
          companyMentions[comp.company].count++;
          companyMentions[comp.company].totalScore += comp.score || 0;
          companyMentions[comp.company].positions.push(index + 1);
        }
      });
    }
  });

  // Find the company with the most mentions and highest average score
  let bestCompany = null;
  let bestScore = 0;

  Object.keys(companyMentions).forEach((company) => {
    const mentions = companyMentions[company];
    const avgScore = mentions.totalScore / mentions.count;
    const avgPosition =
      mentions.positions.reduce((sum, pos) => sum + pos, 0) /
      mentions.positions.length;

    // Score based on mentions, average score, and position (lower position is better)
    const companyScore = mentions.count * 2 + avgScore - avgPosition * 0.5;

    if (companyScore > bestScore) {
      bestScore = companyScore;
      bestCompany = company;
    }
  });

  if (bestCompany) {
    mergedData.report_metadata.company = bestCompany;
    console.log(
      `✅ Extracted company name: ${bestCompany} (mentions: ${
        companyMentions[bestCompany].count
      }, avg score: ${(
        companyMentions[bestCompany].totalScore /
        companyMentions[bestCompany].count
      ).toFixed(1)})`
    );
  }
}

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

// Add input analysis to the output for debugging
mergedData.input_analysis = {
  total_inputs: inputItems.length,
  inputs_with_data: inputAnalysis.withData,
  empty_inputs: inputAnalysis.empty,
  unique_keys_found: Array.from(inputAnalysis.sampleKeys),
  sample_inputs: inputAnalysis.sampleData,
};

// Final summary
console.log("\n=== FINAL MERGED DATA SUMMARY ===");
console.log(`Company: ${mergedData.report_metadata.company}`);
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
  if (scenario.competitors_ranked && scenario.competitors_ranked.length > 0) {
    scenario.competitors_ranked.forEach((comp, idx) => {
      console.log(`    ${idx + 1}. ${comp.company}: ${comp.score || "N/A"}`);
    });
  }
});

// Debug citation details
console.log("\n=== CITATION DETAILS ===");
console.log(`Sample citations (first 3):`);
mergedData.enhanced_citations.slice(0, 3).forEach((citation, index) => {
  console.log(`  ${index + 1}. ${citation.claim_text?.substring(0, 50)}...`);
  console.log(`     Source: ${citation.source_url || "No URL"}`);
  console.log(`     Authority: ${citation.authority_score}/10`);
});

return [{ json: mergedData }];
