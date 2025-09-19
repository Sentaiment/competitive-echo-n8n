/**
 * n8n Code node (JavaScript)
 * Generate HTML Report (SCENARIOS + H2H + CITATIONS/DATA SOURCES)
 * - Accepts upstream in multiple shapes (array wrapper, nested keys, stringified JSON).
 * - Renders dynamic, client-side UI with selector, calculations, and robust source metadata.
 * - Enhanced with detailed citation data from workflow processing
 * Output: items[0].json = { html, filename }
 */

console.log("=== ENHANCED HTML REPORT GENERATOR ===");

// Get all input items to merge data from different workflow branches
const inputItems = $input.all();
console.log("Total input items:", inputItems.length);

// Debug: Show what input data we're receiving
inputItems.forEach((item, index) => {
  console.log(`\n--- Input Item ${index} ---`);
  console.log("Item keys:", Object.keys(item || {}));
  console.log("JSON keys:", Object.keys(item?.json || {}));
  console.log(
    "JSON sample:",
    JSON.stringify(item?.json, null, 2).substring(0, 500)
  );
});

// Check if we have any data at all
if (inputItems.length === 0) {
  console.log("ERROR: No input items received!");
  throw new Error("No input data received from workflow");
}

// Initialize the target structure
let mergedData = {
  report_metadata: {
    company: "Unknown Company",
    total_scenarios: 0,
    competitors_analyzed: [],
  },
  scenarios: [],
  enhanced_citations: [],
  data_sources_table: [],
  quality_metrics: {},
};

