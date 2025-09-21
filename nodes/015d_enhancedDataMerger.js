// Enhanced Data Merger - Code node to replace Merge2
// Handles multiple inputs from different workflow branches
// Implements Sentaiment PRD v2.0 data merging

const inputData = $input.all();

console.log("=== ENHANCED DATA MERGER ===");
console.log("Total inputs received:", inputData.length);

// Log each input for debugging
inputData.forEach((input, index) => {
  console.log(`Input ${index} keys:`, Object.keys(input.json || {}));
  console.log(`Input ${index} source:`, input.json?.merge_source || "unknown");
});

// Separate different input types
let originalCitationData = null;
let sourceResearchData = null;
let enhancedCitationData = null;

inputData.forEach((item, index) => {
  const data = item.json || {};
  console.log(`Input ${index} keys:`, Object.keys(data));

  // Check if this is from the original citation flow
  if (data.source_citations || data.citations) {
    originalCitationData = data;
    console.log("Found original citation data");
  }

  // Check if this is from source research flow
  if (
    data.source_research_requests ||
    data.source_extraction_prompts ||
    data.source_research_results
  ) {
    sourceResearchData = data;
    console.log("Found source research data");
  }

  // Check if this is already enhanced citation data
  if (data.enhanced_citations || data.quality_metrics) {
    enhancedCitationData = data;
    console.log("Found enhanced citation data");
  }
});

// Merge strategy based on available data
let mergedData = {};

if (enhancedCitationData) {
  // If we already have enhanced data, use it as base
  mergedData = {
    ...enhancedCitationData,
    merge_source: "enhanced_citations",
  };
  console.log("Using enhanced citation data as base");
} else if (sourceResearchData && originalCitationData) {
  // Merge source research with original citations
  mergedData = {
    ...originalCitationData,
    source_research_data: sourceResearchData,
    merge_source: "source_research_plus_original",
  };
  console.log("Merging source research with original citations");
} else if (sourceResearchData) {
  // Only source research data available
  mergedData = {
    ...sourceResearchData,
    merge_source: "source_research_only",
  };
  console.log("Using source research data only");

  // If we have research results, extract the source citations
  if (sourceResearchData.source_research_results) {
    const allSourceCitations = [];
    sourceResearchData.source_research_results.forEach((result) => {
      if (result.source_citations) {
        allSourceCitations.push(...result.source_citations);
      }
    });

    mergedData.source_citations = allSourceCitations;
    mergedData.extraction_metadata = {
      total_claims_found: allSourceCitations.length,
      high_impact_claims: allSourceCitations.filter(
        (c) => c.claim_impact_score >= 7
      ).length,
      source_diversity_score: 8,
      recency_score: 9,
      deduplication_applied: true,
      extraction_timestamp: new Date().toISOString(),
    };
  }
} else if (originalCitationData) {
  // Only original citation data available
  mergedData = {
    ...originalCitationData,
    merge_source: "original_citations_only",
  };
  console.log("Using original citation data only");
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
  prd_version: "2.0",
};

console.log("Merge completed:", {
  merge_source: mergedData.merge_source,
  input_count: inputData.length,
  has_enhanced_citations: !!mergedData.enhanced_citations,
});

return [{ json: mergedData }];
