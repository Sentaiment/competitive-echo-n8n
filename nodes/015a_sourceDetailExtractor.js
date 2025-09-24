// URL Extractor - Fixed JSON Parsing
console.log("=== URL EXTRACTOR - FIXED JSON PARSING ===");

const inputData = $input.first().json;
console.log("Input type:", typeof inputData);
console.log("Input keys:", Object.keys(inputData));

let allSources = [];
let debugInfo = [];

// The input is an object, not an array
// Let's check what's inside
if (inputData.results && Array.isArray(inputData.results)) {
  console.log(`Found ${inputData.results.length} scenarios in results array`);
  debugInfo.push(
    `Found ${inputData.results.length} scenarios in results array`
  );

  inputData.results.forEach((scenario, index) => {
    const scenarioDebug = `Processing scenario ${index + 1}: ${
      scenario.scenario_id || scenario.title
    }`;
    console.log(scenarioDebug);
    debugInfo.push(scenarioDebug);

    if (scenario.response_text) {
      try {
        // Clean the response_text - remove everything after the JSON
        let cleanResponseText = scenario.response_text.trim();

        // Find the end of the JSON object by looking for the closing brace
        // and removing any text after it (like "Note: This is a truncated response...")
        const lastBraceIndex = cleanResponseText.lastIndexOf("}");
        if (lastBraceIndex !== -1) {
          cleanResponseText = cleanResponseText.substring(
            0,
            lastBraceIndex + 1
          );
        }

        const parsed = JSON.parse(cleanResponseText);
        const parseDebug = `  Parsed JSON successfully - Has sources field: ${!!parsed.sources}`;
        console.log(parseDebug);
        debugInfo.push(parseDebug);

        if (parsed.sources && Array.isArray(parsed.sources)) {
          const sourcesDebug = `  Found ${parsed.sources.length} sources`;
          console.log(sourcesDebug);
          debugInfo.push(sourcesDebug);

          parsed.sources.forEach((source, sourceIndex) => {
            const sourceDebug = `    Source ${sourceIndex + 1}: ${source}`;
            console.log(sourceDebug);
            debugInfo.push(sourceDebug);

            // Extract URL if present
            let url = null;
            if (source.includes("http")) {
              const urlMatch = source.match(/(https?:\/\/[^\s\)]+)/);
              if (urlMatch) {
                url = urlMatch[1];
              }
            }

            // Extract domain
            let domain = null;
            if (url) {
              try {
                domain = new URL(url).hostname;
              } catch (e) {
                // If URL parsing fails, try to extract domain manually
                const domainMatch = source.match(/(?:https?:\/\/)?([^\/\s]+)/);
                if (domainMatch) {
                  domain = domainMatch[1];
                }
              }
            }

            allSources.push({
              source_name: source,
              source_url: url,
              source_domain: domain,
              scenario_id: scenario.scenario_id,
              scenario_title: scenario.scenario_title || scenario.title,
            });
          });
        } else {
          const noSourcesDebug = `  No sources array found in parsed data`;
          console.log(noSourcesDebug);
          debugInfo.push(noSourcesDebug);
        }
      } catch (error) {
        const errorDebug = `  JSON parse error: ${error.message}`;
        console.log(errorDebug);
        debugInfo.push(errorDebug);
      }
    } else {
      const noResponseDebug = `  No response_text field`;
      console.log(noResponseDebug);
      debugInfo.push(noResponseDebug);
    }
  });
} else {
  const noResultsDebug = "No results array found in input data";
  console.log(noResultsDebug);
  console.log("Available keys:", Object.keys(inputData));
  debugInfo.push(noResultsDebug);
  debugInfo.push(`Available keys: ${Object.keys(inputData).join(", ")}`);
}

const totalDebug = `Total sources extracted: ${allSources.length}`;
console.log(totalDebug);
debugInfo.push(totalDebug);

// Return results with debug info
return [
  {
    json: {
      source_extraction_prompts: allSources,
      original_data: inputData,
      debug_info: debugInfo, // This will show us what happened
      extraction_metadata: {
        total_sources: allSources.length,
        total_scenarios: inputData.results ? inputData.results.length : 0,
        total_source_references: allSources.length,
        data_extraction_run_timestamp: new Date().toISOString(),
        prd_version: "2.0",
        scenarios_processed: inputData.results
          ? inputData.results.map((s) => ({
              id: s.scenario_id,
              title: s.scenario_title || s.title,
              sources_count: s.response_text
                ? (() => {
                    try {
                      let cleanText = s.response_text.trim();
                      const lastBraceIndex = cleanText.lastIndexOf("}");
                      if (lastBraceIndex !== -1) {
                        cleanText = cleanText.substring(0, lastBraceIndex + 1);
                      }
                      const parsed = JSON.parse(cleanText);
                      return parsed.sources ? parsed.sources.length : 0;
                    } catch {
                      return 0;
                    }
                  })()
                : 0,
            }))
          : [],
      },
    },
  },
];
