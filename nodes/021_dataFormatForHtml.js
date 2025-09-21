/**
 * n8n Code node (JavaScript)
 * Enhanced Data Formatter for HTML Report
 * - Processes all input data from workflow nodes
 * - Merges scenarios, citations, and sources
 * - Calculates all metrics and prepares data for HTML generation
 * - Ensures consistent data format for HTML report
 */

console.log("=== ENHANCED DATA FORMATTER ===");

// Get all input items
const items = $input.all();
console.log("Total input items:", items.length);

// Initialize the target structure
let formattedData = {
  report_metadata: {
    company: "Unknown Company",
    total_scenarios: 0,
    competitors_analyzed: [],
  },
  scenarios: [],
  enhanced_citations: [],
  data_sources_table: [],
  overall_metrics: {},
  company_performance: {},
  quality_metrics: {},
};

// Helper function to extract data from response_text when other fields are empty
function extractFromResponseText(ranking) {
  // If ranking already has meaningful data, don't override
  const hasCompetitors =
    ranking.competitors_ranked && ranking.competitors_ranked.length > 0;
  const hasAnalysisDetails =
    ranking.analysis_details &&
    typeof ranking.analysis_details === "object" &&
    Object.keys(ranking.analysis_details).length > 0;
  const hasKeyFindings =
    ranking.key_findings && ranking.key_findings.length > 0;

  if (hasCompetitors || hasAnalysisDetails || hasKeyFindings) {
    console.log(
      `Scenario ${ranking.scenario_id} already has data, skipping response_text extraction`
    );
    return ranking;
  }

  // Try to extract from response_text if other fields are empty
  if (ranking.response_text && typeof ranking.response_text === "string") {
    console.log(
      `🔧 Extracting data from response_text for scenario ${ranking.scenario_id}`
    );

    try {
      // Look for JSON in the response_text (handle both complete and incomplete JSON blocks)
      let jsonStr = null;

      // Try to find complete JSON block first
      const completeJsonMatch = ranking.response_text.match(
        /```json\s*([\s\S]*?)\s*```/
      );
      if (completeJsonMatch) {
        jsonStr = completeJsonMatch[1];
      } else {
        // Try to find incomplete JSON block (starts with ```json but may not end)
        const incompleteJsonMatch =
          ranking.response_text.match(/```json\s*([\s\S]*)/);
        if (incompleteJsonMatch) {
          jsonStr = incompleteJsonMatch[1];
          // Try to find where the JSON likely ends
          const lines = jsonStr.split("\n");
          let jsonLines = [];
          let braceCount = 0;

          for (const line of lines) {
            jsonLines.push(line);
            // Count braces to find where JSON ends
            for (const char of line) {
              if (char === "{") braceCount++;
              if (char === "}") braceCount--;
            }
            // If we've closed all braces and have some content, try to parse
            if (braceCount === 0 && jsonLines.length > 5) {
              break;
            }
          }
          jsonStr = jsonLines.join("\n");
        }
      }

      if (jsonStr) {
        console.log(
          `Attempting to parse JSON for scenario ${ranking.scenario_id}, length: ${jsonStr.length}`
        );
        const parsedData = JSON.parse(jsonStr);

        console.log(
          `✅ Successfully parsed response_text for scenario ${ranking.scenario_id}:`,
          Object.keys(parsedData)
        );

        // Merge the parsed data into the ranking
        return {
          ...ranking,
          scenario_title:
            parsedData.title || ranking.scenario_title || ranking.title,
          scenario_description:
            parsedData.description ||
            ranking.scenario_description ||
            ranking.description,
          analysis_details:
            parsedData.analysis_details || ranking.analysis_details || {},
          competitors_ranked:
            parsedData.competitors_ranked || ranking.competitors_ranked || [],
          key_findings: parsedData.key_findings || ranking.key_findings || [],
        };
      } else {
        console.log(
          `❌ No JSON found in response_text for scenario ${ranking.scenario_id}`
        );
      }
    } catch (error) {
      console.log(
        `❌ Failed to parse response_text for scenario ${ranking.scenario_id}:`,
        error.message
      );
    }
  }

  return ranking;
}

// Process each input item
items.forEach((item, index) => {
  const data = item.json || {};
  console.log(`\n--- Processing Item ${index} ---`);
  console.log("Available keys:", Object.keys(data));

  // SCENARIO 1 SPECIFIC DEBUG
  console.log(`\n🔍 SCENARIO 1 DEBUG - Item ${index}:`);
  if (data.scenario_rankings && Array.isArray(data.scenario_rankings)) {
    const scenario1 = data.scenario_rankings.find((r) => r.scenario_id === 1);
    if (scenario1) {
      console.log("✅ Found Scenario 1 in scenario_rankings:");
      console.log("  - scenario_title:", scenario1.scenario_title);
      console.log("  - scenario_description:", scenario1.scenario_description);
      console.log(
        "  - competitors_ranked length:",
        scenario1.competitors_ranked?.length || 0
      );
      console.log(
        "  - analysis_details keys:",
        Object.keys(scenario1.analysis_details || {})
      );
      console.log(
        "  - key_findings length:",
        scenario1.key_findings?.length || 0
      );
    } else {
      console.log("❌ Scenario 1 NOT found in scenario_rankings");
    }
  }

  if (data.scenarios && Array.isArray(data.scenarios)) {
    const scenario1 = data.scenarios.find((s) => s.scenario_id === 1);
    if (scenario1) {
      console.log("✅ Found Scenario 1 in scenarios:");
      console.log("  - title:", scenario1.title);
      console.log("  - scenario_title:", scenario1.scenario_title);
      console.log("  - description:", scenario1.description);
      console.log(
        "  - top_competitors length:",
        scenario1.top_competitors?.length || 0
      );
      console.log(
        "  - analysis_details keys:",
        Object.keys(scenario1.analysis_details || {})
      );
      console.log(
        "  - key_findings length:",
        scenario1.key_findings?.length || 0
      );
    } else {
      console.log("❌ Scenario 1 NOT found in scenarios");
    }
  }

  // CRITICAL DEBUG: Show the actual data structure we're receiving
  console.log("=== CRITICAL DEBUG: ACTUAL DATA STRUCTURE ===");
  console.log("data.scenario_rankings exists:", !!data.scenario_rankings);
  console.log("data.scenarios exists:", !!data.scenarios);
  console.log("data.scenarios length:", data.scenarios?.length || 0);

  if (data.scenarios && data.scenarios.length > 0) {
    console.log(
      "First scenario structure:",
      JSON.stringify(data.scenarios[0], null, 2).substring(0, 1000)
    );
    console.log(
      "First scenario has analysis_details:",
      !!data.scenarios[0].analysis_details
    );
    console.log(
      "First scenario has top_competitors:",
      !!data.scenarios[0].top_competitors
    );
    console.log(
      "First scenario top_competitors length:",
      data.scenarios[0].top_competitors?.length || 0
    );
  }

  // Debug: Show the structure of each input item
  console.log(
    "Item structure:",
    JSON.stringify(data, null, 2).substring(0, 500) + "..."
  );

  // Debug: Show company name extraction attempts
  console.log("Company name extraction debug:");
  console.log("- data.company:", data.company);
  console.log("- data.company_name:", data.company_name);
  console.log("- data.target_company:", data.target_company);
  console.log(
    "- data.report_metadata?.company:",
    data.report_metadata?.company
  );
  console.log(
    "- Current formattedData.report_metadata.company:",
    formattedData.report_metadata.company
  );

  // Handle scenario_rankings data FIRST (has complete data including response_text extraction)
  if (data.scenario_rankings && Array.isArray(data.scenario_rankings)) {
    console.log("Found scenario_rankings:", data.scenario_rankings.length);

    // Debug: Check if scenarios have analysis_details
    data.scenario_rankings.forEach((ranking, index) => {
      console.log(
        `Scenario ${ranking.scenario_id} analysis_details:`,
        Object.keys(ranking.analysis_details || {})
      );
      console.log(
        `Scenario ${ranking.scenario_id} competitors_ranked:`,
        ranking.competitors_ranked?.length || 0
      );
    });

    // Convert scenario_rankings to the target scenarios format (with response_text extraction)
    const convertedScenarios = data.scenario_rankings.map((ranking) => {
      // Extract from response_text if needed
      const enhancedRanking = extractFromResponseText(ranking);

      return {
        scenario_id: enhancedRanking.scenario_id || 0,
        title:
          enhancedRanking.scenario_title ||
          enhancedRanking.title ||
          `Scenario ${enhancedRanking.scenario_id || 0}`,
        description:
          enhancedRanking.scenario_description ||
          enhancedRanking.description ||
          enhancedRanking.summary ||
          enhancedRanking.overview ||
          enhancedRanking.subtitle ||
          "",
        // Build top_competitors from analysis_details if competitors_ranked is empty
        top_competitors: (() => {
          // First try to use competitors_ranked if it exists and has data
          if (
            enhancedRanking.competitors_ranked &&
            enhancedRanking.competitors_ranked.length > 0
          ) {
            return enhancedRanking.competitors_ranked.map((comp) => {
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
                enhancedRanking.analysis_details &&
                enhancedRanking.analysis_details[companyName]
              ) {
                const analysisDetail =
                  enhancedRanking.analysis_details[companyName];

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
            enhancedRanking.analysis_details &&
            typeof enhancedRanking.analysis_details === "object"
          ) {
            console.log(
              `Building competitors from analysis_details for scenario ${enhancedRanking.scenario_id}:`,
              Object.keys(enhancedRanking.analysis_details)
            );
            const competitors = Object.entries(
              enhancedRanking.analysis_details
            ).map(([companyName, analysisDetail], index) => {
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
            });

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
        key_findings: enhancedRanking.key_findings || [],
        sources: enhancedRanking.analysis_details
          ? Object.values(enhancedRanking.analysis_details).flatMap(
              (detail) => detail.sources || []
            )
          : [],
        // Mark scenario_rankings data as high priority (has complete data from response_text extraction)
        isOriginal: true,
        highPriority: true,
      };
    });

    formattedData.scenarios =
      formattedData.scenarios.concat(convertedScenarios);
  }

  // Handle results data (from Prompt 32 Formatter)
  if (data.results && Array.isArray(data.results)) {
    console.log("Found results:", data.results.length);

    // Process each result to extract scenario data
    data.results.forEach((result, index) => {
      console.log(`Processing result ${index}:`, Object.keys(result));

      // Try to extract scenario data from various possible structures
      let scenarioData = null;

      // Check if result has scenario structure directly
      if (result.scenario_id || result.title || result.competitors) {
        scenarioData = {
          scenario_id: result.scenario_id || index + 1,
          title:
            result.title || result.scenario_title || `Scenario ${index + 1}`,
          description:
            result.description || result.summary || result.overview || "",
          // Preserve all competitor ranking data including scores, rationale, etc.
          top_competitors: (
            result.competitors ||
            result.top_competitors ||
            result.competitors_ranked ||
            []
          ).map((comp) => ({
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
          key_findings: result.key_findings || result.findings || [],
          sources: result.sources || result.references || [],
        };
      }

      // Check if result has response_text that might contain JSON
      if (!scenarioData && result.response_text) {
        try {
          const parsedResponse = JSON.parse(result.response_text);
          if (parsedResponse.scenarios || parsedResponse.scenario_rankings) {
            console.log("Found parsed scenarios in response_text");
            // Handle nested scenario data
            if (parsedResponse.scenarios) {
              parsedResponse.scenarios.forEach((scenario) => {
                formattedData.scenarios.push({
                  scenario_id: scenario.scenario_id || 0,
                  title:
                    scenario.title ||
                    scenario.scenario_title ||
                    `Scenario ${scenario.scenario_id || 0}`,
                  description:
                    scenario.description ||
                    scenario.summary ||
                    scenario.overview ||
                    "",
                  // Preserve all competitor ranking data including scores, rationale, etc.
                  top_competitors: (
                    scenario.top_competitors ||
                    scenario.competitors ||
                    []
                  ).map((comp) => ({
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
                  key_findings:
                    scenario.key_findings || scenario.findings || [],
                  sources: scenario.sources || scenario.references || [],
                });
              });
            }
            if (parsedResponse.scenario_rankings) {
              parsedResponse.scenario_rankings.forEach((ranking) => {
                formattedData.scenarios.push({
                  scenario_id: ranking.scenario_id || 0,
                  title:
                    ranking.scenario_title ||
                    ranking.title ||
                    `Scenario ${ranking.scenario_id || 0}`,
                  description:
                    ranking.scenario_description ||
                    ranking.description ||
                    ranking.summary ||
                    "",
                  // Preserve all competitor ranking data including scores, rationale, etc.
                  top_competitors: (
                    ranking.competitors_ranked ||
                    ranking.competitors ||
                    []
                  ).map((comp) => {
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
                      const analysisDetail =
                        ranking.analysis_details[companyName];

                      // Extract metrics (scores for different dimensions)
                      if (
                        analysisDetail.metrics &&
                        typeof analysisDetail.metrics === "object"
                      ) {
                        detailedMetrics = { ...analysisDetail.metrics };
                      }

                      // Enhance rationale with summary and highlights
                      const summaryText = analysisDetail.summary || "";
                      const highlightsText = (
                        analysisDetail.highlights || []
                      ).join("; ");

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
                      // Add detailed metrics from analysis_details
                      detailed_metrics: detailedMetrics,
                      // Preserve any additional fields that might be present
                      ...comp,
                    };
                  }),
                  key_findings: ranking.key_findings || ranking.findings || [],
                  sources: ranking.analysis_details
                    ? Object.values(ranking.analysis_details).flatMap(
                        (detail) => detail.sources || []
                      )
                    : [],
                });
              });
            }
          }
        } catch (e) {
          console.log("Could not parse response_text as JSON:", e.message);
        }
      }

      // Add scenario data if we found it
      if (scenarioData) {
        formattedData.scenarios.push(scenarioData);
      }
    });
  }

  // Handle original scenarios data (from Collect All Data node) - HIGHEST PRIORITY for original titles
  if (data.original_scenarios && Array.isArray(data.original_scenarios)) {
    console.log(
      "Found original scenarios from Collect All Data:",
      data.original_scenarios.length
    );
    console.log(
      "Sample original scenario titles:",
      data.original_scenarios
        .slice(0, 3)
        .map((s) => s.scenario_title || s.title)
    );

    formattedData.scenarios = formattedData.scenarios.concat(
      data.original_scenarios.map((scenario) => ({
        scenario_id: scenario.scenario_id || 0,
        title:
          scenario.scenario_title || // Prioritize scenario_title from original definitions
          scenario.title ||
          `Scenario ${scenario.scenario_id || 0}`,
        description:
          scenario.scenario_description || // Prioritize scenario_description from original definitions
          scenario.description ||
          scenario.summary ||
          scenario.overview ||
          scenario.subtitle ||
          "",
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
        // Mark as original scenario for deduplication priority
        isOriginal: true,
      }))
    );
  }

  // Handle direct scenarios data (from first document structure) - LOWER PRIORITY after scenario_rankings
  if (data.scenarios && Array.isArray(data.scenarios)) {
    console.log("Found scenarios:", data.scenarios.length);
    console.log(
      "Sample scenario titles:",
      data.scenarios.slice(0, 3).map((s) => s.scenario_title || s.title)
    );

    formattedData.scenarios = formattedData.scenarios.concat(
      data.scenarios.map((scenario) => ({
        scenario_id: scenario.scenario_id || 0,
        title:
          scenario.scenario_title || // Prioritize scenario_title from original definitions
          scenario.title ||
          `Scenario ${scenario.scenario_id || 0}`,
        description:
          scenario.scenario_description || // Prioritize scenario_description from original definitions
          scenario.description ||
          scenario.summary ||
          scenario.overview ||
          scenario.subtitle ||
          "",
        // Build top_competitors from analysis_details if top_competitors is empty
        top_competitors: (() => {
          // First try to use existing top_competitors if it has data
          if (scenario.top_competitors && scenario.top_competitors.length > 0) {
            return scenario.top_competitors.map((comp) => ({
              company: comp.company || comp.name || comp,
              score: comp.score || comp.rating || comp.value || null,
              rationale:
                comp.rationale ||
                comp.reasoning ||
                comp.explanation ||
                comp.notes ||
                "",
              rank: comp.rank || comp.position || null,
              detailed_metrics: comp.detailed_metrics || {},
              ...comp,
            }));
          }

          // If no top_competitors but has analysis_details, build from analysis_details
          if (
            scenario.analysis_details &&
            typeof scenario.analysis_details === "object"
          ) {
            console.log(
              `Building competitors from analysis_details for scenario ${scenario.scenario_id}:`,
              Object.keys(scenario.analysis_details)
            );

            const competitors = Object.entries(scenario.analysis_details).map(
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

            console.log(
              `Built ${competitors.length} competitors for scenario ${scenario.scenario_id}:`,
              competitors.map((c) => `${c.company}: ${c.score}`)
            );
            return competitors;
          }

          // Fallback to empty array
          console.log(
            `No competitors data found for scenario ${scenario.scenario_id}`
          );
          return [];
        })(),
        key_findings: scenario.key_findings || [],
        sources: scenario.sources || [],
        // Mark as original scenario for deduplication priority
        isOriginal: true,
      }))
    );
  }

  // Handle enhanced citations from multiple sources
  if (data.enhanced_citations && Array.isArray(data.enhanced_citations)) {
    console.log("Found enhanced_citations:", data.enhanced_citations.length);
    formattedData.enhanced_citations = formattedData.enhanced_citations.concat(
      data.enhanced_citations
    );
  }

  if (data.source_citations && Array.isArray(data.source_citations)) {
    console.log("Found source_citations:", data.source_citations.length);
    formattedData.enhanced_citations = formattedData.enhanced_citations.concat(
      data.source_citations
    );
  }

  if (data.scraping_results && Array.isArray(data.scraping_results)) {
    console.log("Found scraping_results:", data.scraping_results.length);
    formattedData.enhanced_citations = formattedData.enhanced_citations.concat(
      data.scraping_results
    );
  }

  if (data.research_results && Array.isArray(data.research_results)) {
    console.log("Found research_results:", data.research_results.length);
    formattedData.enhanced_citations = formattedData.enhanced_citations.concat(
      data.research_results
    );
  }

  // Handle other data types
  if (data.report_metadata) {
    formattedData.report_metadata = {
      company:
        data.report_metadata.company ||
        formattedData.report_metadata.company ||
        "Unknown Company",
      total_scenarios:
        data.report_metadata.total_scenarios ||
        formattedData.report_metadata.total_scenarios ||
        0,
      competitors_analyzed:
        data.report_metadata.competitors_analyzed ||
        formattedData.report_metadata.competitors_analyzed ||
        [],
    };
  }

  // Handle company name from various sources - filter out invalid values
  const invalidCompanyNames = [
    "Report",
    "Unknown Company",
    "Company",
    "Target Company",
    "",
  ];

  if (data.company && !invalidCompanyNames.includes(data.company)) {
    formattedData.report_metadata.company = data.company;
    console.log("Extracted company name from data.company:", data.company);
  }
  if (data.company_name && !invalidCompanyNames.includes(data.company_name)) {
    formattedData.report_metadata.company = data.company_name;
    console.log(
      "Extracted company name from data.company_name:",
      data.company_name
    );
  }
  if (
    data.target_company &&
    !invalidCompanyNames.includes(data.target_company)
  ) {
    formattedData.report_metadata.company = data.target_company;
    console.log(
      "Extracted company name from data.target_company:",
      data.target_company
    );
  }

  // Additional fallback: try to extract company name from scenarios if not found or invalid
  if (
    !formattedData.report_metadata.company ||
    invalidCompanyNames.includes(formattedData.report_metadata.company)
  ) {
    // Try to get company name from scenarios - look for the most frequently mentioned company
    const companyMentions = {};

    formattedData.scenarios.forEach((scenario) => {
      if (scenario.top_competitors && Array.isArray(scenario.top_competitors)) {
        scenario.top_competitors.forEach((comp, index) => {
          if (comp.company && !invalidCompanyNames.includes(comp.company)) {
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
      formattedData.report_metadata.company = bestCompany;
      console.log(
        "Extracted company name from scenario analysis:",
        bestCompany,
        "(mentions:",
        companyMentions[bestCompany].count,
        "avg score:",
        (
          companyMentions[bestCompany].totalScore /
          companyMentions[bestCompany].count
        ).toFixed(1),
        ")"
      );
    } else {
      // Final fallback: try to get company name from the first scenario's top competitor
      if (
        formattedData.scenarios.length > 0 &&
        formattedData.scenarios[0].top_competitors.length > 0
      ) {
        const firstCompany =
          formattedData.scenarios[0].top_competitors[0].company;
        if (firstCompany && !invalidCompanyNames.includes(firstCompany)) {
          formattedData.report_metadata.company = firstCompany;
          console.log(
            "Extracted company name from first scenario:",
            firstCompany
          );
        }
      }
    }
  }

  // Handle scenarios_completed count
  if (
    data.scenarios_completed &&
    formattedData.report_metadata.total_scenarios === 0
  ) {
    formattedData.report_metadata.total_scenarios = data.scenarios_completed;
  }

  if (data.overall_metrics) {
    Object.assign(formattedData.overall_metrics, data.overall_metrics);
  }

  if (data.company_performance) {
    Object.assign(formattedData.company_performance, data.company_performance);
  }

  if (data.quality_metrics) {
    Object.assign(formattedData.quality_metrics, data.quality_metrics);
  }

  // Handle data sources from multiple possible locations
  if (data.data_sources_table) {
    console.log("Found data_sources_table:", data.data_sources_table.length);
    formattedData.data_sources_table = formattedData.data_sources_table.concat(
      data.data_sources_table
    );
  }
  if (data.data_sources) {
    console.log("Found data_sources:", data.data_sources.length);
    formattedData.data_sources_table = formattedData.data_sources_table.concat(
      data.data_sources
    );
  }
  if (data.source_citations) {
    console.log(
      "Found source_citations for data_sources_table:",
      data.source_citations.length
    );
    formattedData.data_sources_table = formattedData.data_sources_table.concat(
      data.source_citations
    );
  }

  // Debug: Show current data_sources_table count
  console.log(
    "Current data_sources_table count:",
    formattedData.data_sources_table.length
  );
});

console.log("\n=== REMOVING DUPLICATES ===");
console.log("Scenarios before deduplication:", formattedData.scenarios.length);
console.log(
  "Enhanced citations before deduplication:",
  formattedData.enhanced_citations.length
);
console.log(
  "Data sources before deduplication:",
  formattedData.data_sources_table.length
);

// If no scenarios found, provide detailed debugging information
if (formattedData.scenarios.length === 0) {
  console.log("\n=== NO SCENARIOS FOUND - DEBUGGING INFO ===");
  console.log("Total input items processed:", items.length);
  items.forEach((item, index) => {
    const data = item.json || {};
    console.log(`\nItem ${index} structure:`);
    console.log("Keys:", Object.keys(data));
    console.log("Has scenario_rankings:", !!data.scenario_rankings);
    console.log("Has scenarios:", !!data.scenarios);
    console.log("Has results:", !!data.results);
    console.log("Has response_text:", !!data.response_text);
    console.log("Data type:", typeof data);
    console.log("Is array:", Array.isArray(data));

    // Show sample of the data structure
    if (data.scenario_rankings) {
      console.log(
        "scenario_rankings sample:",
        JSON.stringify(data.scenario_rankings[0], null, 2).substring(0, 200) +
          "..."
      );
    }
    if (data.scenarios) {
      console.log(
        "scenarios sample:",
        JSON.stringify(data.scenarios[0], null, 2).substring(0, 200) + "..."
      );
    }
    if (data.results) {
      console.log(
        "results sample:",
        JSON.stringify(data.results[0], null, 2).substring(0, 200) + "..."
      );
    }
  });
}

// Remove duplicates from scenarios, keeping the scenario with the most complete data
const uniqueScenarios = [];
const scenarioGroups = new Map();

// Group scenarios by ID
formattedData.scenarios.forEach((scenario) => {
  const id = scenario.scenario_id;
  if (!scenarioGroups.has(id)) {
    scenarioGroups.set(id, []);
  }
  scenarioGroups.get(id).push(scenario);
});

// For each group, keep the scenario with the most complete data, prioritizing original scenarios
scenarioGroups.forEach((scenarios, id) => {
  if (scenarios.length === 1) {
    uniqueScenarios.push(scenarios[0]);
    // Special debug for Scenario 1
    if (id === 1) {
      console.log(`\n🔍 SCENARIO 1 DEDUPLICATION DEBUG:`);
      console.log("Only one instance found, using it:");
      console.log("- Title:", scenarios[0].title);
      console.log("- Competitors:", scenarios[0].top_competitors?.length || 0);
      console.log("- Key findings:", scenarios[0].key_findings?.length || 0);
      console.log("- Sources:", scenarios[0].sources?.length || 0);
      console.log("- isOriginal:", scenarios[0].isOriginal);
    }
  } else {
    console.log(`\nDeduplicating scenarios for ID ${id}:`);
    scenarios.forEach((s, index) => {
      console.log(
        `  Scenario ${index + 1}: title="${s.title}", isOriginal=${
          s.isOriginal
        }, competitors=${s.top_competitors?.length || 0}, findings=${
          s.key_findings?.length || 0
        }`
      );
    });

    // Find the scenario with the most complete data, prioritizing high priority scenarios first
    const bestScenario = scenarios.reduce((best, current) => {
      // Priority 0: High priority scenarios (from scenario_rankings with response_text extraction)
      if (best.highPriority && !current.highPriority) return best;
      if (!best.highPriority && current.highPriority) return current;

      // Priority 1: Original scenarios with proper titles
      const bestIsOriginal =
        best.isOriginal && best.title && !best.title.startsWith("Scenario ");
      const currentIsOriginal =
        current.isOriginal &&
        current.title &&
        !current.title.startsWith("Scenario ");

      if (bestIsOriginal && !currentIsOriginal) return best;
      if (!bestIsOriginal && currentIsOriginal) return current;

      // Priority 2: Scenarios with better titles (not generic)
      const bestHasGoodTitle =
        best.title &&
        !best.title.startsWith("Scenario ") &&
        best.title.length > 10;
      const currentHasGoodTitle =
        current.title &&
        !current.title.startsWith("Scenario ") &&
        current.title.length > 10;

      if (bestHasGoodTitle && !currentHasGoodTitle) return best;
      if (!bestHasGoodTitle && currentHasGoodTitle) return current;

      // Priority 3: Most complete data (competitors + sources)
      const bestScore =
        (best.top_competitors?.length || 0) + (best.sources?.length || 0);
      const currentScore =
        (current.top_competitors?.length || 0) + (current.sources?.length || 0);

      return currentScore > bestScore ? current : best;
    });

    console.log(
      `  Selected: title="${bestScenario.title}", isOriginal=${bestScenario.isOriginal}`
    );
    uniqueScenarios.push(bestScenario);
  }
});

// Sort by scenario_id to maintain order
uniqueScenarios.sort((a, b) => a.scenario_id - b.scenario_id);

// Only enhance scenarios if titles/descriptions are missing (fallback only)
uniqueScenarios.forEach((scenario) => {
  // Debug: Show what title we have for each scenario
  console.log(
    `Scenario ${scenario.scenario_id} title check: "${scenario.title}"`
  );

  // Only generate title if completely missing or very generic
  const isGenericTitle =
    !scenario.title ||
    scenario.title === "" ||
    scenario.title.startsWith("Scenario ") ||
    scenario.title ===
      `Competitive Analysis - Scenario ${scenario.scenario_id}` ||
    scenario.title.length < 10; // Very short titles are likely generic

  if (isGenericTitle) {
    console.log(
      `Enhancing generic title for scenario ${scenario.scenario_id}: "${scenario.title}"`
    );

    // Try to find original title from input data first
    let originalTitle = null;
    items.forEach((item) => {
      const data = item.json || {};
      if (data.scenario_rankings && Array.isArray(data.scenario_rankings)) {
        const originalRanking = data.scenario_rankings.find(
          (r) => r.scenario_id === scenario.scenario_id
        );
        if (
          originalRanking &&
          originalRanking.scenario_title &&
          originalRanking.scenario_title.length > 10
        ) {
          originalTitle = originalRanking.scenario_title;
        }
      }
    });

    if (originalTitle) {
      scenario.title = originalTitle;
      console.log(`✅ Restored original title: "${originalTitle}"`);
    } else {
      // Fallback - use first key finding to generate title
      if (scenario.key_findings && scenario.key_findings.length > 0) {
        const firstFinding = scenario.key_findings[0];
        // Extract first few words as title, but be more conservative
        const words = firstFinding.split(" ").slice(0, 6).join(" ");
        scenario.title =
          words.length > 60 ? words.substring(0, 60) + "..." : words;
      } else {
        scenario.title = `Competitive Analysis - Scenario ${scenario.scenario_id}`;
      }
      console.log(`Generated new title: "${scenario.title}"`);
    }
  } else {
    console.log(
      `Keeping original title for scenario ${scenario.scenario_id}: "${scenario.title}"`
    );
  }

  // Only generate description if completely missing
  if (!scenario.description || scenario.description === "") {
    console.log(
      `Enhancing missing description for scenario ${scenario.scenario_id}`
    );

    if (scenario.key_findings && scenario.key_findings.length > 0) {
      scenario.description = scenario.key_findings[0];
    } else if (
      scenario.top_competitors &&
      scenario.top_competitors.length > 0
    ) {
      const topCompany = scenario.top_competitors[0];
      scenario.description = `Analysis of ${
        topCompany.company || "luxury hospitality"
      } performance and competitive positioning.`;
    } else {
      scenario.description = `Comprehensive competitive analysis evaluating market positioning and performance metrics.`;
    }
  }
});

// =========================
// COMPANY NAME EXTRACTION FIX
// =========================
console.log("=== COMPANY NAME EXTRACTION FIX ===");

// Method 1: Extract from competitors_analyzed array
if (
  formattedData.report_metadata.competitors_analyzed &&
  formattedData.report_metadata.competitors_analyzed.length > 0
) {
  // Look for "Wynn Las Vegas" specifically since that's your target company
  const targetCompany = formattedData.report_metadata.competitors_analyzed.find(
    (comp) => comp.includes("Wynn") || comp.includes("wynn")
  );

  if (targetCompany) {
    formattedData.report_metadata.company = targetCompany;
    console.log(
      "✅ Found target company in competitors_analyzed:",
      targetCompany
    );
  }
}

// Method 2: Extract from scenario data if still unknown
if (
  formattedData.report_metadata.company === "Unknown Company" &&
  uniqueScenarios.length > 0
) {
  console.log("🔍 Extracting company name from scenario data...");

  // Look through all scenarios for competitor data
  for (const scenario of uniqueScenarios) {
    if (scenario.top_competitors && scenario.top_competitors.length > 0) {
      // Find the highest scoring competitor (usually rank 1)
      const topCompetitor =
        scenario.top_competitors.find((comp) => comp.rank === 1) ||
        scenario.top_competitors[0];

      if (topCompetitor && topCompetitor.company) {
        // Check if this looks like a target company (highest scores, etc.)
        const score = parseFloat(topCompetitor.score);
        if (score >= 8.5) {
          // High score suggests this might be our target
          formattedData.report_metadata.company = topCompetitor.company;
          console.log(
            "✅ Extracted company name from top performer:",
            topCompetitor.company
          );
          break;
        }
      }
    }
  }
}

// Method 3: Manual override for Wynn Las Vegas (based on your data structure)
if (formattedData.report_metadata.company === "Unknown Company") {
  // Check if we have Wynn data specifically
  const hasWynnData = uniqueScenarios.some(
    (scenario) =>
      scenario.top_competitors &&
      scenario.top_competitors.some(
        (comp) => comp.company && comp.company.includes("Wynn")
      )
  );

  if (hasWynnData) {
    formattedData.report_metadata.company = "Wynn Las Vegas";
    console.log("✅ Set company to Wynn Las Vegas based on competitor data");
  }
}

// =========================
// EMPTY COMPETITORS FIX
// =========================
console.log("=== FIXING EMPTY COMPETITORS ARRAYS ===");

uniqueScenarios.forEach((scenario, scenarioIndex) => {
  if (!scenario.top_competitors || scenario.top_competitors.length === 0) {
    console.log(
      `⚠️ Scenario ${scenario.scenario_id} ("${scenario.title}") has empty competitors, attempting fix...`
    );

    // Special debug for Scenario 1
    if (scenario.scenario_id === 1) {
      console.log("🔍 SCENARIO 1 DEBUG:");
      console.log("- Current title:", scenario.title);
      console.log("- Current description:", scenario.description);
      console.log(
        "- Current competitors length:",
        scenario.top_competitors?.length || 0
      );
      console.log("- Available input items:", items.length);

      items.forEach((item, itemIndex) => {
        const data = item.json || {};
        console.log(`  Input ${itemIndex}:`, Object.keys(data));
        if (data.scenario_rankings) {
          console.log(
            `    scenario_rankings count:`,
            data.scenario_rankings.length
          );
          data.scenario_rankings.forEach((ranking, rankIndex) => {
            if (ranking.scenario_id === 1) {
              console.log(
                `    ✅ Found scenario_id 1 in rankings[${rankIndex}]:`
              );
              console.log(
                `      - scenario_title: "${ranking.scenario_title}"`
              );
              console.log(`      - title: "${ranking.title}"`);
              console.log(
                `      - has analysis_details:`,
                !!ranking.analysis_details
              );
              console.log(
                `      - has competitors_ranked:`,
                !!ranking.competitors_ranked
              );
              if (ranking.analysis_details) {
                console.log(
                  `      - analysis_details companies:`,
                  Object.keys(ranking.analysis_details)
                );
              }
            }
          });
        }
      });
    }

    // Method 1: Check if original input data has analysis_details for this scenario
    items.forEach((item, itemIndex) => {
      const data = item.json || {};

      // Look for scenario_rankings with analysis_details
      if (data.scenario_rankings && Array.isArray(data.scenario_rankings)) {
        const matchingRanking = data.scenario_rankings.find(
          (ranking) =>
            ranking.scenario_id === scenario.scenario_id ||
            ranking.scenario_title === scenario.title ||
            ranking.title === scenario.title ||
            // Additional matching by checking if titles contain similar keywords
            (ranking.scenario_title &&
              scenario.title &&
              ranking.scenario_title.toLowerCase().includes("suite") &&
              scenario.title.toLowerCase().includes("scenario 1")) ||
            // Fallback: match by position if scenario_id matches
            (ranking.scenario_id === 1 && scenario.scenario_id === 1)
        );

        if (
          matchingRanking &&
          matchingRanking.analysis_details &&
          typeof matchingRanking.analysis_details === "object"
        ) {
          console.log(
            `✅ Found analysis_details for scenario ${scenario.scenario_id}`
          );
          console.log(
            "Companies in analysis_details:",
            Object.keys(matchingRanking.analysis_details)
          );

          // Build competitors from analysis_details
          const competitorsFromAnalysis = Object.entries(
            matchingRanking.analysis_details
          ).map(([companyName, details], index) => {
            // Calculate overall score from metrics if available
            let overallScore = null;
            if (details.metrics && typeof details.metrics === "object") {
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

            return {
              company: companyName,
              score: overallScore,
              rationale: [
                details.summary || "",
                (details.highlights || []).join("; "),
              ]
                .filter((text) => text && text.length > 0)
                .join(" | "),
              rank: index + 1,
              detailed_metrics: details.metrics || {},
            };
          });

          // Sort by score (highest first)
          competitorsFromAnalysis.sort((a, b) => {
            const scoreA = parseFloat(a.score) || 0;
            const scoreB = parseFloat(b.score) || 0;
            return scoreB - scoreA;
          });

          // Update ranks after sorting
          competitorsFromAnalysis.forEach((comp, index) => {
            comp.rank = index + 1;
          });

          scenario.top_competitors = competitorsFromAnalysis;
          console.log(
            `✅ Built ${competitorsFromAnalysis.length} competitors for scenario ${scenario.scenario_id}`
          );
        }
      }
    });
  } else {
    console.log(
      `✅ Scenario ${scenario.scenario_id} already has ${scenario.top_competitors.length} competitors`
    );
  }
});

// Final validation
const emptyScenarios = uniqueScenarios.filter(
  (sc) => !sc.top_competitors || sc.top_competitors.length === 0
);
console.log(
  `Final check: ${emptyScenarios.length} scenarios still have empty competitors`
);

if (emptyScenarios.length > 0) {
  console.log(
    "Empty scenarios:",
    emptyScenarios.map((sc) => `${sc.scenario_id}: ${sc.title}`)
  );
}

// Update the final data
formattedData.scenarios = uniqueScenarios;
formattedData.report_metadata.total_scenarios = uniqueScenarios.length;
formattedData.report_metadata.competitors_analyzed = [
  ...new Set(
    uniqueScenarios.flatMap((s) => s.top_competitors.map((c) => c.company || c))
  ),
];

// Remove duplicate enhanced citations
const uniqueCitations = [];
const citationMap = new Map();
formattedData.enhanced_citations.forEach((citation) => {
  const key = `${citation.claim_text || citation.title || "unknown"}_${
    citation.source_url || citation.url || "no_url"
  }`;
  if (!citationMap.has(key)) {
    citationMap.set(key, citation);
    uniqueCitations.push(citation);
  }
});
formattedData.enhanced_citations = uniqueCitations;

// Process enhanced citations into data sources table
formattedData.enhanced_citations.forEach((citation) => {
  const dataSource = {
    title: citation.claim_text || citation.title || "No claim text",
    url: citation.source_url || citation.url || "",
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
  formattedData.data_sources_table.push(dataSource);
});

// Process scenario sources into data sources table
formattedData.scenarios.forEach((scenario) => {
  if (scenario.sources && Array.isArray(scenario.sources)) {
    scenario.sources.forEach((source) => {
      if (typeof source === "string") {
        formattedData.data_sources_table.push({
          title: source,
          url: "",
          publisher: "",
          published: "",
          reliability: "",
          authority: "",
          author: "",
          notes: "",
          source_origin: "scenario_reference",
          claim_category: "",
          claim_impact_score: "",
          source_type: "",
          verification_status: "",
          real_time_indicators: [],
          influence_weight: 0,
          content_type: "",
          bias_indicators: "",
          cross_references: 0,
          sentiment_direction: "",
          brand_mention_type: "",
          strategic_relevance: "",
          actionability_score: "",
          geographic_scope: "",
          time_sensitivity: "",
          tags: [],
        });
      } else if (typeof source === "object") {
        formattedData.data_sources_table.push({
          title: source.title || source.name || source.source || "",
          url: source.url || source.link || "",
          publisher: source.publisher || source.outlet || source.domain || "",
          published: source.published || source.date || "",
          reliability: source.reliability || "",
          authority: source.authority || source.authority_score || "",
          author: source.author || source.byline || "",
          notes: source.notes || source.note || "",
          source_origin: source.source_origin || "scenario_reference",
          claim_category: source.claim_category || "",
          claim_impact_score: source.claim_impact_score || "",
          source_type: source.source_type || "",
          verification_status: source.verification_status || "",
          real_time_indicators: source.real_time_indicators || [],
          influence_weight: source.influence_weight || 0,
          content_type: source.content_type || "",
          bias_indicators: source.bias_indicators || "",
          cross_references: source.cross_references || 0,
          sentiment_direction: source.sentiment_direction || "",
          brand_mention_type: source.brand_mention_type || "",
          strategic_relevance: source.strategic_relevance || "",
          actionability_score: source.actionability_score || "",
          geographic_scope: source.geographic_scope || "",
          time_sensitivity: source.time_sensitivity || "",
          tags: source.tags || [],
        });
      }
    });
  }
});

// Remove duplicate data sources using proper object deduplication
const uniqueDataSources = [];
const dataSourceMap = new Map();
formattedData.data_sources_table.forEach((source) => {
  const key = `${source.title}_${source.url}_${source.publisher}`;
  if (!dataSourceMap.has(key)) {
    dataSourceMap.set(key, source);
    uniqueDataSources.push(source);
  }
});
formattedData.data_sources_table = uniqueDataSources;

console.log(
  "Data sources after deduplication:",
  formattedData.data_sources_table.length
);

// Calculate additional metrics
const totalCitations = formattedData.enhanced_citations.length;
const highAuthorityCitations = formattedData.enhanced_citations.filter(
  (c) => (c.authority_score || 0) >= 8
).length;
const verifiedCitations = formattedData.enhanced_citations.filter(
  (c) => c.verification_status === "verified"
).length;
const realTimeSources = formattedData.enhanced_citations.filter(
  (c) => c.source_origin === "real_time_search"
).length;

// Calculate scenario-specific metrics
formattedData.scenarios.forEach((scenario) => {
  // Win Rate: Percentage of scenarios where this company is in top 3
  const totalScenarios = formattedData.scenarios.length;
  const scenariosWithCompany = formattedData.scenarios.filter((s) =>
    s.top_competitors.some(
      (comp) =>
        (comp.company && comp.company.toLowerCase().includes("wynn")) ||
        (comp.company && comp.company.toLowerCase().includes("venetian")) ||
        (comp.company && comp.company.toLowerCase().includes("mgm")) ||
        (comp.company && comp.company.toLowerCase().includes("fontainebleau"))
    )
  ).length;

  // Average Position: Average ranking position across all scenarios
  const companyPositions = [];
  formattedData.scenarios.forEach((s) => {
    s.top_competitors.forEach((comp, index) => {
      if (comp.company) {
        companyPositions.push({
          company: comp.company,
          position: index + 1,
          score: comp.score || 0,
        });
      }
    });
  });

  // Group by company and calculate averages
  const companyStats = {};
  companyPositions.forEach((pos) => {
    if (!companyStats[pos.company]) {
      companyStats[pos.company] = {
        positions: [],
        scores: [],
        totalScenarios: 0,
      };
    }
    companyStats[pos.company].positions.push(pos.position);
    companyStats[pos.company].scores.push(pos.score);
    companyStats[pos.company].totalScenarios++;
  });

  // Calculate metrics for each company
  Object.keys(companyStats).forEach((company) => {
    const stats = companyStats[company];
    const avgPosition =
      stats.positions.reduce((sum, pos) => sum + pos, 0) /
      stats.positions.length;
    const avgScore =
      stats.scores.reduce((sum, score) => sum + score, 0) / stats.scores.length;
    const winRate =
      (stats.positions.filter((pos) => pos <= 3).length /
        stats.totalScenarios) *
      100;

    companyStats[company] = {
      ...stats,
      averagePosition: Math.round(avgPosition * 10) / 10,
      averageScore: Math.round(avgScore * 10) / 10,
      winRate: Math.round(winRate * 10) / 10,
      totalScenarios: stats.totalScenarios,
    };
  });

  // High Authority Citations: Count citations with authority >= 8 for this scenario
  const scenarioHighAuthorityCitations =
    formattedData.enhanced_citations.filter(
      (c) => (c.authority_score || 0) >= 8
    ).length;

  // Add scenario metrics to the scenario object
  scenario.metrics = {
    winRate: companyStats[scenario.title]?.winRate || 0,
    averagePosition: companyStats[scenario.title]?.averagePosition || 0,
    highAuthorityCitations: scenarioHighAuthorityCitations,
    totalCitations: formattedData.enhanced_citations.length,
    verifiedCitations: verifiedCitations,
    realTimeSources: realTimeSources,
  };
});

// Calculate overall company performance metrics
const companyPerformance = {};
formattedData.scenarios.forEach((scenario) => {
  scenario.top_competitors.forEach((comp, index) => {
    if (comp.company) {
      if (!companyPerformance[comp.company]) {
        companyPerformance[comp.company] = {
          positions: [],
          scores: [],
          scenarios: 0,
        };
      }
      companyPerformance[comp.company].positions.push(index + 1);
      companyPerformance[comp.company].scores.push(comp.score || 0);
      companyPerformance[comp.company].scenarios++;
    }
  });
});

// Calculate final company metrics
Object.keys(companyPerformance).forEach((company) => {
  const perf = companyPerformance[company];
  const avgPosition =
    perf.positions.reduce((sum, pos) => sum + pos, 0) / perf.positions.length;
  const avgScore =
    perf.scores.reduce((sum, score) => sum + score, 0) / perf.scores.length;
  const winRate =
    (perf.positions.filter((pos) => pos <= 3).length / perf.scenarios) * 100;

  companyPerformance[company] = {
    averagePosition: Math.round(avgPosition * 10) / 10,
    averageScore: Math.round(avgScore * 10) / 10,
    winRate: Math.round(winRate * 10) / 10,
    totalScenarios: perf.scenarios,
    highAuthorityCitations: highAuthorityCitations,
  };
});

// Add calculated metrics to quality_metrics
formattedData.quality_metrics = {
  ...formattedData.quality_metrics,
  total_citations: totalCitations,
  high_authority_citations: highAuthorityCitations,
  verified_citations: verifiedCitations,
  real_time_sources: realTimeSources,
  citation_authority_avg:
    totalCitations > 0
      ? (
          formattedData.enhanced_citations.reduce(
            (sum, c) => sum + (c.authority_score || 0),
            0
          ) / totalCitations
        ).toFixed(2)
      : 0,
  verification_rate:
    totalCitations > 0
      ? ((verifiedCitations / totalCitations) * 100).toFixed(1)
      : 0,
  company_performance: companyPerformance,
};

console.log("\n=== FINAL RESULTS ===");
console.log("Final company name:", formattedData.report_metadata.company);
console.log(
  "Total scenarios after deduplication:",
  formattedData.scenarios.length
);
console.log(
  "Competitors found:",
  formattedData.report_metadata.competitors_analyzed.length
);

// Debug: Show enhanced scenario titles and descriptions
console.log("\n=== ENHANCED SCENARIO TITLES & DESCRIPTIONS ===");
formattedData.scenarios.forEach((scenario, index) => {
  console.log(`Scenario ${scenario.scenario_id}: ${scenario.title}`);
  console.log(`  Description: ${scenario.description}`);
  console.log(`  Competitors: ${scenario.top_competitors.length}`);
  console.log(`  Key Findings: ${scenario.key_findings.length}`);
  console.log(`  Sources: ${scenario.sources.length}`);
  if (scenario.key_findings && scenario.key_findings.length > 0) {
    console.log(
      `  First Key Finding: ${scenario.key_findings[0].substring(0, 100)}...`
    );
  }
  console.log("");
});
console.log(
  "Unique enhanced citations:",
  formattedData.enhanced_citations.length
);
console.log(
  "Total data sources (including citations):",
  formattedData.data_sources_table.length
);
console.log("High authority citations:", highAuthorityCitations);
console.log("Verified citations:", verifiedCitations);
console.log("Real-time sources:", realTimeSources);

// Debug: Show company performance metrics
console.log("\n=== COMPANY PERFORMANCE METRICS ===");
Object.keys(companyPerformance).forEach((company) => {
  const perf = companyPerformance[company];
  console.log(`${company}:`);
  console.log(`  Win Rate: ${perf.winRate}%`);
  console.log(`  Average Position: ${perf.averagePosition}`);
  console.log(`  Average Score: ${perf.averageScore}`);
  console.log(`  Total Scenarios: ${perf.totalScenarios}`);
  console.log(`  High Authority Citations: ${perf.highAuthorityCitations}`);
});

// Debug: Show sample of enhanced citations
if (formattedData.enhanced_citations.length > 0) {
  console.log("\n=== SAMPLE ENHANCED CITATIONS ===");
  formattedData.enhanced_citations.slice(0, 3).forEach((citation, index) => {
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
if (formattedData.data_sources_table.length > 0) {
  console.log("\n=== SAMPLE DATA SOURCES ===");
  formattedData.data_sources_table.slice(0, 3).forEach((source, index) => {
    console.log(`Source ${index + 1}:`, {
      title: source.title,
      url: source.url,
      publisher: source.publisher,
      authority: source.authority,
      source_origin: source.source_origin,
    });
  });
}

return [{ json: formattedData }];
