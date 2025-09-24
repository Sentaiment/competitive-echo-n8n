// Dynamic Prompt 32 - Generates competitive analysis requests for scenarios
// Input: Individual scenarios from split out (after 010_scenarioSplitOut)
// Output: Dynamic prompt content for competitive analysis

console.log("=== DYNAMIC PROMPT 32 GENERATION ===");
console.log("Total input items:", $input.all().length);
console.log("Processing all scenarios in parallel");

// Process all input items (scenarios)
const results = [];

for (let i = 0; i < $input.all().length; i++) {
  const inputData = $input.all()[i].json || {};

  console.log(`=== PROCESSING SCENARIO ${i + 1} ===`);
  console.log("Input keys:", Object.keys(inputData));

  // Enhanced debugging for different data structures
  console.log("=== DATA STRUCTURE DEBUG ===");
  console.log("- Has scenarios array:", !!inputData.scenarios);
  console.log("- Scenarios array length:", inputData.scenarios?.length || 0);
  console.log("- Has scenario_id:", !!inputData.scenario_id);
  console.log("- Has scenario_title:", !!inputData.scenario_title);
  console.log("- Has user_query:", !!inputData.user_query);
  console.log("- Has dimension:", !!inputData.dimension);
  console.log("- Has whitelist:", !!inputData.whitelist);
  console.log("- Input data type:", typeof inputData);
  console.log("- Is array:", Array.isArray(inputData));

  // After split, we get individual scenario objects, not arrays
  // Check if this is a single scenario or if we still have the full structure
  let scenario, whitelist;

  if (inputData.scenarios && Array.isArray(inputData.scenarios)) {
    // Still getting full structure (shouldn't happen after split)
    console.log(
      "WARNING: Received full scenarios array, expected single scenario"
    );
    console.log(`Found ${inputData.scenarios.length} scenarios in array`);

    // Check if we have scenarios in the array
    if (inputData.scenarios.length > 0) {
      scenario = inputData.scenarios[0]; // Take first scenario
      console.log(
        `✅ Using first scenario: ${scenario.scenario_id} - ${scenario.scenario_title}`
      );
    } else {
      console.log("❌ Empty scenarios array");
      throw new Error("Empty scenarios array received");
    }
    whitelist = inputData.whitelist || [];
  } else if (inputData.scenario_id) {
    // This is a single scenario object
    scenario = inputData;
    whitelist = inputData.whitelist || [];
  } else if (inputData.scenario_title || inputData.user_query) {
    // Fallback: treat the entire input as a scenario if it has scenario-like fields
    console.log("FALLBACK: Treating input data as scenario object");
    scenario = {
      scenario_id: inputData.scenario_id || 1,
      scenario_title: inputData.scenario_title || "Unknown Scenario",
      user_query: inputData.user_query || "No query provided",
      dimension: inputData.dimension || "functional_competence",
      rationale: inputData.rationale || "No rationale provided",
      expected_metrics: inputData.expected_metrics || [],
      data_limitations: inputData.data_limitations || [],
      confidence_score: inputData.confidence_score || null,
    };
    whitelist = inputData.whitelist || [];
  } else if (Object.keys(inputData).length === 0) {
    // Handle empty input data
    console.log("ERROR: Empty input data received");
    throw new Error(
      "Empty input data received. Check if the previous node is working correctly."
    );
  } else if (
    inputData.scenarios &&
    Array.isArray(inputData.scenarios) &&
    inputData.scenarios.length > 0
  ) {
    // WORKAROUND: Handle the case where split node failed but we have scenarios
    console.log(
      "🔧 WORKAROUND: Split node failed, but we have scenarios array"
    );
    console.log(`Found ${inputData.scenarios.length} scenarios in array`);
    scenario = inputData.scenarios[0]; // Use first scenario
    whitelist = inputData.whitelist || [];
    console.log(
      `✅ Using first scenario as workaround: ${scenario.scenario_id} - ${scenario.scenario_title}`
    );
  } else {
    // Try to extract scenario from nested structures
    console.log("ATTEMPTING: Deep extraction of scenario data");

    // Look for scenario data in nested objects
    let foundScenario = null;

    // Check if there's a single scenario in the root
    if (
      inputData.scenario_id ||
      inputData.scenario_title ||
      inputData.user_query
    ) {
      foundScenario = inputData;
    }

    // Check common nested structures
    const possiblePaths = [
      "data.scenario",
      "data.scenarios[0]",
      "result.scenario",
      "result.scenarios[0]",
      "response.scenario",
      "response.scenarios[0]",
      "output.scenario",
      "output.scenarios[0]",
    ];

    for (const path of possiblePaths) {
      const keys = path.split(".");
      let current = inputData;

      try {
        for (const key of keys) {
          if (key.includes("[") && key.includes("]")) {
            const arrayKey = key.substring(0, key.indexOf("["));
            const index = parseInt(
              key.substring(key.indexOf("[") + 1, key.indexOf("]"))
            );
            current = current[arrayKey][index];
          } else {
            current = current[key];
          }
        }

        if (
          current &&
          (current.scenario_id || current.scenario_title || current.user_query)
        ) {
          foundScenario = current;
          console.log(`✅ Found scenario in path: ${path}`);
          break;
        }
      } catch (e) {
        // Path doesn't exist, continue
      }
    }

    if (foundScenario) {
      scenario = foundScenario;
      whitelist = inputData.whitelist || foundScenario.whitelist || [];
    } else {
      // Enhanced error message with more debugging info
      console.log("=== ERROR DEBUG INFO ===");
      console.log("Input data keys:", Object.keys(inputData));
      console.log("Input data values:", Object.values(inputData));
      console.log(
        "Input data stringified:",
        JSON.stringify(inputData, null, 2)
      );

      // This is the case where we have the full data structure but no individual scenario
      console.log("❌ CRITICAL ISSUE: Split node is not working correctly!");
      console.log("Expected: Individual scenario object");
      console.log("Received: Full data structure with scenarios array");
      console.log(
        "This suggests the 010_scenarioSplitOut node is not splitting the data properly."
      );

      throw new Error(
        `Split node issue: Expected individual scenario but received full data structure. Available keys: ${Object.keys(
          inputData
        ).join(
          ", "
        )}. The 010_scenarioSplitOut node should split the scenarios array into individual items.`
      );
    }
  }

  // Validate scenario has required fields
  if (!scenario.scenario_id) {
    scenario.scenario_id = i + 1;
    console.log(
      "⚠️ WARNING: No scenario_id found, using default:",
      scenario.scenario_id
    );
  }
  if (!scenario.scenario_title) {
    scenario.scenario_title = "Unknown Scenario";
    console.log("⚠️ WARNING: No scenario_title found, using default");
  }
  if (!scenario.user_query) {
    scenario.user_query = "No query provided";
    console.log("⚠️ WARNING: No user_query found, using default");
  }

  console.log(
    "Processing scenario:",
    scenario.scenario_id,
    "-",
    scenario.scenario_title
  );
  console.log("Whitelist received:", whitelist);
  console.log("Scenario user_query:", scenario.user_query);
  console.log("Scenario dimension:", scenario.dimension);

  // If no whitelist found, try to extract from scenario or use fallback
  if (whitelist.length === 0) {
    console.log("WARNING: No whitelist found in input data");
    console.log("Available input keys:", Object.keys(inputData));

    // Try to extract competitors from scenario user_query as fallback
    if (scenario.user_query) {
      // Look for patterns like "at Company1, Company2, Company3" or "for Company1, Company2, Company3"
      const companyListMatch = scenario.user_query.match(
        /(?:at|for|across|among|between)\s+([^.]+?)(?:\?|$)/
      );
      if (companyListMatch) {
        const companyList = companyListMatch[1];
        // Split by comma and clean up
        const companies = companyList
          .split(",")
          .map((name) => name.trim())
          .filter(
            (name) => name.length > 0 && !name.toLowerCase().includes("company")
          );

        if (companies.length > 0) {
          whitelist = companies;
          console.log("Extracted competitors from scenario:", whitelist);
        }
      }

      // Additional fallback: look for any capitalized words that might be company names
      if (whitelist.length === 0) {
        const words = scenario.user_query.split(/\s+/);
        const potentialCompanies = words
          .filter(
            (word) =>
              word.length > 2 &&
              /^[A-Z]/.test(word) &&
              ![
                "How",
                "What",
                "Which",
                "Where",
                "When",
                "Why",
                "The",
                "And",
                "Or",
                "But",
                "For",
                "At",
                "In",
                "On",
                "To",
                "Of",
                "With",
                "By",
              ].includes(word)
          )
          ; // Use all potential companies (no hard cap)

        if (potentialCompanies.length > 0) {
          whitelist = potentialCompanies;
          console.log(
            "Extracted potential competitors from scenario words:",
            whitelist
          );
        }
      }
    }

    if (whitelist.length === 0) {
      // Final fallback - this should rarely happen if data flow is working correctly
      console.log(
        "ERROR: No whitelist found and extraction failed. This indicates a data flow issue."
      );
      throw new Error(
        "No competitor whitelist found. Check that the previous nodes are providing proper competitor data. Expected whitelist in input data or extractable from scenario user_query."
      );
    }
  }

  // Generate dynamic prompt for this single scenario
  // Include the target company in the competitor analysis
  const targetCompany = inputData.company || whitelist[0] || null;
  const allCompetitors = [...whitelist];

  // Validate that we have real company names, not generic placeholders
  const hasGenericNames = allCompetitors.some(
    (name) =>
      /^company\s+[a-d]$/i.test(name) ||
      /^primary\s+company$/i.test(name) ||
      /^target\s+company$/i.test(name)
  );

  if (hasGenericNames) {
    console.log(
      "ERROR: Found generic company names in whitelist:",
      allCompetitors
    );
    throw new Error(
      "Generic company names detected in whitelist. This indicates the previous nodes are not providing proper competitor data. Check data flow from CSV parsing through scenario generation."
    );
  }

  if (targetCompany && !allCompetitors.includes(targetCompany)) {
    allCompetitors.unshift(targetCompany); // Add target company at the beginning
  }

  const competitorList = allCompetitors.join(", ");
  const competitorCount = allCompetitors.length;

  const systemContent = `You are a competitive intelligence analyst. You must provide structured competitor analysis with specific rankings and scores. Always include a competitors_ranked array with company names and numerical scores. Include comprehensive research from traditional business sources, industry reports, and social media platforms.`;

  const userContent = `COMPETITIVE SCENARIO ANALYSIS

Scenario: ${scenario.scenario_title}
Query: ${scenario.user_query}

REQUIREMENTS:
1. Analyze ALL ${competitorCount} specified competitors for this scenario
2. Rank them with numerical scores (1-10 scale)
3. Provide specific analysis for each competitor
4. Include citations and sources from COMPREHENSIVE SOURCE TYPES:
   - Traditional business sources: Forbes, industry reports, company websites, business publications, trade journals, analyst reports
   - Social media sources: Reddit discussions, YouTube reviews, Twitter/X posts, Instagram content, TikTok videos, Facebook groups, Quora answers, Medium articles
   - Community feedback: User experiences, reviews, social sentiment, forums
5. Structure your response as JSON with these fields:
   - title: "Clear, descriptive title for this analysis"
   - description: "Brief summary of what this analysis covers"
   - competitors_ranked: [{"company": "Name", "score": 8.5, "rationale": "Why this score"}]
   - analysis_details: {
       "Company Name": {
         "summary": "Brief overview",
         "highlights": ["Key point 1", "Key point 2"],
         "metrics": {"strength": 8, "weakness": 3}
       }
     }
   - key_findings: ["Finding 1", "Finding 2"]
   - sources: ["Source 1", "Source 2"]

CRITICAL COMPETITOR FOCUS:
You MUST focus ONLY on these specific companies: ${competitorList}.

MANDATORY: You must analyze ALL ${competitorCount} companies listed above, not just a subset.
IMPORTANT: The first company in the list (${allCompetitors[0]}) is the TARGET COMPANY being analyzed. You must include it in your rankings alongside the other companies.
Do NOT include any other companies in your analysis. If you find other companies mentioned in social media sources, use them only as context for analyzing the specified companies.

AVOID DIRECT COMPARISONS: Do not structure your analysis as direct "Company A vs Company B" comparisons. Instead, provide comprehensive market analysis that evaluates all companies holistically within the broader competitive landscape.

SOURCE REQUIREMENTS:
- Include BOTH traditional business sources AND social media sources
- For social media sources, provide EXACT links to specific posts, not just general site links
- Include traditional sources: Forbes, industry reports, company websites, business publications, trade journals, analyst reports
- Include social media sources with specific post URLs: Reddit thread links, YouTube video links, Twitter post links, Instagram post links, TikTok video links, Facebook post links, Quora answer links, Medium article links
- MANDATORY: Include at least 3-5 traditional business sources
- MANDATORY: Include at least 2-3 social media sources with exact post URLs
- Use the most relevant sources for this specific scenario, not just generic ones
- Research the most appropriate platforms and communities for this specific industry and scenario

Focus on ${competitorList} as the main competitors for this specific scenario.`;

  const dynamicPrompt = {
    scenario_id: scenario.scenario_id,
    scenario_title: scenario.scenario_title,
    user_query: scenario.user_query,
    dimension: scenario.dimension,
    whitelist: whitelist,
    competitor_count: competitorCount,
    system_content: systemContent,
    user_content: userContent,
    // Include original scenario data for reference
    original_scenario: scenario,
  };

  console.log("=== GENERATED DYNAMIC PROMPT ===");
  console.log(
    `Scenario ${dynamicPrompt.scenario_id}: ${dynamicPrompt.scenario_title}`
  );
  console.log(`Competitors to analyze: ${dynamicPrompt.competitor_count}`);
  console.log(`Whitelist: ${dynamicPrompt.whitelist.join(", ")}`);

  // Add to results array
  results.push(dynamicPrompt);
}

console.log("=== ALL SCENARIOS PROCESSED ===");
console.log(`Total scenarios processed: ${results.length}`);
console.log(
  "Results:",
  results.map((r) => `${r.scenario_id}: ${r.scenario_title}`)
);

return results.map((result) => ({ json: result }));