// Process each input item to merge all available data
inputItems.forEach((item, index) => {
  const data = item.json || {};
  console.log(`\n--- Processing Item ${index} ---`);
  console.log("Available keys:", Object.keys(data));

  // Handle scenario_rankings data (from second document structure)
  if (data.scenario_rankings && Array.isArray(data.scenario_rankings)) {
    console.log("Found scenario_rankings:", data.scenario_rankings.length);

    // Convert scenario_rankings to the target scenarios format
    const convertedScenarios = data.scenario_rankings.map((ranking) => ({
      scenario_id: ranking.scenario_id || 0,
      title: ranking.scenario_title || `Scenario ${ranking.scenario_id || 0}`,
      // Build top_competitors from analysis_details if competitors_ranked is empty
      top_competitors: (() => {
        // First try to use competitors_ranked if it exists and has data
        if (
          ranking.competitors_ranked &&
          ranking.competitors_ranked.length > 0
        ) {
          return ranking.competitors_ranked.map((comp) => {
            const companyName = comp.company || comp.name || comp;

            // Extract detailed metrics from analysis_details if available
            let detailedMetrics = {};
            let enhancedRationale =
              comp.rationale ||
              comp.reasoning ||
              comp.explanation ||
              comp.notes ||
              "";

            if (
              ranking.analysis_details &&
              ranking.analysis_details[companyName]
            ) {
              const analysisDetail = ranking.analysis_details[companyName];

              // Extract metrics (scores for different dimensions)
              if (
                analysisDetail.metrics &&
                typeof analysisDetail.metrics === "object"
              ) {
                detailedMetrics = { ...analysisDetail.metrics };
              }

              // Enhance rationale with summary and highlights
              const summaryText = analysisDetail.summary || "";
              const highlightsText = (analysisDetail.highlights || []).join(
                "; "
              );

              if (summaryText || highlightsText) {
                enhancedRationale = [
                  summaryText,
                  highlightsText,
                  enhancedRationale,
                ]
                  .filter((text) => text && text.length > 0)
                  .join(" | ");
              }
            }

            return {
              company: companyName,
              score: comp.score || comp.rating || comp.value || null,
              rationale: enhancedRationale,
              rank: comp.rank || comp.position || null,
              detailed_metrics: detailedMetrics,
              ...comp,
            };
          });
        }

        // If no competitors_ranked, build from analysis_details
        if (
          ranking.analysis_details &&
          typeof ranking.analysis_details === "object"
        ) {
          const competitors = Object.entries(ranking.analysis_details).map(
            ([companyName, analysisDetail], index) => {
              // Calculate overall score from metrics if available
              let overallScore = null;
              let detailedMetrics = {};

              if (
                analysisDetail.metrics &&
                typeof analysisDetail.metrics === "object"
              ) {
                detailedMetrics = { ...analysisDetail.metrics };
                // Calculate average score from metrics
                const metricValues = Object.values(
                  analysisDetail.metrics
                ).filter((val) => typeof val === "number");
                if (metricValues.length > 0) {
                  overallScore = (
                    metricValues.reduce((sum, val) => sum + val, 0) /
                    metricValues.length
                  ).toFixed(1);
                }
              }

              // Build rationale from summary and highlights
              const summaryText = analysisDetail.summary || "";
              const highlightsText = (analysisDetail.highlights || []).join(
                "; "
              );
              const rationale = [summaryText, highlightsText]
                .filter((text) => text && text.length > 0)
                .join(" | ");

              return {
                company: companyName,
                score: overallScore,
                rationale: rationale,
                rank: index + 1,
                detailed_metrics: detailedMetrics,
              };
            }
          );

          // Sort by score (highest first) if scores are available
          competitors.sort((a, b) => {
            const scoreA = parseFloat(a.score) || 0;
            const scoreB = parseFloat(b.score) || 0;
            return scoreB - scoreA;
          });

          // Update ranks after sorting
          competitors.forEach((comp, index) => {
            comp.rank = index + 1;
          });

          return competitors;
        }

        // Fallback to empty array
        return [];
      })(),
      key_findings: ranking.key_findings || [],
      sources: ranking.analysis_details
        ? Object.values(ranking.analysis_details).flatMap(
            (detail) => detail.sources || []
          )
        : [],
    }));

    mergedData.scenarios = mergedData.scenarios.concat(convertedScenarios);
  }

  // Handle direct scenarios data (from first document structure)
  if (data.scenarios && Array.isArray(data.scenarios)) {
    console.log("Found scenarios:", data.scenarios.length);
    mergedData.scenarios = mergedData.scenarios.concat(
      data.scenarios.map((scenario) => ({
        scenario_id: scenario.scenario_id || 0,
        title: scenario.title || `Scenario ${scenario.scenario_id || 0}`,
        // Preserve all competitor ranking data including scores, rationale, etc.
        top_competitors: (scenario.top_competitors || []).map((comp) => ({
          company: comp.company || comp.name || comp,
          score: comp.score || comp.rating || comp.value || null,
          rationale:
            comp.rationale ||
            comp.reasoning ||
            comp.explanation ||
            comp.notes ||
            "",
          rank: comp.rank || comp.position || null,
          // Preserve any additional fields that might be present
          ...comp,
        })),
        key_findings: scenario.key_findings || [],
        sources: scenario.sources || [],
      }))
    );
  }

  // Handle enhanced citations data from multiple possible sources
  if (data.enhanced_citations && Array.isArray(data.enhanced_citations)) {
    console.log("Found enhanced_citations:", data.enhanced_citations.length);
    mergedData.enhanced_citations = mergedData.enhanced_citations.concat(
      data.enhanced_citations
    );
  }

  // Handle source_citations from workflow processing
  if (data.source_citations && Array.isArray(data.source_citations)) {
    console.log("Found source_citations:", data.source_citations.length);
    mergedData.enhanced_citations = mergedData.enhanced_citations.concat(
      data.source_citations
    );
  }

  // Handle citations from scraping results
  if (data.scraping_results && Array.isArray(data.scraping_results)) {
    console.log("Found scraping_results:", data.scraping_results.length);
    mergedData.enhanced_citations = mergedData.enhanced_citations.concat(
      data.scraping_results
    );
  }

  // Handle citations from research results
  if (data.research_results && Array.isArray(data.research_results)) {
    console.log("Found research_results:", data.research_results.length);
    mergedData.enhanced_citations = mergedData.enhanced_citations.concat(
      data.research_results
    );
  }

  // Handle quality metrics
  if (data.quality_metrics) {
    mergedData.quality_metrics = {
      ...mergedData.quality_metrics,
      ...data.quality_metrics,
    };
  }

  // Handle other data types
  if (data.report_metadata) {
    mergedData.report_metadata = {
      company:
        data.report_metadata.company ||
        mergedData.report_metadata.company ||
        "Unknown Company",
      total_scenarios:
        data.report_metadata.total_scenarios ||
        mergedData.report_metadata.total_scenarios ||
        0,
      competitors_analyzed:
        data.report_metadata.competitors_analyzed ||
        mergedData.report_metadata.competitors_analyzed ||
        [],
    };
  }

  // Additional fallback: try to extract company name from scenarios if not found
  if (mergedData.report_metadata.company === "Unknown Company") {
    // Try to get company name from the first scenario's top competitor
    if (
      mergedData.scenarios.length > 0 &&
      mergedData.scenarios[0].top_competitors.length > 0
    ) {
      const firstCompany = mergedData.scenarios[0].top_competitors[0].company;
      if (firstCompany) {
        mergedData.report_metadata.company = firstCompany;
        console.log(
          "Extracted company name from first scenario:",
          firstCompany
        );
      }
    }

    // Try to get company name from data.company, data.company_name, etc.
    if (
      data.company &&
      mergedData.report_metadata.company === "Unknown Company"
    ) {
      mergedData.report_metadata.company = data.company;
      console.log("Extracted company name from data.company:", data.company);
    }
    if (
      data.company_name &&
      mergedData.report_metadata.company === "Unknown Company"
    ) {
      mergedData.report_metadata.company = data.company_name;
      console.log(
        "Extracted company name from data.company_name:",
        data.company_name
      );
    }
    if (
      data.target_company &&
      mergedData.report_metadata.company === "Unknown Company"
    ) {
      mergedData.report_metadata.company = data.target_company;
      console.log(
        "Extracted company name from data.target_company:",
        data.target_company
      );
    }
  }

  // Handle data sources from multiple possible locations
  if (data.data_sources_table) {
    mergedData.data_sources_table = mergedData.data_sources_table.concat(
      data.data_sources_table
    );
  }
  if (data.data_sources) {
    mergedData.data_sources_table = mergedData.data_sources_table.concat(
      data.data_sources
    );
  }
  if (data.source_citations) {
    mergedData.data_sources_table = mergedData.data_sources_table.concat(
      data.source_citations
    );
  }

  // Handle sources from scenarios
  if (data.scenarios && Array.isArray(data.scenarios)) {
    data.scenarios.forEach((scenario) => {
      if (scenario.sources && Array.isArray(scenario.sources)) {
        scenario.sources.forEach((source) => {
          if (typeof source === "string") {
            mergedData.data_sources_table.push({
              title: source,
              url: "",
              publisher: "",
              published: "",
              reliability: "",
              authority: "",
              author: "",
              notes: "",
              source_origin: "scenario_reference",
            });
          } else if (typeof source === "object") {
            // Helper function to generate specific URLs for common sources
            function generateSpecificUrlForSource(sourceName, sourceType) {
              const source = sourceName.toLowerCase();

              // Forbes Travel Guide specific URLs
              if (
                source.includes("forbes travel guide") ||
                source.includes("forbestravelguide")
              ) {
                return "https://www.forbestravelguide.com/awards";
              }

              // J.D. Power specific URLs
              if (source.includes("j.d. power") || source.includes("jdpower")) {
                return "https://www.jdpower.com/business/press-releases/2023-north-america-hotel-guest-satisfaction-study";
              }

              // Travel + Leisure specific URLs
              if (
                source.includes("travel + leisure") ||
                source.includes("travelandleisure")
              ) {
                return "https://www.travelandleisure.com/hotels-resorts/las-vegas-luxury-hotels";
              }

              // TripAdvisor specific URLs
              if (source.includes("tripadvisor")) {
                return "https://www.tripadvisor.com/Hotels-g45963-Las_Vegas_Nevada-Hotels.html";
              }

              // Las Vegas Review-Journal specific URLs
              if (
                source.includes("las vegas review-journal") ||
                source.includes("reviewjournal")
              ) {
                return "https://www.reviewjournal.com/business/tourism/";
              }

              // James Beard Foundation specific URLs
              if (source.includes("james beard")) {
                return "https://www.jamesbeard.org/awards";
              }

              // AAA specific URLs
              if (source.includes("aaa") && source.includes("diamond")) {
                return "https://www.aaa.com/travel/hotels/diamond-ratings/";
              }

              // MGM Resorts specific URLs
              if (source.includes("mgm") && source.includes("esg")) {
                return "https://www.mgmresorts.com/en/company/esg.html";
              }

              // Wynn Resorts specific URLs
              if (
                source.includes("wynn") &&
                (source.includes("annual") || source.includes("report"))
              ) {
                return "https://investor.wynnresorts.com/annual-reports";
              }

              // Return null if no specific URL can be generated
              return null;
            }

            const sourceTitle =
              source.title || source.name || source.source || "";
            const specificUrl = generateSpecificUrlForSource(
              sourceTitle,
              "scenario_source"
            );
            const finalUrl = specificUrl || source.url || source.link || "";

            mergedData.data_sources_table.push({
              title: sourceTitle,
              url: finalUrl,
              publisher:
                source.publisher || source.outlet || source.domain || "",
              published: source.published || source.date || "",
              reliability: source.reliability || "",
              authority: source.authority || source.authority_score || "",
              author: source.author || source.byline || "",
              notes: source.notes || source.note || "",
              source_origin: source.source_origin || "scenario_reference",
            });
          }
        });
      }
    });
  }
});

