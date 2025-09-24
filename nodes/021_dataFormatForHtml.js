/**
 * n8n Code node (JavaScript)
 * Enhanced Data Formatter for HTML Report
 * - Processes all input data from workflow nodes
 * - Merges scenarios, citations, and sources
 * - Calculates all metrics and prepares data for HTML generation
 * - Ensures consistent data format for HTML report
 */

console.log("=== ENHANCED DATA FORMATTER ===");

// Disable all logging for production/non-debug runs
console.log = () => {};

// Try to get company name from workflow context first
let targetCompany = "Unknown Company";
try {
  if (
    typeof $workflow !== "undefined" &&
    $workflow.context &&
    $workflow.context.target_company
  ) {
    targetCompany = $workflow.context.target_company;
    console.log("✅ Found company from workflow context:", targetCompany);
  }
} catch (e) {
  console.log("⚠️ Could not access workflow context:", e.message);
}

// Get all input items
const items = $input.all();
console.log("Total input items:", items.length);

// DEBUG: Show what we're actually receiving from Merge node
console.log("\n=== DEBUGGING MERGE NODE INPUT ===");
items.forEach((item, index) => {
  const data = item.json || {};
  console.log(`\nInput ${index}:`);
  console.log("- Keys:", Object.keys(data));
  console.log("- Has scenario_rankings:", !!data.scenario_rankings);
  console.log("- Has scenarios:", !!data.scenarios);
  console.log("- Has data_sources:", !!data.data_sources);
  console.log("- Has source_citations:", !!data.source_citations);
  console.log("- Has company:", !!data.company);
  console.log("- Has report_metadata:", !!data.report_metadata);
  if (data.scenario_rankings)
    console.log("- scenario_rankings length:", data.scenario_rankings.length);
  if (data.scenarios) console.log("- scenarios length:", data.scenarios.length);
  if (data.data_sources)
    console.log("- data_sources length:", data.data_sources.length);
  if (data.source_citations)
    console.log("- source_citations length:", data.source_citations.length);
  console.log(
    "- Sample data:",
    JSON.stringify(data, null, 2).substring(0, 300) + "..."
  );
});

// Check if we have input items
if (items.length === 0) {
  console.log(
    "❌ NO INPUT ITEMS RECEIVED - MERGE NODE NOT CONNECTED OR NOT EXECUTING"
  );
  return [{ json: { error: "No input data received from Merge node" } }];
}

// Process the real data from 020_collectAllData
console.log("✅ PROCESSING REAL DATA FROM 020_collectAllData");

// SIMPLIFIED PROCESSING - Handle the exact data structure from 020_collectAllData
console.log("=== SIMPLIFIED DATA PROCESSING ===");

// Initialize with company name from workflow context
let finalData = {
  report_metadata: {
    company: targetCompany,
    total_scenarios: 0,
    competitors_analyzed: [],
    top_publishers: [],
    evidence_summary: {
      total_citations: 0,
      verified_citations: 0,
      high_authority_citations: 0,
      unique_domains: 0,
    },
  },
  scenarios: [],
  enhanced_citations: [],
  data_sources_table: [],
  overall_metrics: {},
  company_performance: {},
  quality_metrics: {},
};

// =========================
// CANONICAL COMPETITOR NAMES (from whitelist)
// =========================
// Collect whitelist(s) emitted earlier in the flow (e.g., 003_parseGroupData)
let canonicalWhitelist = [];
items.forEach((item) => {
  const data = item.json || {};
  if (Array.isArray(data.whitelist) && data.whitelist.length > 0) {
    canonicalWhitelist = canonicalWhitelist.concat(data.whitelist);
  }
});
// Fallback: if no explicit whitelist, try competitors_analyzed or infer from scenarios later
canonicalWhitelist = Array.from(
  new Set((canonicalWhitelist || []).filter(Boolean))
);

