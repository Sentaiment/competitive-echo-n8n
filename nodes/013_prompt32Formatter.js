// Prompt 32 Formatter - Convert Format Prompt 32 output to merge-compatible format
// Input: { scenarios_completed: 12, results: [...] }
// Output: Structured data compatible with Collect All Data merge

const input = $input.first()?.json || {};

console.log("=== PROMPT 32 FORMATTER DEBUG ===");
console.log("Input keys:", Object.keys(input));
console.log("Scenarios completed:", input.scenarios_completed);
console.log("Results length:", input.results?.length || 0);

// Debug the first few results to see their structure
if (input.results && input.results.length > 0) {
  console.log("\n=== SAMPLE RESULTS DEBUG ===");
  input.results.slice(0, 3).forEach((result, index) => {
    console.log(`\nResult ${index + 1}:`);
    console.log("Keys:", Object.keys(result));
    console.log("Scenario ID:", result.scenario_id);
    console.log("Scenario Title:", result.scenario_title);
    console.log("Response text length:", result.response_text?.length || 0);
    console.log(
      "Response text preview:",
      result.response_text?.substring(0, 300) || "No response text"
    );
  });
}

// Extract scenarios from the results
const scenarios = input.results || [];

// Function to extract JSON from response_text with aggressive cleaning
function extractJsonFromResponse(responseText, scenarioId) {
  if (!responseText) {
    console.log(`❌ No response text for scenario ${scenarioId}`);
    return null;
  }

  let jsonString = null;

  // First, try to extract JSON block
  const jsonBlockMatch = responseText.match(/```json\s*([\s\S]*?)```/);
  if (jsonBlockMatch) {
    jsonString = jsonBlockMatch[1].trim();
  } else {
    // Fallback to finding JSON by braces
    const startIndex = responseText.indexOf("{");
    if (startIndex !== -1) {
      let braceCount = 0;
      let endIndex = startIndex;

      for (let i = startIndex; i < responseText.length; i++) {
        if (responseText[i] === "{") {
          braceCount++;
        } else if (responseText[i] === "}") {
          braceCount--;
          if (braceCount === 0) {
            endIndex = i;
            break;
          }
        }
      }

      if (braceCount === 0) {
        jsonString = responseText.substring(startIndex, endIndex + 1);
      }
    }
  }

  if (!jsonString) {
    console.log(`❌ No JSON found in response text for scenario ${scenarioId}`);
    return null;
  }

  console.log(
    `📋 Original JSON length for scenario ${scenarioId}:`,
    jsonString.length
  );

  // Debug: Check if the JSON contains more competitors than we're extracting
  const competitorsMatch = jsonString.match(
    /"competitors_ranked":\s*\[([\s\S]*?)\]/
  );
  if (competitorsMatch) {
    const competitorsContent = competitorsMatch[1];

    // Count competitors using proper brace matching
    let competitorCount = 0;
    let currentPos = 0;

    while (currentPos < competitorsContent.length) {
      const openBracePos = competitorsContent.indexOf("{", currentPos);
      if (openBracePos === -1) break;

      let braceCount = 0;
      let endPos = openBracePos;

      for (let i = openBracePos; i < competitorsContent.length; i++) {
        if (competitorsContent[i] === "{") {
          braceCount++;
        } else if (competitorsContent[i] === "}") {
          braceCount--;
          if (braceCount === 0) {
            endPos = i;
            break;
          }
        }
      }

      if (braceCount === 0) {
        competitorCount++;
        currentPos = endPos + 1;
      } else {
        currentPos = openBracePos + 1;
      }
    }

    console.log(`  Found ${competitorCount} competitor objects in raw JSON`);

    if (competitorCount > 4) {
      console.log(
        `  ⚠️  WARNING: JSON contains ${competitorCount} competitors but we might only be extracting 4`
      );
      console.log(
        `  Raw competitors content preview: ${competitorsContent.substring(
          0,
          200
        )}...`
      );
    }
  }

  // Apply aggressive cleaning specifically targeting the malformed patterns
  let cleaned = jsonString;

  try {
    // Target the specific issues in the sources array
    cleaned = cleaned.replace(
      /"sources":\s*\[([\s\S]*?)\]/g,
      (match, sourcesContent) => {
        // Clean the sources array content aggressively
        let cleanedSources = sourcesContent
          // Fix the specific malformed pattern: "url"\," -> "url",
          .replace(/"([^"]*?)"\s*\\\s*,\s*"/g, '"$1",\n    "')
          // Fix pattern at end of array: "url"\, -> "url"
          .replace(/"([^"]*?)"\s*\\\s*,?\s*$/gm, '"$1"')
          // Remove any remaining backslashes before quotes
          .replace(/\\\s*"/g, '"')
          // Remove standalone backslashes
          .replace(/\\\s*,/g, ",")
          // Clean up any remaining backslashes
          .replace(/\\+/g, "")
          // Fix double commas
          .replace(/,\s*,/g, ",")
          // Remove trailing commas
          .replace(/,\s*$/, "")
          // Normalize spacing
          .replace(/"\s*,\s*"/g, '",\n    "')
          // Clean up the beginning and end
          .replace(/^\s*,/, "") // Remove leading comma
          .replace(/,\s*$/, "") // Remove trailing comma
          .trim();

        return `"sources": [\n    ${cleanedSources}\n  ]`;
      }
    );

    // General cleaning
    cleaned = cleaned
      .replace(/\\+/g, "") // Remove all backslashes
      .replace(/,\s*,/g, ",") // Fix double commas
      .replace(/,(\s*[}\]])/g, "$1") // Remove trailing commas before closing
      .trim();

    console.log(
      `🧹 Cleaned JSON length for scenario ${scenarioId}:`,
      cleaned.length
    );

    // Try to parse the cleaned JSON
    const parsed = JSON.parse(cleaned);
    console.log(`✅ Successfully parsed JSON for scenario ${scenarioId}`);
    return parsed;
  } catch (error) {
    console.log(
      `❌ JSON parsing failed for scenario ${scenarioId}:`,
      error.message
    );

    // For scenarios 1 and 5, try direct string extraction instead of JSON parsing
    if (scenarioId === 1 || scenarioId === 5) {
      console.log(
        "🔧 Attempting direct string extraction for scenario",
        scenarioId
      );

      try {
        // Extract data directly from the original response text using string methods
        const responseText = jsonString;

        // Extract title
        const titleMatch = responseText.match(/"title":\s*"([^"]+)"/);
        const title = titleMatch ? titleMatch[1] : null;

        // Extract description
        const descMatch = responseText.match(
          /"description":\s*"([^"]+(?:\\.[^"]*)*?)"/
        );
        const description = descMatch
          ? descMatch[1].replace(/\\"/g, '"')
          : null;

        // Extract competitors_ranked array
        const competitorsMatch = responseText.match(
          /"competitors_ranked":\s*\[([\s\S]*?)\]/
        );
        const competitors = [];
        if (competitorsMatch) {
          // Extract each competitor object using proper brace matching
          const competitorsContent = competitorsMatch[1];
          let currentPos = 0;

          while (currentPos < competitorsContent.length) {
            // Find the next opening brace
            const openBracePos = competitorsContent.indexOf("{", currentPos);
            if (openBracePos === -1) break;

            // Count braces to find the complete object
            let braceCount = 0;
            let endPos = openBracePos;

            for (let i = openBracePos; i < competitorsContent.length; i++) {
              if (competitorsContent[i] === "{") {
                braceCount++;
              } else if (competitorsContent[i] === "}") {
                braceCount--;
                if (braceCount === 0) {
                  endPos = i;
                  break;
                }
              }
            }

            if (braceCount === 0) {
              const compObj = competitorsContent.substring(
                openBracePos,
                endPos + 1
              );

              const companyMatch = compObj.match(/"company":\s*"([^"]+)"/);
              const scoreMatch = compObj.match(/"score":\s*([0-9.]+)/);
              const rationaleMatch = compObj.match(
                /"rationale":\s*"([^"]+(?:\\.[^"]*)*?)"/
              );

              if (companyMatch && scoreMatch && rationaleMatch) {
                competitors.push({
                  company: companyMatch[1],
                  score: parseFloat(scoreMatch[1]),
                  rationale: rationaleMatch[1].replace(/\\"/g, '"'),
                });
              }

              currentPos = endPos + 1;
            } else {
              // If we couldn't find matching braces, skip this object
              currentPos = openBracePos + 1;
            }
          }
        }

        // Extract analysis_details
        const analysisMatch = responseText.match(
          /"analysis_details":\s*\{([\s\S]*?)\}(?:\s*,\s*"key_findings")/
        );
        const analysisDetails = {};
        if (analysisMatch) {
          // Extract each company analysis
          const companyAnalyses =
            analysisMatch[1].match(
              /"[^"]+"\s*:\s*\{[^}]+(?:\{[^}]*\}[^}]*)*\}/g
            ) || [];
          for (const analysis of companyAnalyses) {
            const companyNameMatch = analysis.match(/^"([^"]+)":/);
            if (companyNameMatch) {
              const companyName = companyNameMatch[1];

              // Extract summary
              const summaryMatch = analysis.match(
                /"summary":\s*"([^"]+(?:\\.[^"]*)*?)"/
              );

              // Extract highlights array
              const highlightsMatch = analysis.match(
                /"highlights":\s*\[([\s\S]*?)\]/
              );
              const highlights = [];
              if (highlightsMatch) {
                const highlightMatches =
                  highlightsMatch[1].match(/"([^"]+(?:\\.[^"]*)*?)"/g) || [];
                highlights.push(
                  ...highlightMatches.map((h) =>
                    h.slice(1, -1).replace(/\\"/g, '"')
                  )
                );
              }

              analysisDetails[companyName] = {
                summary: summaryMatch
                  ? summaryMatch[1].replace(/\\"/g, '"')
                  : "",
                highlights: highlights,
                metrics: {}, // We could extract this too if needed
              };
            }
          }
        }

        // Extract key_findings array
        const findingsMatch = responseText.match(
          /"key_findings":\s*\[([\s\S]*?)\]/
        );
        const keyFindings = [];
        if (findingsMatch) {
          const findingMatches =
            findingsMatch[1].match(/"([^"]+(?:\\.[^"]*)*?)"/g) || [];
          keyFindings.push(
            ...findingMatches.map((f) => f.slice(1, -1).replace(/\\"/g, '"'))
          );
        }

        console.log(`✅ Direct extraction for scenario ${scenarioId}:`);
        console.log(`  Title: ${title}`);
        console.log(`  Competitors: ${competitors.length}`);
        console.log(
          `  Analysis companies: ${Object.keys(analysisDetails).length}`
        );
        console.log(`  Key findings: ${keyFindings.length}`);

        return {
          title: title,
          description: description,
          competitors_ranked: competitors,
          analysis_details: analysisDetails,
          key_findings: keyFindings,
        };
      } catch (extractError) {
        console.log(
          `❌ Direct extraction also failed for scenario ${scenarioId}:`,
          extractError.message
        );
      }
    }

    return null;
  }
}

// Process each scenario to extract structured data
const processedScenarios = [];
const allSources = [];
const allCitations = [];

for (const scenario of scenarios) {
  console.log(`\n🔍 Processing scenario ${scenario.scenario_id}:`);
  console.log(`Response text length: ${scenario.response_text?.length || 0}`);
  console.log(
    `Response text preview (first 200 chars): ${
      scenario.response_text?.substring(0, 200) || "No response text"
    }`
  );

  try {
    // Extract JSON from response text
    const parsedResponse = extractJsonFromResponse(
      scenario.response_text,
      scenario.scenario_id
    );

    // Helper function to detect dimension from title/description
    function detectDimension(title, description) {
      const text = `${title || ""} ${description || ""}`.toLowerCase();

      if (text.includes("concierge") || text.includes("service quality")) {
        return "concierge_services";
      } else if (text.includes("luxury") || text.includes("premium")) {
        return "luxury_hospitality";
      } else if (text.includes("hotel") || text.includes("resort")) {
        return "hospitality";
      } else if (text.includes("suite") || text.includes("accommodation")) {
        return "accommodation_services";
      } else if (text.includes("dining") || text.includes("restaurant")) {
        return "dining_services";
      } else if (text.includes("entertainment") || text.includes("casino")) {
        return "entertainment_services";
      }
      return "hospitality_services"; // Default fallback
    }

    // Helper function to extract meaningful user query
    function extractUserQuery(parsedResponse, scenarioTitle) {
      if (
        parsedResponse?.user_query &&
        parsedResponse.user_query !== scenarioTitle &&
        !parsedResponse.user_query.startsWith("Scenario ")
      ) {
        return parsedResponse.user_query;
      }

      // Extract meaningful query from title
      if (scenarioTitle && !scenarioTitle.startsWith("Scenario ")) {
        return `Analyze ${scenarioTitle.toLowerCase()}`;
      }

      // If we have a parsed response with a good title, use that
      if (
        parsedResponse?.title &&
        !parsedResponse.title.startsWith("Scenario ")
      ) {
        return `Analyze ${parsedResponse.title.toLowerCase()}`;
      }

      return scenarioTitle || `Scenario ${scenario.scenario_id}`;
    }

    // Create scenario data with enhanced field extraction
    const scenarioData = {
      scenario_id: scenario.scenario_id,
      scenario_title:
        parsedResponse?.title ||
        scenario.scenario_title ||
        `Scenario ${scenario.scenario_id}`,
      scenario_description: parsedResponse?.description || "",
      dimension:
        parsedResponse?.dimension ||
        detectDimension(parsedResponse?.title, parsedResponse?.description),
      user_query: extractUserQuery(parsedResponse, scenario.scenario_title),
      competitors_ranked: parsedResponse?.competitors_ranked || [],
      analysis_details: parsedResponse?.analysis_details || {},
      key_findings: parsedResponse?.key_findings || [],
      sources: parsedResponse?.sources || [], // Extract sources to top level
      response_text: scenario.response_text,
      model: scenario.model,
      tokens_used: scenario.tokens_used,
      timestamp: scenario.timestamp,
    };

    // Data validation and quality checks
    const validationResults = {
      hasTitle: !!(
        scenarioData.scenario_title &&
        scenarioData.scenario_title !== `Scenario ${scenario.scenario_id}`
      ),
      hasDescription: !!(
        scenarioData.scenario_description &&
        scenarioData.scenario_description.length > 10
      ),
      hasCompetitors: !!(
        scenarioData.competitors_ranked &&
        scenarioData.competitors_ranked.length > 0
      ),
      hasAnalysis: !!(
        scenarioData.analysis_details &&
        Object.keys(scenarioData.analysis_details).length > 0
      ),
      hasKeyFindings: !!(
        scenarioData.key_findings && scenarioData.key_findings.length > 0
      ),
      hasSources: !!(scenarioData.sources && scenarioData.sources.length > 0),
      validDimension: scenarioData.dimension !== "unknown",
      validUserQuery: !!(
        scenarioData.user_query &&
        !scenarioData.user_query.startsWith("Scenario ")
      ),
    };

    // Calculate data quality score
    const qualityScore =
      Object.values(validationResults).filter(Boolean).length /
      Object.keys(validationResults).length;
    scenarioData.data_quality_score = Math.round(qualityScore * 100);
    scenarioData.validation_results = validationResults;

    console.log(`📊 Scenario ${scenario.scenario_id} results:`);
    console.log(`  Title: ${scenarioData.scenario_title}`);
    console.log(`  Dimension: ${scenarioData.dimension}`);
    console.log(`  User Query: ${scenarioData.user_query}`);
    console.log(`  Data Quality Score: ${scenarioData.data_quality_score}%`);
    console.log(
      `  Description length: ${scenarioData.scenario_description?.length || 0}`
    );
    console.log(
      `  Competitors: ${scenarioData.competitors_ranked?.length || 0}`
    );
    console.log(
      `  Analysis companies: ${
        Object.keys(scenarioData.analysis_details || {}).length
      }`
    );
    console.log(`  Key findings: ${scenarioData.key_findings?.length || 0}`);
    console.log(`  Sources: ${scenarioData.sources?.length || 0}`);

    // Debug competitor details
    if (
      scenarioData.competitors_ranked &&
      scenarioData.competitors_ranked.length > 0
    ) {
      console.log(`  Competitor details:`);
      scenarioData.competitors_ranked.forEach((comp, idx) => {
        console.log(
          `    ${idx + 1}. ${comp.company}: ${comp.score || "N/A"} - ${
            comp.rationale?.substring(0, 50) || "No rationale"
          }...`
        );
      });
    }

    // Debug analysis details
    if (
      scenarioData.analysis_details &&
      Object.keys(scenarioData.analysis_details).length > 0
    ) {
      console.log(`  Analysis details companies:`);
      Object.keys(scenarioData.analysis_details).forEach((company, idx) => {
        const details = scenarioData.analysis_details[company];
        console.log(
          `    ${idx + 1}. ${company}: ${
            details.summary?.substring(0, 50) || "No summary"
          }...`
        );
      });
    }

    // Debug: Check if we're missing competitors in the JSON but they exist in the response text
    if (
      scenarioData.competitors_ranked &&
      scenarioData.competitors_ranked.length > 0
    ) {
      console.log(
        `🔍 Checking if more competitors exist in response text for scenario ${scenario.scenario_id}...`
      );
      const responseText = scenario.response_text || "";

      // Look for patterns that might indicate more competitors
      const companyMentions =
        responseText.match(
          /[A-Z][a-zA-Z\s&]+(?:Resort|Hotel|Casino|Las Vegas|Vegas)/g
        ) || [];
      const uniqueCompanies = [...new Set(companyMentions)];

      console.log(
        `  Found ${uniqueCompanies.length} potential company mentions in response text:`
      );
      uniqueCompanies.slice(0, 10).forEach((company, idx) => {
        console.log(`    ${idx + 1}. ${company}`);
      });

      if (uniqueCompanies.length > scenarioData.competitors_ranked.length) {
        console.log(
          `  ⚠️  WARNING: Found ${uniqueCompanies.length} potential companies but only ${scenarioData.competitors_ranked.length} in competitors_ranked`
        );
        console.log(
          `  This suggests the JSON extraction might be incomplete or the LLM response is truncated`
        );
      }
    }

    // If no competitors found, try to extract from the raw response text using regex
    if (
      !scenarioData.competitors_ranked ||
      scenarioData.competitors_ranked.length === 0
    ) {
      console.log(
        `🔧 No competitors found for scenario ${scenario.scenario_id}, trying regex extraction...`
      );

      // Try to extract company names and scores from the response text
      const responseText = scenario.response_text || "";

      // Look for patterns like "Company Name: Score" or "1. Company Name (Score)"
      const companyPatterns = [
        /(\d+\.?\s*)([A-Z][a-zA-Z\s&]+?)\s*[:\-\(]?\s*(\d+(?:\.\d+)?)/g,
        /([A-Z][a-zA-Z\s&]+?)\s*[:\-\(]?\s*(\d+(?:\.\d+)?)/g,
        /"company":\s*"([^"]+)"/g,
        /"score":\s*(\d+(?:\.\d+)?)/g,
      ];

      const extractedCompanies = [];
      const extractedScores = [];

      companyPatterns.forEach((pattern, index) => {
        const matches = [...responseText.matchAll(pattern)];
        matches.forEach((match) => {
          if (index === 0 || index === 1) {
            // Pattern that captures both company and score
            if (match[2] && match[3]) {
              extractedCompanies.push({
                company: match[2].trim(),
                score: parseFloat(match[3]),
                rank: extractedCompanies.length + 1,
              });
            }
          } else if (index === 2) {
            // Company name pattern
            extractedCompanies.push({
              company: match[1],
              score: null,
              rank: extractedCompanies.length + 1,
            });
          } else if (index === 3) {
            // Score pattern
            extractedScores.push(parseFloat(match[1]));
          }
        });
      });

      // If we found companies but no scores, try to match them
      if (extractedCompanies.length > 0) {
        extractedCompanies.forEach((comp, index) => {
          if (!comp.score && extractedScores[index]) {
            comp.score = extractedScores[index];
          }
        });

        // Sort by score if available
        extractedCompanies.sort((a, b) => (b.score || 0) - (a.score || 0));

        // Update ranks
        extractedCompanies.forEach((comp, index) => {
          comp.rank = index + 1;
        });

        scenarioData.competitors_ranked = extractedCompanies;
        console.log(
          `✅ Extracted ${extractedCompanies.length} competitors using regex`
        );
      }
    }

    // Add processing status
    scenarioData.processing_status = "success";
    processedScenarios.push(scenarioData);

    // Extract sources and citations if available
    if (parsedResponse?.sources) {
      const sources = Array.isArray(parsedResponse.sources)
        ? parsedResponse.sources
        : [];
      allSources.push(...sources);
      console.log(`  Sources found: ${sources.length}`);
    }

    if (parsedResponse?.citations) {
      const citations = Array.isArray(parsedResponse.citations)
        ? parsedResponse.citations
        : [];
      allCitations.push(...citations);
    }
  } catch (error) {
    console.error(
      `❌ Error processing scenario ${scenario.scenario_id}:`,
      error.message
    );

    // Create enhanced fallback scenario data with better defaults
    const fallbackData = {
      scenario_id: scenario.scenario_id,
      scenario_title:
        scenario.scenario_title || `Scenario ${scenario.scenario_id}`,
      scenario_description: "",
      dimension: "hospitality_services", // Better default than "unknown"
      user_query:
        scenario.scenario_title || `Analyze scenario ${scenario.scenario_id}`,
      competitors_ranked: [],
      analysis_details: {},
      key_findings: [],
      sources: [],
      response_text: scenario.response_text,
      model: scenario.model,
      tokens_used: scenario.tokens_used,
      timestamp: scenario.timestamp,
      error: error.message,
      data_quality_score: 0,
      validation_results: {
        hasTitle: false,
        hasDescription: false,
        hasCompetitors: false,
        hasAnalysis: false,
        hasKeyFindings: false,
        hasSources: false,
        validDimension: false,
        validUserQuery: false,
      },
      processing_status: "error",
    };

    processedScenarios.push(fallbackData);
  }
}

// Create enhanced summary statistics
const summaryStats = {
  total_scenarios: processedScenarios.length,
  scenarios_with_rankings: processedScenarios.filter(
    (s) => s.competitors_ranked?.length > 0
  ).length,
  scenarios_with_analysis: processedScenarios.filter(
    (s) => Object.keys(s.analysis_details || {}).length > 0
  ).length,
  scenarios_with_titles: processedScenarios.filter(
    (s) => s.scenario_title && !s.scenario_title.startsWith("Scenario ")
  ).length,
  scenarios_with_descriptions: processedScenarios.filter(
    (s) => s.scenario_description && s.scenario_description.length > 0
  ).length,
  scenarios_with_sources: processedScenarios.filter(
    (s) => s.sources && s.sources.length > 0
  ).length,
  successful_scenarios: processedScenarios.filter(
    (s) => s.processing_status === "success"
  ).length,
  error_scenarios: processedScenarios.filter(
    (s) => s.processing_status === "error"
  ).length,
  average_quality_score: Math.round(
    processedScenarios.reduce(
      (sum, s) => sum + (s.data_quality_score || 0),
      0
    ) / processedScenarios.length
  ),
  high_quality_scenarios: processedScenarios.filter(
    (s) => (s.data_quality_score || 0) >= 80
  ).length,
  total_sources: allSources.length,
  total_citations: allCitations.length,
  processing_timestamp: new Date().toISOString(),
};

console.log("\n=== PROCESSING COMPLETE ===");
console.log("✅ Processed scenarios:", processedScenarios.length);
console.log("✅ Successful scenarios:", summaryStats.successful_scenarios);
console.log("❌ Error scenarios:", summaryStats.error_scenarios);
console.log(
  "📊 Average quality score:",
  summaryStats.average_quality_score + "%"
);
console.log(
  "⭐ High quality scenarios (≥80%):",
  summaryStats.high_quality_scenarios
);
console.log(
  "✅ Scenarios with proper titles:",
  summaryStats.scenarios_with_titles
);
console.log(
  "✅ Scenarios with descriptions:",
  summaryStats.scenarios_with_descriptions
);
console.log(
  "✅ Scenarios with rankings:",
  summaryStats.scenarios_with_rankings
);
console.log(
  "✅ Scenarios with analysis:",
  summaryStats.scenarios_with_analysis
);
console.log("✅ Scenarios with sources:", summaryStats.scenarios_with_sources);
console.log("✅ Sources found:", allSources.length);

// Log detailed parsing results with quality scores
console.log("\n=== DETAILED PARSING RESULTS ===");
processedScenarios.forEach((scenario) => {
  const hasData =
    scenario.competitors_ranked?.length > 0 ||
    Object.keys(scenario.analysis_details || {}).length > 0;
  const status =
    scenario.processing_status === "success" ? "✅ SUCCESS" : "❌ ERROR";
  const qualityScore = scenario.data_quality_score || 0;
  const qualityIcon =
    qualityScore >= 80 ? "⭐" : qualityScore >= 60 ? "📊" : "⚠️";

  console.log(
    `${status} ${qualityIcon} - Scenario ${scenario.scenario_id}: ${scenario.scenario_title} (Quality: ${qualityScore}%)`
  );
});

// Return structured data compatible with Collect All Data merge
return [
  {
    json: {
      // Scenario data
      scenario_rankings: processedScenarios,
      scenarios: processedScenarios, // Alternative key for compatibility

      // Sources and citations (if any were found)
      data_sources: allSources,
      source_citations: allCitations,

      // Summary statistics
      summary_stats: summaryStats,

      // Metadata
      company: input.company || "Report",
      processing_type: "prompt_32_formatter",

      // Original data for debugging
      original_scenarios_completed: input.scenarios_completed,
      original_results_count: input.results?.length || 0,
    },
  },
];