console.log("\n=== REMOVING DUPLICATES ===");
console.log("Scenarios before deduplication:", mergedData.scenarios.length);
console.log(
  "Enhanced citations before deduplication:",
  mergedData.enhanced_citations.length
);

// Remove duplicates, keeping the scenario with the most complete data
const uniqueScenarios = [];
const scenarioGroups = new Map();

// Group scenarios by ID
mergedData.scenarios.forEach((scenario) => {
  const id = scenario.scenario_id;
  if (!scenarioGroups.has(id)) {
    scenarioGroups.set(id, []);
  }
  scenarioGroups.get(id).push(scenario);
});

// For each group, keep the scenario with the most data
scenarioGroups.forEach((scenarios, id) => {
  if (scenarios.length === 1) {
    uniqueScenarios.push(scenarios[0]);
  } else {
    // Find the scenario with the most complete data
    const bestScenario = scenarios.reduce((best, current) => {
      const bestScore =
        (best.top_competitors?.length || 0) + (best.sources?.length || 0);
      const currentScore =
        (current.top_competitors?.length || 0) + (current.sources?.length || 0);
      return currentScore > bestScore ? current : best;
    });
    uniqueScenarios.push(bestScenario);
  }
});

// Sort by scenario_id to maintain order
uniqueScenarios.sort((a, b) => a.scenario_id - b.scenario_id);

// Update the final data
mergedData.scenarios = uniqueScenarios;
mergedData.report_metadata.total_scenarios = uniqueScenarios.length;
mergedData.report_metadata.competitors_analyzed = [
  ...new Set(
    uniqueScenarios.flatMap((s) => s.top_competitors.map((c) => c.company || c))
  ),
];

// Remove duplicate data sources
mergedData.data_sources_table = [...new Set(mergedData.data_sources_table)];

// Remove duplicate enhanced citations and merge with data_sources_table
const uniqueCitations = [];
const citationMap = new Map();
mergedData.enhanced_citations.forEach((citation) => {
  // Create a more robust key for deduplication
  const key = `${citation.claim_text || citation.title || "unknown"}_${
    citation.source_url || citation.url || "no_url"
  }`;
  if (!citationMap.has(key)) {
    citationMap.set(key, citation);
    uniqueCitations.push(citation);

    // Helper function to generate specific URLs for common sources
    function generateSpecificUrl(sourceName, sourceType) {
      const source = sourceName.toLowerCase();

      // Forbes Travel Guide specific URLs
      if (
        source.includes("forbes travel guide") ||
        source.includes("forbestravelguide")
      ) {
        return "https://www.forbestravelguide.com/awards";
      }

      // J.D. Power specific URLs
      if (source.includes("j.d. power") || source.includes("jdpower")) {
        return "https://www.jdpower.com/business/press-releases/2023-north-america-hotel-guest-satisfaction-study";
      }

      // Travel + Leisure specific URLs
      if (
        source.includes("travel + leisure") ||
        source.includes("travelandleisure")
      ) {
        return "https://www.travelandleisure.com/hotels-resorts/las-vegas-luxury-hotels";
      }

      // TripAdvisor specific URLs
      if (source.includes("tripadvisor")) {
        return "https://www.tripadvisor.com/Hotels-g45963-Las_Vegas_Nevada-Hotels.html";
      }

      // Las Vegas Review-Journal specific URLs
      if (
        source.includes("las vegas review-journal") ||
        source.includes("reviewjournal")
      ) {
        return "https://www.reviewjournal.com/business/tourism/";
      }

      // James Beard Foundation specific URLs
      if (source.includes("james beard")) {
        return "https://www.jamesbeard.org/awards";
      }

      // AAA specific URLs
      if (source.includes("aaa") && source.includes("diamond")) {
        return "https://www.aaa.com/travel/hotels/diamond-ratings/";
      }

      // MGM Resorts specific URLs
      if (source.includes("mgm") && source.includes("esg")) {
        return "https://www.mgmresorts.com/en/company/esg.html";
      }

      // Wynn Resorts specific URLs
      if (
        source.includes("wynn") &&
        (source.includes("annual") || source.includes("report"))
      ) {
        return "https://investor.wynnresorts.com/annual-reports";
      }

      // Return null if no specific URL can be generated
      return null;
    }

    // Convert enhanced citation to data source format for the table
    const citationTitle =
      citation.claim_text || citation.title || "No claim text";
    const specificUrl = generateSpecificUrl(citationTitle, "enhanced_citation");
    const finalUrl = specificUrl || citation.source_url || citation.url || "";

    const dataSource = {
      title: citationTitle,
      url: finalUrl,
      publisher:
        citation.source_domain || citation.publisher || citation.domain || "",
      published:
        citation.publication_date || citation.published || citation.date || "",
      reliability: citation.confidence_level || citation.reliability || "",
      authority: citation.authority_score || citation.authority || "",
      author: citation.author || citation.byline || "",
      notes:
        citation.supporting_evidence ||
        citation.notes ||
        citation.description ||
        "",
      // Enhanced citation metadata
      claim_category: citation.claim_category || "",
      claim_impact_score: citation.claim_impact_score || "",
      source_type: citation.source_type || "",
      verification_status: citation.verification_status || "",
      source_origin: citation.source_origin || "",
      real_time_indicators: citation.real_time_indicators || [],
      influence_weight: citation.influence_weight || 0,
      // Additional metadata
      content_type: citation.content_type || "",
      bias_indicators: citation.bias_indicators || "",
      cross_references: citation.cross_references || 0,
      sentiment_direction: citation.sentiment_direction || "",
      brand_mention_type: citation.brand_mention_type || "",
      strategic_relevance: citation.strategic_relevance || "",
      actionability_score: citation.actionability_score || "",
      geographic_scope: citation.geographic_scope || "",
      time_sensitivity: citation.time_sensitivity || "",
      tags: citation.tags || [],
    };
    mergedData.data_sources_table.push(dataSource);
  }
});
mergedData.enhanced_citations = uniqueCitations;

console.log("\n=== FINAL RESULTS ===");
console.log(
  "Total scenarios after deduplication:",
  mergedData.scenarios.length
);
console.log(
  "Competitors found:",
  mergedData.report_metadata.competitors_analyzed.length
);
console.log("Unique enhanced citations:", mergedData.enhanced_citations.length);
console.log(
  "Total data sources (including citations):",
  mergedData.data_sources_table.length
);

// Debug: Show sample of enhanced citations
if (mergedData.enhanced_citations.length > 0) {
  console.log("\n=== SAMPLE ENHANCED CITATIONS ===");
  mergedData.enhanced_citations.slice(0, 3).forEach((citation, index) => {
    console.log(`Citation ${index + 1}:`, {
      claim_text: citation.claim_text || citation.title,
      source_url: citation.source_url || citation.url,
      authority_score: citation.authority_score || citation.authority,
      verification_status: citation.verification_status,
      source_origin: citation.source_origin,
    });
  });
}

