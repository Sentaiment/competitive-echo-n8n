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

// Process each scenario to extract structured data
const processedScenarios = [];
const allSources = [];
const allCitations = [];

for (const scenario of scenarios) {
  console.log(`\nProcessing scenario ${scenario.scenario_id}:`);
  console.log("Response text length:", scenario.response_text?.length || 0);

  try {
    // Try to parse JSON from response_text
    let parsedResponse = null;
    let jsonText = null;
    if (scenario.response_text) {
      try {
        // Look for JSON in the response text - improved extraction
        // First try to find JSON between ```json and ``` markers
        
        const jsonBlockMatch = scenario.response_text.match(/```json\s*\n([\s\S]*?)\n```/);
        if (jsonBlockMatch) {
          jsonText = jsonBlockMatch[1];
          console.log("Found JSON block, length:", jsonText.length);
        } else {
          // Fallback: look for JSON starting with { and find the matching }
          const startIndex = scenario.response_text.indexOf('{');
          if (startIndex !== -1) {
            let braceCount = 0;
            let endIndex = startIndex;
            
            for (let i = startIndex; i < scenario.response_text.length; i++) {
              if (scenario.response_text[i] === '{') {
                braceCount++;
              } else if (scenario.response_text[i] === '}') {
                braceCount--;
                if (braceCount === 0) {
                  endIndex = i;
                  break;
                }
              }
            }
            
            if (braceCount === 0) {
              jsonText = scenario.response_text.substring(startIndex, endIndex + 1);
              console.log("Found balanced JSON, length:", jsonText.length);
            }
          }
        }
        
        if (jsonText) {
          parsedResponse = JSON.parse(jsonText);
          console.log(
            "Parsed response keys:",
            Object.keys(parsedResponse || {})
          );
          console.log("Parsed title:", parsedResponse?.title);
          console.log(
            "Parsed description:",
            parsedResponse?.description?.substring(0, 100) + "..."
          );
          console.log(
            "Competitors ranked count:",
            parsedResponse?.competitors_ranked?.length || 0
          );
        }
      } catch (e) {
        console.log("Could not parse JSON from response text:", e.message);
        console.log("JSON text length:", jsonText?.length || 0);
        console.log("First 200 chars:", jsonText?.substring(0, 200) || "N/A");
      }
    }

    // Extract scenario data - FIXED to use parsed response title and description
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

    console.log("Extracted scenario title:", scenarioData.scenario_title);
    console.log(
      "Extracted scenario description length:",
      scenarioData.scenario_description?.length || 0
    );

    processedScenarios.push(scenarioData);

    // Extract sources and citations if available
    if (parsedResponse?.sources) {
      allSources.push(
        ...(Array.isArray(parsedResponse.sources) ? parsedResponse.sources : [])
      );
    }

    if (parsedResponse?.citations) {
      allCitations.push(
        ...(Array.isArray(parsedResponse.citations)
          ? parsedResponse.citations
          : [])
      );
    }
  } catch (error) {
    console.error(
      `Error processing scenario ${scenario.scenario_id}:`,
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
console.log("Processed scenarios:", processedScenarios.length);
console.log(
  "Scenarios with proper titles:",
  summaryStats.scenarios_with_titles
);
console.log(
  "Scenarios with descriptions:",
  summaryStats.scenarios_with_descriptions
);
console.log("Sources found:", allSources.length);
console.log("Citations found:", allCitations.length);

// Log sample of processed scenarios
console.log("\n=== SAMPLE PROCESSED SCENARIOS ===");
processedScenarios.slice(0, 3).forEach((scenario, index) => {
  console.log(`Scenario ${index + 1}:`);
  console.log(`  ID: ${scenario.scenario_id}`);
  console.log(`  Title: ${scenario.scenario_title}`);
  console.log(
    `  Description: ${scenario.scenario_description?.substring(0, 100)}...`
  );
  console.log(`  Competitors: ${scenario.competitors_ranked?.length || 0}`);
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
