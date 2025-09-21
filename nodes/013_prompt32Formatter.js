// Prompt 32 Formatter - Convert Format Prompt 32 output to merge-compatible format
// Input: { scenarios_completed: 12, results: [...] }
// Output: Structured data compatible with Collect All Data merge

const input = $input.first()?.json || {};

console.log("=== PROMPT 32 FORMATTER DEBUG ===");
console.log("Input keys:", Object.keys(input));
console.log("Scenarios completed:", input.scenarios_completed);
console.log("Results length:", input.results?.length || 0);

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
          // Extract each competitor object
          const competitorObjects =
            competitorsMatch[1].match(/\{[^}]+\}/g) || [];
          for (const compObj of competitorObjects) {
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

  try {
    // Extract JSON from response text
    const parsedResponse = extractJsonFromResponse(
      scenario.response_text,
      scenario.scenario_id
    );

    // Create scenario data
    const scenarioData = {
      scenario_id: scenario.scenario_id,
      scenario_title:
        parsedResponse?.title ||
        scenario.scenario_title ||
        `Scenario ${scenario.scenario_id}`,
      scenario_description: parsedResponse?.description || "",
      dimension: parsedResponse?.dimension || "unknown",
      user_query: parsedResponse?.user_query || scenario.scenario_title,
      competitors_ranked: parsedResponse?.competitors_ranked || [],
      analysis_details: parsedResponse?.analysis_details || {},
      key_findings: parsedResponse?.key_findings || [],
      response_text: scenario.response_text,
      model: scenario.model,
      tokens_used: scenario.tokens_used,
      timestamp: scenario.timestamp,
    };

    console.log(`📊 Scenario ${scenario.scenario_id} results:`);
    console.log(`  Title: ${scenarioData.scenario_title}`);
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

    // Create fallback scenario data
    processedScenarios.push({
      scenario_id: scenario.scenario_id,
      scenario_title:
        scenario.scenario_title || `Scenario ${scenario.scenario_id}`,
      scenario_description: "",
      dimension: "unknown",
      user_query: scenario.scenario_title,
      competitors_ranked: [],
      analysis_details: {},
      key_findings: [],
      response_text: scenario.response_text,
      model: scenario.model,
      tokens_used: scenario.tokens_used,
      timestamp: scenario.timestamp,
      error: error.message,
    });
  }
}

// Create summary statistics
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
  total_sources: allSources.length,
  total_citations: allCitations.length,
  processing_timestamp: new Date().toISOString(),
};

console.log("\n=== PROCESSING COMPLETE ===");
console.log("✅ Processed scenarios:", processedScenarios.length);
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
console.log("✅ Sources found:", allSources.length);

// Log successful parsing results
console.log("\n=== SUCCESSFUL PARSING RESULTS ===");
processedScenarios.forEach((scenario) => {
  const hasData =
    scenario.competitors_ranked?.length > 0 ||
    Object.keys(scenario.analysis_details || {}).length > 0;
  const status = hasData ? "✅ SUCCESS" : "❌ NO DATA";
  console.log(
    `${status} - Scenario ${scenario.scenario_id}: ${scenario.scenario_title}`
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