function _normCompanyBaseName(name) {
  const s = (name == null ? "" : String(name))
    .normalize("NFKC")
    .toLowerCase()
    .trim()
    .replace(/^the\s+/, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return s;
}

function _buildCanonicalizer(whitelist) {
  const wl = Array.from(new Set((whitelist || []).filter(Boolean)));
  const exactMap = new Map();
  const baseMap = new Map();
  wl.forEach((w) => {
    const wStr = String(w).trim();
    const key = wStr.toLowerCase();
    exactMap.set(key, wStr);
    const base = _normCompanyBaseName(wStr);
    if (base && !baseMap.has(base)) baseMap.set(base, wStr);
  });

  return function canonicalize(inputName) {
    const raw = (inputName == null ? "" : String(inputName)).trim();
    if (!raw) return raw;
    const lower = raw.toLowerCase();
    if (exactMap.has(lower)) return exactMap.get(lower);
    const base = _normCompanyBaseName(raw);
    if (baseMap.has(base)) return baseMap.get(base);
    // Last resort: try contains-based match on base tokens
    let best = raw;
    let found = false;
    for (const [b, val] of baseMap.entries()) {
      if (base === b || base.includes(b) || b.includes(base)) {
        best = val;
        found = true;
        break;
      }
    }
    return found ? best : raw;
  };
}

let canonicalizeCompany = _buildCanonicalizer(canonicalWhitelist);

// Process each input item directly
items.forEach((item, index) => {
  const data = item.json || {};
  console.log(`\n--- Processing Item ${index} ---`);
  console.log("Keys:", Object.keys(data));
  console.log(
    "Full data structure:",
    JSON.stringify(data, null, 2).substring(0, 500) + "..."
  );

  // EMERGENCY FIX: Check if this is the main scenario object from Merge node
  if (
    data.scenario_rankings &&
    Array.isArray(data.scenario_rankings) &&
    data.scenario_rankings.length > 0
  ) {
    console.log(
      `🚨 EMERGENCY: Found main scenario object with ${data.scenario_rankings.length} scenario_rankings`
    );
    finalData.scenarios = finalData.scenarios.concat(data.scenario_rankings);
    console.log(
      `✅ Added ${data.scenario_rankings.length} scenarios from scenario_rankings`
    );
  }

  if (
    data.scenarios &&
    Array.isArray(data.scenarios) &&
    data.scenarios.length > 0
  ) {
    console.log(
      `🚨 EMERGENCY: Found main scenario object with ${data.scenarios.length} scenarios`
    );
    finalData.scenarios = finalData.scenarios.concat(data.scenarios);
    console.log(`✅ Added ${data.scenarios.length} scenarios from scenarios`);
  }

  // CRITICAL FIX: Handle the exact data structure from your example
  if (data.scenario_rankings && Array.isArray(data.scenario_rankings)) {
    console.log(
      `🔧 CRITICAL: Processing ${data.scenario_rankings.length} scenario_rankings`
    );
    data.scenario_rankings.forEach((scenario, idx) => {
      console.log(
        `  Scenario ${idx + 1}: ${
          scenario.scenario_title || scenario.title || "No title"
        }`
      );
      console.log(
        `  - Has competitors_ranked: ${!!scenario.competitors_ranked}`
      );
      console.log(`  - Has analysis_details: ${!!scenario.analysis_details}`);
      console.log(`  - Has key_findings: ${!!scenario.key_findings}`);

      // Convert scenario_ranking to the expected format
      const convertedScenario = {
        scenario_id: scenario.scenario_id || 0,
        title:
          scenario.scenario_title ||
          scenario.title ||
          `Scenario ${scenario.scenario_id || 0}`,
        description:
          scenario.scenario_description || scenario.description || "",
        top_competitors: (scenario.competitors_ranked || []).map(
          (comp, compIdx) => ({
            company: canonicalizeCompany(comp.company || comp.name || comp),
            score: comp.score || comp.rating || comp.value || null,
            rationale:
              comp.rationale ||
              comp.reasoning ||
              comp.explanation ||
              comp.notes ||
              "",
            rank: comp.rank || comp.position || compIdx + 1,
            detailed_metrics: comp.detailed_metrics || {},
            ...comp,
          })
        ),
        key_findings: scenario.key_findings || [],
        sources: scenario.sources || [],
        analysis_details: scenario.analysis_details || {},
        dimension: scenario.dimension || "",
        user_query: scenario.user_query || "",
        data_quality_score: scenario.data_quality_score || 0,
        processing_status: scenario.processing_status || "success",
      };

      finalData.scenarios.push(convertedScenario);
      console.log(
        `✅ Converted scenario ${scenario.scenario_id}: "${convertedScenario.title}"`
      );
    });
  }

  // Direct processing of scenario_rankings
  if (data.scenario_rankings && Array.isArray(data.scenario_rankings)) {
    console.log(`✅ Found ${data.scenario_rankings.length} scenario_rankings`);
    finalData.scenarios = finalData.scenarios.concat(data.scenario_rankings);
  }

  // Direct processing of scenarios
  if (data.scenarios && Array.isArray(data.scenarios)) {
    console.log(`✅ Found ${data.scenarios.length} scenarios`);
    finalData.scenarios = finalData.scenarios.concat(data.scenarios);
  }

  // EMERGENCY FIX: Check if this entire data object IS a scenario
  if (data.scenario_id && data.scenario_title) {
    console.log(`✅ Found individual scenario: ${data.scenario_title}`);
    finalData.scenarios.push(data);
  }

  // Process citation objects (they're individual items in the array)
  if (data.claim_text || data.source_url || data.authority_score) {
    console.log(
      `✅ Found citation object with claim: ${data.claim_text?.substring(
        0,
        50
      )}...`
    );
    finalData.enhanced_citations.push(data);
  }

  // EMERGENCY FIX: Check for any array that might contain scenario data
  Object.keys(data).forEach((key) => {
    if (Array.isArray(data[key]) && data[key].length > 0) {
      console.log(`🔍 Found array '${key}' with ${data[key].length} items`);
      // Check if this looks like scenario data
      const firstItem = data[key][0];
      if (
        firstItem &&
        (firstItem.scenario_id || firstItem.scenario_title || firstItem.title)
      ) {
        console.log(`✅ '${key}' appears to contain scenario data`);
        finalData.scenarios = finalData.scenarios.concat(data[key]);
      }
    }
  });

  // EMERGENCY FIX: Check if this is the main scenario object from Merge node
  if (data.scenario_rankings && data.scenarios && data.company) {
    console.log(`🚨 EMERGENCY: Found main scenario object from Merge node`);
    console.log(`  - scenario_rankings: ${data.scenario_rankings.length}`);
    console.log(`  - scenarios: ${data.scenarios.length}`);
    console.log(`  - company: ${data.company}`);

    // Process scenario_rankings
    if (data.scenario_rankings.length > 0) {
      finalData.scenarios = finalData.scenarios.concat(data.scenario_rankings);
      console.log(
        `✅ Added ${data.scenario_rankings.length} scenarios from scenario_rankings`
      );
    }

    // Process scenarios
    if (data.scenarios.length > 0) {
      finalData.scenarios = finalData.scenarios.concat(data.scenarios);
      console.log(`✅ Added ${data.scenarios.length} scenarios from scenarios`);
    }
  }

  // Direct processing of enhanced_citations
  if (data.enhanced_citations && Array.isArray(data.enhanced_citations)) {
    console.log(
      `✅ Found ${data.enhanced_citations.length} enhanced_citations`
    );
    finalData.enhanced_citations = finalData.enhanced_citations.concat(
      data.enhanced_citations
    );
  }

  // Direct processing of source_citations
  if (data.source_citations && Array.isArray(data.source_citations)) {
    console.log(`✅ Found ${data.source_citations.length} source_citations`);
    finalData.enhanced_citations = finalData.enhanced_citations.concat(
      data.source_citations
    );
  }

  // Direct processing of data_sources (from Merge node)
  if (data.data_sources && Array.isArray(data.data_sources)) {
    console.log(`✅ Found ${data.data_sources.length} data_sources`);
    finalData.enhanced_citations = finalData.enhanced_citations.concat(
      data.data_sources
    );
  }

  // Update company name from input
  if (
    data.report_metadata &&
    data.report_metadata.company &&
    data.report_metadata.company !== "Unknown Company"
  ) {
    finalData.report_metadata.company = data.report_metadata.company;
    console.log(`✅ Updated company to: ${data.report_metadata.company}`);
  }

  // Fix company name if it's "Report" (from Merge node) with a neutral placeholder
  if (data.company && data.company === "Report") {
    finalData.report_metadata.company = "Unknown Company";
    console.log(`✅ Fixed company from 'Report' to 'Unknown Company'`);
  }

  // Update total scenarios
  if (data.report_metadata && data.report_metadata.total_scenarios) {
    finalData.report_metadata.total_scenarios =
      data.report_metadata.total_scenarios;
  }

  // Update competitors analyzed
  if (data.report_metadata && data.report_metadata.competitors_analyzed) {
    finalData.report_metadata.competitors_analyzed =
      data.report_metadata.competitors_analyzed;
  }

  // EMERGENCY FIX: If we still have no scenarios, try to process the entire data object as a scenario
  if (finalData.scenarios.length === 0 && data.scenario_id) {
    console.log("🚨 EMERGENCY: Processing entire data object as scenario");
    finalData.scenarios.push(data);
  }

  // EMERGENCY FIX: Check if this item has any scenario-like data
  if (finalData.scenarios.length === 0) {
    const hasScenarioData =
      data.scenario_rankings ||
      data.scenarios ||
      data.scenario_id ||
      data.scenario_title;
    if (hasScenarioData) {
      console.log("🚨 EMERGENCY: Found scenario data in item, processing...");
      console.log("  - scenario_rankings:", !!data.scenario_rankings);
      console.log("  - scenarios:", !!data.scenarios);
      console.log("  - scenario_id:", !!data.scenario_id);
      console.log("  - scenario_title:", !!data.scenario_title);

      // Try to extract scenarios from any available source
      if (data.scenario_rankings && Array.isArray(data.scenario_rankings)) {
        finalData.scenarios = finalData.scenarios.concat(
          data.scenario_rankings
        );
        console.log(
          `✅ Added ${data.scenario_rankings.length} scenarios from scenario_rankings`
        );
      }
      if (data.scenarios && Array.isArray(data.scenarios)) {
        finalData.scenarios = finalData.scenarios.concat(data.scenarios);
        console.log(
          `✅ Added ${data.scenarios.length} scenarios from scenarios`
        );
      }
      if (
        data.scenario_id &&
        data.scenario_title &&
        !data.scenario_rankings &&
        !data.scenarios
      ) {
        finalData.scenarios.push(data);
        console.log(`✅ Added individual scenario: ${data.scenario_title}`);
      }
    }
  }
});

// FINAL EMERGENCY CHECK: If we still have no scenarios, try one more time
if (finalData.scenarios.length === 0) {
  console.log(
    "\n🚨 FINAL EMERGENCY CHECK: No scenarios found, trying one more time..."
  );
  items.forEach((item, index) => {
    const data = item.json || {};
    console.log(`Final check - Item ${index}:`, Object.keys(data));

    // Check for any scenario data
    if (data.scenario_rankings && Array.isArray(data.scenario_rankings)) {
      console.log(
        `🚨 FINAL: Found ${data.scenario_rankings.length} scenario_rankings`
      );
      finalData.scenarios = finalData.scenarios.concat(data.scenario_rankings);
    }
    if (data.scenarios && Array.isArray(data.scenarios)) {
      console.log(`🚨 FINAL: Found ${data.scenarios.length} scenarios`);
      finalData.scenarios = finalData.scenarios.concat(data.scenarios);
    }
    if (data.scenario_id && data.scenario_title) {
      console.log(
        `🚨 FINAL: Found individual scenario: ${data.scenario_title}`
      );
      finalData.scenarios.push(data);
    }
  });
}

// ULTIMATE EMERGENCY: If we still have no scenarios, create a placeholder from the citations
if (finalData.scenarios.length === 0) {
  // Do not create placeholder scenarios; leave empty to ensure fully dynamic output
}

// Remove hardcoded company rename logic to keep behavior fully data-driven

// Calculate final metrics
finalData.report_metadata.total_scenarios = finalData.scenarios.length;
finalData.quality_metrics = {
  total_citations: finalData.enhanced_citations.length,
  high_authority_citations: finalData.enhanced_citations.filter(
    (c) => (c.authority_score || 0) >= 8
  ).length,
  verified_citations: finalData.enhanced_citations.filter(
    (c) => c.verification_status === "verified"
  ).length,
  real_time_sources: finalData.enhanced_citations.filter(
    (c) => c.source_origin === "real_time_search"
  ).length,
  citation_authority_avg:
    finalData.enhanced_citations.length > 0
      ? (
          finalData.enhanced_citations.reduce(
            (sum, c) => sum + (c.authority_score || 0),
            0
          ) / finalData.enhanced_citations.length
        ).toFixed(2)
      : 0,
  verification_rate:
    finalData.enhanced_citations.length > 0
      ? (
          (finalData.enhanced_citations.filter(
            (c) => c.verification_status === "verified"
          ).length /
            finalData.enhanced_citations.length) *
          100
        ).toFixed(1)
      : 0,
  company_performance: {},
};

console.log("\n=== FINAL PROCESSED DATA ===");
console.log("Company:", finalData.report_metadata.company);
console.log("Scenarios:", finalData.scenarios.length);
console.log("Enhanced citations:", finalData.enhanced_citations.length);
console.log("Total scenarios:", finalData.report_metadata.total_scenarios);

// DEBUG: Show what we actually found
if (finalData.scenarios.length === 0) {
  console.log("\n❌ NO SCENARIOS FOUND - DEBUGGING INPUT STRUCTURE:");
  items.forEach((item, index) => {
    const data = item.json || {};
    console.log(`\nInput ${index} structure:`);
    console.log("- Keys:", Object.keys(data));
    console.log("- Has scenario_rankings:", !!data.scenario_rankings);
    console.log("- Has scenarios:", !!data.scenarios);
    console.log("- Has scenario_id:", !!data.scenario_id);
    console.log("- Has scenario_title:", !!data.scenario_title);
    console.log("- Has company:", !!data.company);
    if (data.scenario_rankings)
      console.log("- scenario_rankings length:", data.scenario_rankings.length);
    if (data.scenarios)
      console.log("- scenarios length:", data.scenarios.length);
    if (data.scenario_id) console.log("- scenario_id:", data.scenario_id);
    if (data.scenario_title)
      console.log("- scenario_title:", data.scenario_title);

    // Show sample of the data structure
    console.log(
      "- Sample data:",
      JSON.stringify(data, null, 2).substring(0, 300) + "..."
    );
  });
}

// Use the already initialized finalData instead of creating formattedData
let formattedData = finalData;

console.log("=== STARTING DATA ACCUMULATION ===");
console.log("Initial formattedData structure:", Object.keys(formattedData));

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

  // EMERGENCY FIX: If we have the exact data structure from 020_collectAllData, process it directly
  if (data.scenario_rankings && data.scenario_rankings.length > 0) {
    console.log(
      "🚨 EMERGENCY FIX: Found scenario_rankings, processing directly"
    );
    formattedData.scenarios = formattedData.scenarios.concat(
      data.scenario_rankings
    );
    console.log(
      `Added ${data.scenario_rankings.length} scenarios from scenario_rankings`
    );
  }

  if (data.enhanced_citations && data.enhanced_citations.length > 0) {
    console.log(
      "🚨 EMERGENCY FIX: Found enhanced_citations, processing directly"
    );
    formattedData.enhanced_citations = formattedData.enhanced_citations.concat(
      data.enhanced_citations
    );
    console.log(
      `Added ${data.enhanced_citations.length} citations from enhanced_citations`
    );
  }

  if (data.scenarios && data.scenarios.length > 0) {
    console.log("🚨 EMERGENCY FIX: Found scenarios, processing directly");
    formattedData.scenarios = formattedData.scenarios.concat(data.scenarios);
    console.log(`Added ${data.scenarios.length} scenarios from scenarios`);
  }

  // EMERGENCY FIX: Set company name from any available source
  if (
    data.report_metadata &&
    data.report_metadata.company &&
    data.report_metadata.company !== "Unknown Company"
  ) {
    formattedData.report_metadata.company = data.report_metadata.company;
    console.log(
      `🚨 EMERGENCY FIX: Set company to ${data.report_metadata.company}`
    );
  }

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
  if (
    data.scenario_rankings &&
    Array.isArray(data.scenario_rankings) &&
    data.scenario_rankings.length > 0
  ) {
    console.log("✅ Found scenario_rankings:", data.scenario_rankings.length);
    const sample = JSON.stringify(data.scenario_rankings[0], null, 2);
    console.log(
      "First scenario_ranking sample:",
      sample ? sample.substring(0, 300) : "No data"
    );

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
      console.log(
        `Processing scenario_ranking ${ranking.scenario_id}:`,
        ranking.scenario_title
      );
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
              const companyName = canonicalizeCompany(
                comp.company || comp.name || comp
              );

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
                company: canonicalizeCompany(companyName),
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

    console.log(
      `Adding ${convertedScenarios.length} converted scenarios to formattedData`
    );
    formattedData.scenarios =
      formattedData.scenarios.concat(convertedScenarios);
    console.log(`Total scenarios now: ${formattedData.scenarios.length}`);
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
            company: canonicalizeCompany(comp.company || comp.name || comp),
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
                    company: canonicalizeCompany(
                      comp.company || comp.name || comp
                    ),
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
                    const companyName = canonicalizeCompany(
                      comp.company || comp.name || comp
                    );

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
          company: canonicalizeCompany(comp.company || comp.name || comp),
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
              company: canonicalizeCompany(comp.company || comp.name || comp),
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
                  company: canonicalizeCompany(companyName),
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
  if (
    data.enhanced_citations &&
    Array.isArray(data.enhanced_citations) &&
    data.enhanced_citations.length > 0
  ) {
    console.log("✅ Found enhanced_citations:", data.enhanced_citations.length);
    const sample = JSON.stringify(data.enhanced_citations[0], null, 2);
    console.log(
      "First enhanced_citation sample:",
      sample ? sample.substring(0, 200) : "No data"
    );
    console.log(
      `Adding ${data.enhanced_citations.length} enhanced citations to formattedData`
    );
    formattedData.enhanced_citations = formattedData.enhanced_citations.concat(
      data.enhanced_citations
    );
    console.log(
      `Total enhanced citations now: ${formattedData.enhanced_citations.length}`
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

// Ingest nested merge outputs: some items come as { data: [ {...}, {...} ] }
items.forEach((item, idx) => {
  const root = item.json || {};
  if (Array.isArray(root.data) && root.data.length > 0) {
    console.log(
      `🔄 Ingesting nested data array from item ${idx}:`,
      root.data.length
    );
    root.data.forEach((d, j) => {
      // Scenarios
      if (
        Array.isArray(d.scenario_rankings) &&
        d.scenario_rankings.length > 0
      ) {
        formattedData.scenarios = formattedData.scenarios.concat(
          d.scenario_rankings
        );
      }
      if (Array.isArray(d.scenarios) && d.scenarios.length > 0) {
        formattedData.scenarios = formattedData.scenarios.concat(d.scenarios);
      }

      // Citations and sources
      if (
        Array.isArray(d.enhanced_citations) &&
        d.enhanced_citations.length > 0
      ) {
        formattedData.enhanced_citations =
          formattedData.enhanced_citations.concat(d.enhanced_citations);
      }
      if (Array.isArray(d.source_citations) && d.source_citations.length > 0) {
        formattedData.enhanced_citations =
          formattedData.enhanced_citations.concat(d.source_citations);
      }
      if (
        Array.isArray(d.data_sources_table) &&
        d.data_sources_table.length > 0
      ) {
        formattedData.data_sources_table =
          formattedData.data_sources_table.concat(d.data_sources_table);
      }
      if (Array.isArray(d.data_sources) && d.data_sources.length > 0) {
        formattedData.data_sources_table =
          formattedData.data_sources_table.concat(d.data_sources);
      }

      // Metadata
      if (
        d.report_metadata &&
        d.report_metadata.company &&
        d.report_metadata.company !== "Unknown Company"
      ) {
        formattedData.report_metadata.company = d.report_metadata.company;
      }
    });
  }
});

// Normalize enhanced_citations (coerce strings → objects, fix empty URLs, infer domain)
function _toStr(v) {
  return (v == null ? "" : String(v)).trim();
}
function _isHttpUrl(s) {
  const v = _toStr(s);
  return /^https?:\/\//i.test(v);
}
function _domainOf(u) {
  const s = _toStr(u);
  if (!s) return "";
  try {
    return new URL(s).hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return s
      .replace(/^https?:\/\//i, "")
      .replace(/^www\./i, "")
      .split("/")[0]
      .toLowerCase();
  }
}
function _extractDomainFromText(text) {
  const s = _toStr(text);
  if (!s) return "";
  const match = s.match(/\b([a-z0-9-]+\.)+[a-z]{2,}\b/i);
  return match ? match[0].replace(/^www\./i, "").toLowerCase() : "";
}

formattedData.enhanced_citations = (formattedData.enhanced_citations || [])
  .map((c) => {
    if (typeof c === "string") {
      const text = _toStr(c);
      if (!text) return null;
      let dom = _extractDomainFromText(text);
      return {
        claim_text: text,
        claim_category: "competitive_analysis",
        source_url: null,
        source_domain: dom || null,
        authority_score: 0,
        verification_status: "",
        author: "",
        publication_date: "",
      };
    }
    const obj = { ...(c || {}) };
    const urlStr = _toStr(obj.source_url || obj.url || obj.source_domain);
    if (urlStr) {
      if (_isHttpUrl(urlStr)) {
        obj.source_url = urlStr;
      } else {
        // If we have a bare domain or text containing a domain, coerce to https URL
        const dom = _extractDomainFromText(urlStr) || _domainOf(urlStr);
        obj.source_url = dom ? `https://${dom}` : null;
      }
    } else {
      obj.source_url = null;
    }
    if (!obj.source_domain && obj.source_url) {
      obj.source_domain = _domainOf(obj.source_url);
    }
    return obj;
  })
  .filter(Boolean);

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
    if (data.scenario_rankings && data.scenario_rankings.length > 0) {
      const sample = JSON.stringify(data.scenario_rankings[0], null, 2);
      console.log(
        "scenario_rankings sample:",
        sample ? sample.substring(0, 200) + "..." : "No data"
      );
    }
    if (data.scenarios && data.scenarios.length > 0) {
      const sample = JSON.stringify(data.scenarios[0], null, 2);
      console.log(
        "scenarios sample:",
        sample ? sample.substring(0, 200) + "..." : "No data"
      );
    }
    if (data.results && data.results.length > 0) {
      const sample = JSON.stringify(data.results[0], null, 2);
      console.log(
        "results sample:",
        sample ? sample.substring(0, 200) + "..." : "No data"
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
// PER-SCENARIO DEDUPLICATION (after canonicalization)
// =========================
uniqueScenarios.forEach((scenario) => {
  const list = Array.isArray(scenario.top_competitors)
    ? scenario.top_competitors
    : [];
  const byCompany = new Map();
  list.forEach((row) => {
    const name = canonicalizeCompany(row.company || row.name || row);
    if (!name) return;
    const existing = byCompany.get(name);
    if (!existing) {
      byCompany.set(name, {
        company: name,
        score: row.score != null ? Number(row.score) : null,
        rank: row.rank != null ? Number(row.rank) : null,
        rationale: row.rationale || "",
        detailed_metrics: { ...(row.detailed_metrics || {}) },
        _ranks: row.rank != null ? [Number(row.rank)] : [],
        _scores: row.score != null ? [Number(row.score)] : [],
      });
    } else {
      if (row.rank != null) existing._ranks.push(Number(row.rank));
      if (row.score != null) existing._scores.push(Number(row.score));
      // Prefer the best (lowest) rank seen
      const bestRank = existing._ranks.length
        ? Math.min(...existing._ranks)
        : null;
      existing.rank = bestRank;
      // Use max score if available
      const bestScore = existing._scores.length
        ? Math.max(...existing._scores)
        : existing.score;
      existing.score = bestScore;
      // Merge rationale (dedupe by '; ')
      const parts = [existing.rationale, row.rationale]
        .filter(Boolean)
        .map((s) => String(s).trim());
      existing.rationale = Array.from(new Set(parts.join(" | ").split(" | ")))
        .filter(Boolean)
        .join(" | ");
      // Merge metrics (prefer numeric values, keep first otherwise)
      const dm = existing.detailed_metrics || {};
      Object.entries(row.detailed_metrics || {}).forEach(([k, v]) => {
        if (!(k in dm)) dm[k] = v;
        else {
          const a = Number(dm[k]);
          const b = Number(v);
          if (!Number.isNaN(b) && (Number.isNaN(a) || b > a)) dm[k] = v;
        }
      });
      existing.detailed_metrics = dm;
    }
  });
  // Rebuild list and re-rank by score desc then name
  const merged = Array.from(byCompany.values()).sort((a, b) => {
    const as = a.score == null ? -Infinity : Number(a.score);
    const bs = b.score == null ? -Infinity : Number(b.score);
    if (bs !== as) return bs - as;
    return a.company.localeCompare(b.company);
  });
  merged.forEach((r, i) => {
    r.rank = i + 1;
  });
  scenario.top_competitors = merged;
});

// =========================
// ADD EVIDENCE QUALITY & CONFIDENCE INDICATORS
// =========================
uniqueScenarios.forEach((scenario) => {
  // Calculate evidence quality metrics
  const sources = scenario.sources || [];
  const evidence_quality = {
    total_citations: sources.length,
    verified_sources: sources.filter(
      (s) => s.verification_status === "verified"
    ).length,
    high_authority_sources: sources.filter((s) => (s.authority_score || 0) >= 7)
      .length,
    domains_represented: [
      ...new Set(sources.map((s) => s.source_domain).filter(Boolean)),
    ].length,
  };

  // Add confidence level based on evidence quality
  let confidence_level = "pending";
  if (
    evidence_quality.verified_sources >= 2 ||
    evidence_quality.high_authority_sources >= 2
  ) {
    confidence_level = "high";
  } else if (
    evidence_quality.total_citations >= 1 ||
    evidence_quality.domains_represented >= 1
  ) {
    confidence_level = "medium";
  }

  // Add to scenario
  scenario.evidence_quality = evidence_quality;
  scenario.confidence_level = confidence_level;
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
  const firstCompany =
    formattedData.report_metadata.competitors_analyzed.find((comp) =>
      typeof comp === "string" ? comp.trim().length > 0 : false
    ) || null;

  if (firstCompany) {
    formattedData.report_metadata.company = firstCompany;
    console.log("✅ Found company in competitors_analyzed:", firstCompany);
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

// Method 3: If still unknown, fall back to first scenario's top competitor
if (formattedData.report_metadata.company === "Unknown Company") {
  const topFromScenario = uniqueScenarios.find(
    (scenario) =>
      Array.isArray(scenario.top_competitors) &&
      scenario.top_competitors.length > 0
  );
  if (topFromScenario) {
    const inferred =
      (
        topFromScenario.top_competitors.find((c) => c.rank === 1) ||
        topFromScenario.top_competitors[0] ||
        {}
      ).company || null;
    if (inferred) {
      formattedData.report_metadata.company = inferred;
      console.log("✅ Inferred company from scenario data:", inferred);
    }
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
  const reportCompanyName = (
    formattedData.report_metadata.company || ""
  ).toLowerCase();
  const scenariosWithCompany = formattedData.scenarios.filter((s) =>
    s.top_competitors.some(
      (comp) =>
        comp.company && comp.company.toLowerCase().includes(reportCompanyName)
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

// CRITICAL DEBUG: Show what we actually have in formattedData
console.log("\n=== CRITICAL DEBUG: FINAL FORMATTED DATA ===");
console.log("formattedData.scenarios.length:", formattedData.scenarios.length);
console.log(
  "formattedData.enhanced_citations.length:",
  formattedData.enhanced_citations.length
);
console.log(
  "formattedData.data_sources_table.length:",
  formattedData.data_sources_table.length
);

if (formattedData.scenarios.length > 0) {
  console.log("✅ SCENARIOS FOUND:");
  formattedData.scenarios.forEach((scenario, index) => {
    console.log(
      `  Scenario ${index + 1}: ${scenario.title || scenario.scenario_title}`
    );
    console.log(`    - Competitors: ${scenario.top_competitors?.length || 0}`);
    console.log(`    - Key findings: ${scenario.key_findings?.length || 0}`);
  });
} else {
  console.log("❌ NO SCENARIOS FOUND");
}

if (formattedData.enhanced_citations.length > 0) {
  console.log("✅ ENHANCED CITATIONS FOUND:");
  console.log(`  Total citations: ${formattedData.enhanced_citations.length}`);
  console.log(
    `  Sample citation: ${formattedData.enhanced_citations[0]?.claim_text?.substring(
      0,
      100
    )}...`
  );
} else {
  console.log("❌ NO ENHANCED CITATIONS FOUND");
}

// DEBUG: Show what we actually processed
console.log("\n=== PROCESSING SUMMARY ===");
console.log("Input items processed:", items.length);
console.log("Scenarios found:", formattedData.scenarios.length);
console.log(
  "Enhanced citations found:",
  formattedData.enhanced_citations.length
);
console.log("Data sources found:", formattedData.data_sources_table.length);

if (formattedData.scenarios.length === 0) {
  console.log("\n⚠️ NO SCENARIOS FOUND - CHECKING INPUT DATA:");
  items.forEach((item, index) => {
    const data = item.json || {};
    console.log(`Input ${index}:`, Object.keys(data));
    if (data.scenario_rankings)
      console.log(`  - scenario_rankings: ${data.scenario_rankings.length}`);
    if (data.scenarios) console.log(`  - scenarios: ${data.scenarios.length}`);
    if (data.results) console.log(`  - results: ${data.results.length}`);
  });
}

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

// Calculate top publishers and evidence summary
const domainCounts = {};
const evidenceSummary = {
  total_citations: 0,
  verified_citations: 0,
  high_authority_citations: 0,
  unique_domains: 0,
};

// Count domains and evidence across all sources
formattedData.data_sources_table.forEach((source) => {
  if (source.source_domain) {
    domainCounts[source.source_domain] =
      (domainCounts[source.source_domain] || 0) + 1;
  }
  evidenceSummary.total_citations++;
  if (source.verification_status === "verified")
    evidenceSummary.verified_citations++;
  if ((source.authority_score || 0) >= 7)
    evidenceSummary.high_authority_citations++;
});

evidenceSummary.unique_domains = Object.keys(domainCounts).length;

// Get top 5 publishers by citation count
const topPublishers = Object.entries(domainCounts)
  .sort(([, a], [, b]) => b - a)
  .slice(0, 5)
  .map(([domain, count]) => ({ domain, citation_count: count }));

// Update report metadata
formattedData.report_metadata.top_publishers = topPublishers;
formattedData.report_metadata.evidence_summary = evidenceSummary;

return [{ json: formattedData }];
