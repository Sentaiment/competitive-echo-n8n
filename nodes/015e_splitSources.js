// Split Sources for Individual Processing
// This node splits the source research requests so each can be processed individually

const inputData = $input.first().json;
const sourceRequests = inputData.source_research_requests || [];

console.log("=== SPLIT SOURCES FOR INDIVIDUAL PROCESSING ===");
console.log(
  "Splitting",
  sourceRequests.length,
  "source requests for individual processing"
);

// Return each source request as a separate item
const splitResults = sourceRequests.map((request, index) => {
  console.log(`Splitting source ${index + 1}: ${request.source_name}`);

  return {
    json: {
      ...request,
      split_index: index,
      total_sources: sourceRequests.length,
      split_timestamp: new Date().toISOString(),
    },
  };
});

console.log(`Split into ${splitResults.length} individual source requests`);

return splitResults;
