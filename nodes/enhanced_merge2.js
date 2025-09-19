// Enhanced Merge2 - Handles both original citation flow and new source research flow
// Implements Sentaiment PRD v2.0 data merging

const inputData = $input.all();

console.log("=== ENHANCED MERGE2 ===");
console.log("Processing inputs:", inputData.length);

// Separate different input types
let originalCitationData = null;
let sourceResearchData = null;
let enhancedCitationData = null;
let originalScenarioData = null;

inputData.forEach((item, index) => {
  const data = item.json || {};
  console.log(`Input ${index} keys:`, Object.keys(data));

  // Check if this is from the original citation flow
  if (data.source_citations || data.citations) {
    originalCitationData = data;
    console.log("Found original citation data");
  }

  // Check if this is from source research flow
  if (data.source_research_requests || data.source_extraction_prompts) {
    sourceResearchData = data;
    console.log("Found source research data");
  }

  // Check if this is already enhanced citation data
  if (data.enhanced_citations || data.quality_metrics) {
    enhancedCitationData = data;
    console.log("Found enhanced citation data");
  }

  // Check if this contains original scenario definitions with scenario_title
  if (
    data.scenarios &&
    Array.isArray(data.scenarios) &&
    data.scenarios.some((s) => s.scenario_title)
  ) {
    originalScenarioData = data;
    console.log("Found original scenario definitions with scenario_title");
    console.log(
      "Sample scenario titles:",
      data.scenarios.slice(0, 3).map((s) => s.scenario_title)
    );
  }
});

// Merge strategy based on available data
let mergedData = {};

if (enhancedCitationData) {
  // If we already have enhanced data, use it as base and add original scenarios if available
  mergedData = {
    ...enhancedCitationData,
    merge_source: "enhanced_citations",
  };

  // Add original scenario definitions if available
  if (originalScenarioData && originalScenarioData.scenarios) {
    mergedData.original_scenarios = originalScenarioData.scenarios;
    mergedData.merge_source = "enhanced_citations_plus_original_scenarios";
    console.log("Added original scenario definitions to enhanced data");
  }

  console.log("Using enhanced citation data as base");
} else if (sourceResearchData && originalCitationData) {
  // Merge source research with original citations
  mergedData = {
    ...originalCitationData,
    source_research_data: sourceResearchData,
    merge_source: "source_research_plus_original",
  };

  // Add original scenario definitions if available
  if (originalScenarioData && originalScenarioData.scenarios) {
    mergedData.original_scenarios = originalScenarioData.scenarios;
    mergedData.merge_source = "source_research_plus_original_plus_scenarios";
    console.log("Added original scenario definitions");
  }

  console.log("Merging source research with original citations");
} else if (sourceResearchData) {
  // Only source research data available
  mergedData = {
    ...sourceResearchData,
    merge_source: "source_research_only",
  };

  // Add original scenario definitions if available
  if (originalScenarioData && originalScenarioData.scenarios) {
    mergedData.original_scenarios = originalScenarioData.scenarios;
    mergedData.merge_source = "source_research_plus_scenarios";
    console.log("Added original scenario definitions");
  }

  console.log("Using source research data only");
} else if (originalCitationData) {
  // Only original citation data available
  mergedData = {
    ...originalCitationData,
    merge_source: "original_citations_only",
  };

  // Add original scenario definitions if available
  if (originalScenarioData && originalScenarioData.scenarios) {
    mergedData.original_scenarios = originalScenarioData.scenarios;
    mergedData.merge_source = "original_citations_plus_scenarios";
    console.log("Added original scenario definitions");
  }

  console.log("Using original citation data only");
} else if (originalScenarioData) {
  // Only original scenario data available
  mergedData = {
    ...originalScenarioData,
    merge_source: "original_scenarios_only",
  };
  console.log("Using original scenario data only");
} else {
  // No recognizable data
  mergedData = {
    error: "No recognizable data format found",
    merge_source: "error",
    input_count: inputData.length,
  };
  console.log("No recognizable data format found");
}

// Add merge metadata
mergedData.merge_metadata = {
  merge_timestamp: new Date().toISOString(),
  input_count: inputData.length,
  has_original_citations: !!originalCitationData,
  has_source_research: !!sourceResearchData,
  has_enhanced_citations: !!enhancedCitationData,
  has_original_scenarios: !!originalScenarioData,
  prd_version: "2.0",
};

console.log("Merge completed:", {
  merge_source: mergedData.merge_source,
  input_count: inputData.length,
  has_enhanced_citations: !!mergedData.enhanced_citations,
  has_original_scenarios: !!mergedData.original_scenarios,
  original_scenario_count: mergedData.original_scenarios?.length || 0,
});

return [{ json: mergedData }];