// Debug: Show sample of data sources
if (mergedData.data_sources_table.length > 0) {
  console.log("\n=== SAMPLE DATA SOURCES ===");
  mergedData.data_sources_table.slice(0, 3).forEach((source, index) => {
    console.log(`Source ${index + 1}:`, {
      title: source.title,
      url: source.url,
      publisher: source.publisher,
      authority: source.authority,
      source_origin: source.source_origin,
    });
  });
}

// Use the merged data as the report object
const report = mergedData;

/* ----------------------- Utilities (server-side) ----------------------- */

function escHtml(s = "") {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function safeJsonForScript(obj) {
  // Prevent </script> breakouts and odd chars breaking <script> tag
  return JSON.stringify(obj)
    .replace(/</g, "\\u003C")
    .replace(/>/g, "\\u003E")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

function tryParse(x) {
  if (typeof x === "string") {
    try {
      return JSON.parse(x);
    } catch {
      return x;
    }
  }
  return x;
}

function isReportObject(o) {
  return o && typeof o === "object" && Array.isArray(o.scenarios);
}

/**
 * Accepts:
 * - the report object directly
 * - [ reportObject ]
 * - { data|payload|body|result|report: reportObject or [reportObject] }
 * - stringified variants of any of the above
 */
function extractReportFromAny(raw) {
  let cand = tryParse(raw);
  if (isReportObject(cand)) return cand;

  if (Array.isArray(cand)) {
    if (cand.length === 1 && isReportObject(cand[0])) return cand[0];
    const found = cand.find(isReportObject);
    if (found) return found;
  }

  const keys = ["data", "payload", "body", "result", "report"];
  for (const k of keys) {
    if (cand && typeof cand === "object" && k in cand) {
      const sub = tryParse(cand[k]);
      if (isReportObject(sub)) return sub;
      if (Array.isArray(sub)) {
        if (sub.length === 1 && isReportObject(sub[0])) return sub[0];
        const found = sub.find(isReportObject);
        if (found) return found;
      }
    }
  }

  if (typeof cand === "string") {
    const again = tryParse(cand);
    if (isReportObject(again)) return again;
    if (Array.isArray(again)) {
      if (again.length === 1 && isReportObject(again[0])) return again[0];
      const found = again.find(isReportObject);
      if (found) return found;
    }
  }

  if (cand && typeof cand === "object") {
    const vals = Object.values(cand).map(tryParse);
    for (const v of vals) {
      if (isReportObject(v)) return v;
      if (Array.isArray(v)) {
        if (v.length === 1 && isReportObject(v[0])) return v[0];
        const found = v.find(isReportObject);
        if (found) return found;
      }
    }
  }

  let snapshot = "";
  try {
    snapshot = JSON.stringify(cand, null, 2);
  } catch {}
  const err = new Error(
    "Could not find report object with .scenarios[] in input"
  );
  err.snapshot = snapshot.slice(0, 1000);
  throw err;
}

/* ----------------------- Get Input ----------------------- */

// Use our merged data as the report, but also try to extract from input for compatibility
let finalReport = mergedData;
try {
  // Try to extract from the first input item if available
  if (inputItems.length > 0 && inputItems[0].json) {
    const extractedReport = extractReportFromAny(inputItems[0].json);
    // Merge extracted report with our enhanced data
    if (extractedReport && isReportObject(extractedReport)) {
      finalReport = {
        ...extractedReport,
        ...mergedData,
        // Preserve original scenarios if they exist and are different
        scenarios:
          mergedData.scenarios.length > 0
            ? mergedData.scenarios
            : extractedReport.scenarios,
        // Always use our enhanced data sources
        data_sources_table: mergedData.data_sources_table,
        enhanced_citations: mergedData.enhanced_citations,
      };
    }
  }
} catch (e) {
  console.log(
    "Could not extract report from input, using merged data:",
    e.message
  );
}

// Debug: Log the final report structure
console.log("\n=== FINAL REPORT STRUCTURE ===");
console.log("Report keys:", Object.keys(finalReport));
console.log("Scenarios count:", finalReport.scenarios?.length || 0);
console.log("Data sources count:", finalReport.data_sources_table?.length || 0);
console.log(
  "Enhanced citations count:",
  finalReport.enhanced_citations?.length || 0
);
console.log("Report metadata:", finalReport.report_metadata);

// If we still have no data, try to use the input directly
if (
  finalReport.scenarios?.length === 0 &&
  finalReport.data_sources_table?.length === 0
) {
  console.log("No data in final report, trying to use input directly...");
  if (inputItems.length > 0 && inputItems[0].json) {
    const inputData = inputItems[0].json;
    console.log("Input data keys:", Object.keys(inputData));

    // Try to use the input data directly if it has the right structure
    if (inputData.scenarios && Array.isArray(inputData.scenarios)) {
      finalReport.scenarios = inputData.scenarios;
      console.log("Using input scenarios:", inputData.scenarios.length);
    }
    if (
      inputData.data_sources_table &&
      Array.isArray(inputData.data_sources_table)
    ) {
      finalReport.data_sources_table = inputData.data_sources_table;
      console.log(
        "Using input data sources:",
        inputData.data_sources_table.length
      );
    }
    if (
      inputData.enhanced_citations &&
      Array.isArray(inputData.enhanced_citations)
    ) {
      finalReport.enhanced_citations = inputData.enhanced_citations;
      console.log(
        "Using input enhanced citations:",
        inputData.enhanced_citations.length
      );
    }
    if (inputData.report_metadata) {
      finalReport.report_metadata = inputData.report_metadata;
      console.log("Using input report metadata:", inputData.report_metadata);
    }
  }
}

const reportToUse = finalReport;

/* ----------------------- Derived/Core ----------------------- */

const meta = reportToUse.report_metadata || {};
const company = meta.company || "Unknown Company";
const scenarios = Array.isArray(reportToUse.scenarios)
  ? reportToUse.scenarios
  : [];
const dataSourcesTable = Array.isArray(reportToUse.data_sources_table)
  ? reportToUse.data_sources_table
  : [];
const enhancedCitations = Array.isArray(reportToUse.enhanced_citations)
  ? reportToUse.enhanced_citations
  : [];
const generatedAt = new Date().toISOString();

// Debug: Log the final data structure
console.log("\n=== FINAL REPORT DATA ===");
console.log("Company:", company);
console.log("Scenarios count:", scenarios.length);
console.log("Data sources count:", dataSourcesTable.length);
console.log("Enhanced citations count:", enhancedCitations.length);
console.log("Report metadata:", meta);
if (scenarios.length > 0) {
  console.log("First scenario:", scenarios[0]);
}
if (dataSourcesTable.length > 0) {
  console.log("First data source:", dataSourcesTable[0]);
}

// Additional debugging for the JavaScript data
console.log("\n=== JAVASCRIPT DATA DEBUG ===");
console.log("REPORT object keys:", Object.keys(reportToUse));
console.log("REPORT.scenarios:", reportToUse.scenarios?.length || 0);
console.log(
  "REPORT.data_sources_table:",
  reportToUse.data_sources_table?.length || 0
);
console.log(
  "REPORT.enhanced_citations:",
  reportToUse.enhanced_citations?.length || 0
);

// If no data found, create a fallback report
if (scenarios.length === 0 && dataSourcesTable.length === 0) {
  console.log("No data found, creating fallback report...");

  // Create a sample scenario for demonstration
  const sampleScenario = {
    scenario_id: 1,
    title: "Sample Competitive Analysis",
    top_competitors: [
      { rank: 1, company: "Sample Company A", score: 8.5 },
      { rank: 2, company: "Sample Company B", score: 7.8 },
      { rank: 3, company: "Sample Company C", score: 7.2 },
    ],
    key_findings: [
      "This is a sample competitive analysis scenario",
      "Data sources are being processed and will appear here",
      "The report will update once data is available",
    ],
    sources: ["Sample data source 1", "Sample data source 2"],
  };

  scenarios.push(sampleScenario);

  // Create sample data sources
  const sampleDataSources = [
    {
      title: "Sample Industry Report",
      url: "https://example.com/industry-report",
      publisher: "Sample Publisher",
      published: "2024",
      authority: "8",
      source_origin: "sample_data",
    },
  ];

  dataSourcesTable.push(...sampleDataSources);

  console.log("Created fallback data:", {
    scenarios: scenarios.length,
    dataSources: dataSourcesTable.length,
  });
}

// Calculate citation metrics
const totalCitations = enhancedCitations.length;
const highAuthorityCitations = enhancedCitations.filter(
  (c) => (c.authority_score || 0) >= 8
).length;
const verifiedCitations = enhancedCitations.filter(
  (c) => c.verification_status === "verified"
).length;
const realTimeSources = enhancedCitations.filter(
  (c) => c.source_origin === "real_time_search"
).length;

console.log("Report summary:");
console.log("- Company:", company);
console.log("- Scenarios:", scenarios.length);
console.log("- Enhanced Citations:", totalCitations);
console.log("- High Authority Citations:", highAuthorityCitations);
console.log("- Data Sources:", dataSourcesTable.length);

/* ----------------------- HTML ----------------------- */

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Competitive Report — ${escHtml(company)}</title>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  :root { --paper:#fff; --ink:#111827; --muted:#6b7280; --line:#e6e8f0; --accent:#5b6bff; }
  *{box-sizing:border-box}
  html,body{margin:0;padding:0;background:#f6f7fb;color:var(--ink);font-family:Inter,ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial}
  a{color:#2947ff;text-decoration:none}
  .wrap{max-width:1200px;margin:0 auto;padding:24px 16px 64px}
  .meta{color:var(--muted);font-size:12px;margin-bottom:8px}
  .card{background:var(--paper);border:1px solid var(--line);border-radius:16px;padding:18px;margin:14px 0;box-shadow:0 1px 0 rgba(16,24,40,.02)}
  h1{font-size:22px;margin:0 0 8px} h2{font-size:18px;margin:0 0 10px}
  .lede{color:#374151;margin:4px 0 16px}
  .kpiRow{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}
  .kpiBig{background:#f8fafc;border:1px solid var(--line);border-radius:14px;padding:16px}
  .kpiBig .big{font-size:32px;font-weight:700}
  .kpiBig .sub{color:#6b7280;margin-top:6px}
  .table-wrap{overflow:auto;border-radius:12px;border:1px solid var(--line)}
  table{width:100%;border-collapse:collapse;min-width:1000px}
  th,td{text-align:left;padding:12px 10px;border-bottom:1px solid var(--line);vertical-align:top}
  th{font-weight:600;color:#374151;background:#fbfbfe;position:sticky;top:0}
  .rank{font-weight:700}
  .foot.small{font-size:12px;margin-top:8px;color:#6b7280}
  .grid2{display:grid;grid-template-columns:2fr 1fr;gap:12px}
  .list{margin:0;padding-left:18px}
  .muted{color:#6b7280}
  select, .select{padding:8px 10px;border:1px solid var(--line);border-radius:10px;background:#fff}
  .section-head{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
  .badge{display:inline-block;padding:2px 8px;border-radius:999px;background:#eef2ff;color:#3730a3;font-size:12px;border:1px solid #e5e7eb}
  .badge.high-authority{background:#dcfce7;color:#166534;border-color:#bbf7d0}
  .badge.medium-authority{background:#fef3c7;color:#92400e;border-color:#fde68a}
  .badge.low-authority{background:#fee2e2;color:#991b1b;border-color:#fecaca}
  .badge.verified{background:#dcfce7;color:#166534;border-color:#bbf7d0}
  .badge.unverified{background:#f3f4f6;color:#374151;border-color:#d1d5db}
  .badge.real-time{background:#dbeafe;color:#1e40af;border-color:#93c5fd}
  .badge.training-data{background:#e9d5ff;color:#7c3aed;border-color:#c4b5fd}
  .badge.url-valid{background:#dcfce7;color:#166534;border-color:#bbf7d0}
  .badge.url-invalid{background:#fee2e2;color:#991b1b;border-color:#fecaca}
  .badge.url-unknown{background:#fef3c7;color:#92400e;border-color:#fde68a}
  .note{font-size:12px;color:#6b7280}
  .pill{display:inline-block;padding:2px 6px;border:1px solid #e5e7eb;border-radius:999px;font-size:11px;color:#374151;background:#f8fafc}
  .nowrap{white-space:nowrap}
  .citation-meta{font-size:11px;color:#6b7280;margin-top:4px}
  .authority-bar{width:100%;height:3px;background:#e5e7eb;border-radius:2px;overflow:hidden;margin-top:2px}
  .authority-fill{height:100%;background:linear-gradient(90deg,#ef4444 0%,#f59e0b 50%,#10b981 100%);border-radius:2px}
  .metrics-cell{max-width:250px}
  .metrics-grid{display:flex;flex-direction:column;gap:2px}
  .metric-item{font-size:11px;color:#374151;white-space:nowrap}
  @media (max-width:1000px){
    .kpiRow{grid-template-columns:repeat(2,minmax(0,1fr))}
    .grid2{grid-template-columns:1fr}
    table{min-width:720px}
  }
  @media print{
    html,body{background:#fff}
    .wrap{max-width:none;padding:0}
    .card{box-shadow:none;border:0;border-radius:0;padding:0;margin:0 0 12px 0}
    select{display:none}
  }
</style>
</head>
<body>
  <div class="wrap">
    <div class="meta">
      Company ${escHtml(company)} • Scenarios ${
  scenarios.length
} • Citations ${totalCitations} • Generated ${escHtml(generatedAt)}
    </div>

    <!-- Strategic Summary -->
    <section class="card" aria-labelledby="summary-h1">
      <h1 id="summary-h1">Strategic Summary</h1>
      <p class="lede">KPIs computed from scenario outcomes for <strong>${escHtml(
        company
      )}</strong>.</p>
      <div class="kpiRow">
        <div class="kpiBig" role="group" aria-label="Win Rate"><div class="big" id="kpi-winrate">—</div><div class="sub">Win Rate</div></div>
        <div class="kpiBig" role="group" aria-label="Average Position"><div class="big" id="kpi-avgpos">—</div><div class="sub">Average Position</div></div>
        <div class="kpiBig" role="group" aria-label="Scenarios Analyzed"><div class="big" id="kpi-scenarios">${
          scenarios.length
        }</div><div class="sub">Scenarios</div></div>
        <div class="kpiBig" role="group" aria-label="High Authority Citations"><div class="big" id="kpi-citations">${highAuthorityCitations}</div><div class="sub">High Authority Citations</div></div>
      </div>
    </section>

    <!-- Head-to-Head Aggregate -->
    <section class="card" aria-labelledby="h2-h2h">
      <h2 id="h2-h2h">Head-to-Head (All Scenarios)</h2>
      <div class="table-wrap">
        <table aria-describedby="h2-h2h" id="h2h-table">
          <thead>
            <tr>
              <th>Rank</th><th>Company</th><th>Wins</th><th>Scenarios</th>
              <th>Avg Position</th><th>Win Rate</th>
            </tr>
          </thead>
          <tbody></tbody>
        </table>
      </div>
      <div class="foot small">Derived from ${
        scenarios.length
      } scenario(s).</div>
    </section>

    <!-- Scenario Details with Selector -->
    <section class="card" aria-labelledby="h2-scenarios">
      <div class="section-head">
        <h2 id="h2-scenarios">Scenario Details</h2>
        <label class="muted">Scenario:
          <select id="scenario-select" class="select" aria-label="Select Scenario"></select>
        </label>
      </div>

      <div id="scenario-block">
        <div class="grid2" style="margin-bottom:10px">
          <div>
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
              <h3 id="sc-title" style="margin:0;font-size:16px">—</h3>
              <span id="sc-id" class="badge">ID —</span>
            </div>
            <ul id="sc-keyfindings" class="list"></ul>
          </div>
          <div>
            <h4 style="margin:0 0 6px">Scenario Sources</h4>
            <ul id="sc-sources" class="list"></ul>
          </div>
        </div>

        <div class="table-wrap">
          <table id="sc-top-table" aria-label="Top Competitors">
            <thead>
              <tr><th>Rank</th><th>Company</th><th>Score</th><th>Detailed Metrics</th><th>Reasoning</th></tr>
            </thead>
            <tbody></tbody>
          </table>
        </div>
      </div>
    </section>

    <!-- Evidence & Citations -->
    <section class="card" aria-labelledby="h2-evidence">
      <h2 id="h2-evidence">Evidence & Citations</h2>
      <div class="note" style="margin-bottom:8px">
        Consolidated list from <code>data_sources_table</code> and enhanced citations. 
        ${
          totalCitations > 0
            ? `Includes ${totalCitations} detailed citations with authority scores, verification status, and source metadata.`
            : ""
        }
        ${
          highAuthorityCitations > 0
            ? ` ${highAuthorityCitations} high-authority citations (≥8/10).`
            : ""
        }
      </div>
      <div class="table-wrap" style="margin-top:12px">
        <table aria-label="Consolidated Sources" id="consolidated-sources">
          <thead>
            <tr>
              <th>#</th>
              <th>Title/Claim</th>
              <th>Publisher/Domain</th>
              <th>Published</th>
              <th class="nowrap">Authority</th>
              <th class="nowrap">Status</th>
              <th>Origin</th>
              <th>Category</th>
              <th>Impact</th>
              <th class="nowrap">URL Status</th>
              <th>Link</th>
            </tr>
          </thead>
          <tbody></tbody>
        </table>
      </div>
      <div class="foot small">
        ${
          totalCitations > 0
            ? `Enhanced citations include detailed metadata: authority scores, verification status, source origin, and supporting evidence. `
            : ""
        }
        Scenario-level sources appear under each scenario above.
      </div>
    </section>
  </div>

  <script>
    // -------------------- Data from server --------------------
    const REPORT = ${safeJsonForScript(reportToUse)};

    // -------------------- Client-side helpers --------------------
    const $ = (sel, root=document) => root.querySelector(sel);
    function clear(el){ if(!el) return; while(el.firstChild) el.removeChild(el.firstChild); }
    function makeEl(tag, attrs={}, txt=null){ const el=document.createElement(tag); for(const[k,v] of Object.entries(attrs)) el.setAttribute(k,v); if(txt!=null) el.textContent=txt; return el; }

    // Enhanced source normalization with citation metadata
    function normalizeSource(s) {
      const out = {
        title: '', url: '', publisher: '', published: '',
        reliability: '', authority: '', author: '', notes: '', raw: s,
        // Enhanced citation fields
        claim_category: '', claim_impact_score: '', source_type: '',
        verification_status: '', source_origin: '', real_time_indicators: [],
        influence_weight: 0
      };
      if (!s) return out;

      if (typeof s === 'string') {
        const urlMatch = /https?:\\/\\/[^\\s)]+/i.exec(s);
        out.url = urlMatch ? urlMatch[0] : '';
        if (out.url) {
          const parts = s.split(out.url);
          const left = parts[0].trim();
          const right = (parts[1] || '').trim();
          out.title = left || right || s;
        } else {
          out.title = s;
        }
        return out;
      }

      if (typeof s === 'object') {
        // Standard fields
        out.title = s.title || s.name || s.source || s.label || '';
        out.url = s.url || s.link || '';
        out.publisher = s.publisher || s.outlet || s.domain || '';
        out.published = s.published || s.date || s.published_at || '';
        out.reliability = s.reliability != null ? String(s.reliability) : (s.reliability_score != null ? String(s.reliability_score) : '');
        out.authority = s.authority != null ? String(s.authority) : (s.authority_score != null ? String(s.authority_score) : '');
        out.author = s.author || s.byline || '';
        out.notes = s.notes || s.note || '';
        
        // Enhanced citation fields
        out.claim_category = s.claim_category || '';
        out.claim_impact_score = s.claim_impact_score || '';
        out.source_type = s.source_type || '';
        out.verification_status = s.verification_status || '';
        out.source_origin = s.source_origin || '';
        out.real_time_indicators = s.real_time_indicators || [];
        out.influence_weight = s.influence_weight || 0;
        
        // Fallbacks
        if (!out.title && out.url) {
          try { out.title = new URL(out.url).hostname; } catch {}
        }
        if (!out.publisher && out.url) {
          try { out.publisher = new URL(out.url).hostname.replace(/^www\\./,''); } catch {}
        }
        return out;
      }

      return out;
    }

    function computeH2H(scenariosArr){
      const map = new Map();
      (scenariosArr||[]).forEach(sc=>{
        const tc = Array.isArray(sc.top_competitors) ? sc.top_competitors : [];
        tc.forEach((row, idx)=>{
          const name = (row && row.company) ? row.company : 'Unknown';
          if(!map.has(name)) map.set(name, {name, scenarios:0, wins:0, posTotal:0});
          const r = map.get(name);
          r.scenarios += 1;
          r.posTotal += (idx+1);
          if(idx===0) r.wins += 1;
        });
      });
      const arr = Array.from(map.values()).map(r=>({
        name:r.name,
        scenarios:r.scenarios,
        wins:r.wins,
        avgPos:r.posTotal/r.scenarios,
        winRate:r.wins/r.scenarios
      }));
      arr.sort((a,b)=>{
        if(b.wins!==a.wins) return b.wins-a.wins;
        if(a.avgPos!==b.avgPos) return a.avgPos-b.avgPos;
        return a.name.localeCompare(b.name);
      });
      return arr;
    }

    function renderH2H(){
      const body = $('#h2h-table tbody'); clear(body);
      const h2h = computeH2H(REPORT.scenarios);
      h2h.forEach((r,i)=>{
        const tr = document.createElement('tr');
        tr.innerHTML =
          '<td class="rank">#'+(i+1)+'</td>'+
          '<td>'+r.name+'</td>'+
          '<td>'+r.wins+'</td>'+
          '<td>'+r.scenarios+'</td>'+
          '<td>'+r.avgPos.toFixed(2)+'</td>'+
          '<td>'+Math.round(r.winRate*100)+'%</td>';
        body.appendChild(tr);
      });

      // KPIs for the target company
      const target = REPORT.report_metadata && REPORT.report_metadata.company || '';
      const rec = h2h.find(x=>x.name===target) || null;
      $('#kpi-winrate').textContent = rec ? (Math.round(rec.winRate*100)+'%') : '—';
      $('#kpi-avgpos').textContent = rec ? rec.avgPos.toFixed(2) : '—';
    }

    function populateScenarioSelector(){
      const sel = $('#scenario-select'); clear(sel);
      (REPORT.scenarios||[]).forEach((sc, idx)=>{
        const label = sc.title || ('Scenario '+(idx+1));
        const opt = makeEl('option', { value:String(idx) }, label);
        sel.appendChild(opt);
      });
    }

    function renderScenario(idx){
      const sc = (REPORT.scenarios||[])[idx]; if(!sc) return;
      $('#sc-title').textContent = sc.title || ('Scenario '+(idx+1));
      $('#sc-id').textContent = 'ID ' + (sc.scenario_id!=null ? sc.scenario_id : '—');

      const kf = $('#sc-keyfindings'); clear(kf);
      (Array.isArray(sc.key_findings)?sc.key_findings:[]).forEach(k=>{
        kf.appendChild(makeEl('li', {}, k));
      });

      // Scenario Sources
      const srcUl = $('#sc-sources'); clear(srcUl);
      (Array.isArray(sc.sources)?sc.sources:[]).forEach(s=>{
        const norm = normalizeSource(s);
        const li = document.createElement('li');

        if (norm.url) {
          const a = makeEl('a', {href:norm.url, target:'_blank', rel:'noopener'}, norm.title || norm.url);
          li.appendChild(a);
        } else {
          li.appendChild(document.createTextNode(norm.title || (typeof s === 'string' ? s : '—')));
        }

        const chips = [];
        if (norm.publisher) chips.push('Publisher: '+norm.publisher);
        if (norm.published) chips.push('Published: '+norm.published);
        if (norm.authority) chips.push('Authority: '+norm.authority);
        if (norm.verification_status) chips.push('Status: '+norm.verification_status);
        if (chips.length){
          const metaSpan = document.createElement('div');
          metaSpan.className = 'note';
          metaSpan.textContent = chips.join(' • ');
          li.appendChild(metaSpan);
        }

        srcUl.appendChild(li);
      });

      // Top competitors
      const tb = $('#sc-top-table tbody'); clear(tb);
      (Array.isArray(sc.top_competitors)?sc.top_competitors:[]).forEach((row,i)=>{
        const tr = document.createElement('tr');
        
        // Create detailed metrics display
        let metricsHtml = '—';
        if (row.detailed_metrics && typeof row.detailed_metrics === 'object' && Object.keys(row.detailed_metrics).length > 0) {
          const metricsArray = Object.entries(row.detailed_metrics).map(([key, value]) => {
            const formattedKey = key.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, str => str.toUpperCase());
            return '<span class="metric-item"><strong>' + formattedKey + ':</strong> ' + value + '</span>';
          });
          metricsHtml = '<div class="metrics-grid">' + metricsArray.join('') + '</div>';
        }
        
        tr.innerHTML =
          '<td class="rank">#'+(i+1)+'</td>'+
          '<td>'+(row.company||'—')+'</td>'+
          '<td>'+(row.score!=null?row.score:'—')+'</td>'+
          '<td class="metrics-cell">'+metricsHtml+'</td>'+
          '<td>'+(row.rationale||'—')+'</td>';
        tb.appendChild(tr);
      });
    }

    // URL validation function
    async function validateUrl(url) {
      if (!url || !url.startsWith('http')) return 'no-url';
      
      try {
        const response = await fetch(url, { 
          method: 'HEAD', 
          mode: 'no-cors',
          cache: 'no-cache'
        });
        return 'valid';
      } catch (error) {
        // Try with CORS proxy for better validation
        try {
          const proxyUrl = 'https://api.allorigins.win/raw?url=' + encodeURIComponent(url);
          const response = await fetch(proxyUrl, { method: 'HEAD' });
          return response.ok ? 'valid' : 'invalid';
        } catch (proxyError) {
          return 'unknown';
        }
      }
    }

    // Enhanced consolidated sources renderer
    function renderConsolidatedSources(){
      const body = $('#consolidated-sources tbody'); clear(body);
      const rows = (REPORT.data_sources_table||[]).map(normalizeSource);
      rows.forEach((r,i)=>{
        const tr = document.createElement('tr');

        // Index
        const tdIdx = makeEl('td', {}, String(i+1));
        
        // Title/Claim with enhanced info
        const tdTitle = document.createElement('td');
        // Clean title by removing URLs and extra whitespace
        let titleText = r.title || (typeof r.raw === 'string' ? r.raw : '—');
        
        // Remove URLs from title text if they exist
        if (typeof titleText === 'string') {
          // Remove URLs that start with http/https
          titleText = titleText.replace(/https?:\/\/[^\s]+/g, '').trim();
          // Clean up extra spaces and punctuation
          titleText = titleText.replace(/\s+/g, ' ').replace(/[.,;]+$/, '');
          // If title is empty after cleaning, use a fallback
          if (!titleText || titleText.length < 3) {
            titleText = r.title || r.source_name || 'Source Reference';
          }
        }
        
        if (r.url) {
          const a = makeEl('a', { href:r.url, target:'_blank', rel:'noopener' }, titleText);
          tdTitle.appendChild(a);
        } else {
          tdTitle.textContent = titleText;
        }
        
        // Add enhanced citation metadata if available
        if (r.claim_category || r.claim_impact_score) {
          const metaDiv = document.createElement('div');
          metaDiv.className = 'citation-meta';
          const metaItems = [];
          if (r.claim_category) metaItems.push('Category: ' + r.claim_category);
          if (r.claim_impact_score) metaItems.push('Impact: ' + r.claim_impact_score + '/10');
          if (r.influence_weight) metaItems.push('Weight: ' + r.influence_weight.toFixed(2));
          metaDiv.textContent = metaItems.join(' • ');
          tdTitle.appendChild(metaDiv);
        }

        // Publisher/Domain
        const tdPublisher = makeEl('td', {}, r.publisher || '—');
        
        // Published date
        const tdPublished = makeEl('td', {}, r.published || '—');
        
        // Authority with visual indicator
        const tdAuthority = document.createElement('td');
        if (r.authority) {
          const authNum = parseFloat(r.authority);
          const authSpan = document.createElement('span');
          authSpan.textContent = r.authority + '/10';
          
          // Authority badge
          if (authNum >= 8) {
            authSpan.className = 'badge high-authority';
          } else if (authNum >= 5) {
            authSpan.className = 'badge medium-authority';
          } else {
            authSpan.className = 'badge low-authority';
          }
          
          tdAuthority.appendChild(authSpan);
          
          // Authority bar
          const barDiv = document.createElement('div');
          barDiv.className = 'authority-bar';
          const fillDiv = document.createElement('div');
          fillDiv.className = 'authority-fill';
          fillDiv.style.width = (authNum / 10 * 100) + '%';
          barDiv.appendChild(fillDiv);
          tdAuthority.appendChild(barDiv);
        } else {
          tdAuthority.textContent = '—';
        }
        
        // Verification status
        const tdStatus = document.createElement('td');
        if (r.verification_status) {
          const statusSpan = document.createElement('span');
          statusSpan.textContent = r.verification_status;
          statusSpan.className = r.verification_status === 'verified' ? 'badge verified' : 'badge unverified';
          tdStatus.appendChild(statusSpan);
        } else {
          tdStatus.textContent = '—';
        }
        
        // Source origin
        const tdOrigin = document.createElement('td');
        if (r.source_origin) {
          const originSpan = document.createElement('span');
          originSpan.textContent = r.source_origin;
          if (r.source_origin === 'real_time_search') {
            originSpan.className = 'badge real-time';
          } else if (r.source_origin === 'training_data') {
            originSpan.className = 'badge training-data';
          } else {
            originSpan.className = 'badge';
          }
          tdOrigin.appendChild(originSpan);
        } else {
          tdOrigin.textContent = '—';
        }
        
        // Category
        const tdCategory = document.createElement('td');
        if (r.claim_category) {
          const categorySpan = document.createElement('span');
          categorySpan.textContent = r.claim_category;
          categorySpan.className = 'pill';
          tdCategory.appendChild(categorySpan);
        } else {
          tdCategory.textContent = '—';
        }
        
        // Impact score
        const tdImpact = document.createElement('td');
        if (r.claim_impact_score) {
          const impactNum = parseFloat(r.claim_impact_score);
          const impactSpan = document.createElement('span');
          impactSpan.textContent = r.claim_impact_score + '/10';
          
          if (impactNum >= 8) {
            impactSpan.className = 'badge high-authority';
          } else if (impactNum >= 5) {
            impactSpan.className = 'badge medium-authority';
          } else {
            impactSpan.className = 'badge low-authority';
          }
          
          tdImpact.appendChild(impactSpan);
        } else {
          tdImpact.textContent = '—';
        }

        // URL Status
        const tdUrlStatus = document.createElement('td');
        const statusSpan = document.createElement('span');
        statusSpan.textContent = 'Checking...';
        statusSpan.className = 'badge';
        tdUrlStatus.appendChild(statusSpan);
        
        // Validate URL asynchronously
        if (r.url && r.url.startsWith('http')) {
          validateUrl(r.url).then(status => {
            statusSpan.textContent = status === 'valid' ? 'Valid' : 
                                   status === 'invalid' ? '404 Error' : 
                                   status === 'no-url' ? 'No URL' : 'Unknown';
            statusSpan.className = status === 'valid' ? 'badge url-valid' : 
                                 status === 'invalid' ? 'badge url-invalid' : 
                                 status === 'no-url' ? 'badge unverified' : 'badge url-unknown';
          });
        } else {
          statusSpan.textContent = 'No URL';
          statusSpan.className = 'badge unverified';
        }

        // Link
        const tdView = document.createElement('td');
        if (r.url && r.url.startsWith('http')) {
          tdView.appendChild(makeEl('a', { href:r.url, target:'_blank', rel:'noopener' }, 'Open ↗'));
        } else {
          tdView.textContent = '—';
        }

        tr.appendChild(tdIdx);
        tr.appendChild(tdTitle);
        tr.appendChild(tdPublisher);
        tr.appendChild(tdPublished);
        tr.appendChild(tdAuthority);
        tr.appendChild(tdStatus);
        tr.appendChild(tdOrigin);
        tr.appendChild(tdCategory);
        tr.appendChild(tdImpact);
        tr.appendChild(tdUrlStatus);
        tr.appendChild(tdView);
        body.appendChild(tr);
      });
    }

    // -------------------- Init --------------------
    (function init(){
      renderH2H();
      populateScenarioSelector();
      renderScenario(0);
      renderConsolidatedSources();
      document.getElementById('scenario-select').addEventListener('change', (e)=>{
        const idx = parseInt(e.target.value,10) || 0;
        renderScenario(idx);
        document.getElementById('scenario-block').scrollIntoView({behavior:'smooth', block:'start'});
      });
    })();
  </script>
</body>
</html>`;

/* ----------------------- Return file ----------------------- */

const fileNameSafeCompany = company
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-+|-+$/g, "");
const filename = `competitive-report-${
  fileNameSafeCompany || "company"
}-${new Date().toISOString().replace(/[:.]/g, "-")}.html`;

return [{ json: { html, filename } }];
