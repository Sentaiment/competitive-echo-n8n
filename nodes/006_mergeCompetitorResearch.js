// Parse Competitor Research Results and Merge with Original Data
const inputData = $input.first().json;
const researchResponse = $input.last().json;

console.log("=== MERGING COMPETITOR RESEARCH ===");
console.log("Original competitors:", inputData.competitors?.length || 0);

// Extract research results
let additionalCompetitors = [];
let researchMetadata = {};

try {
  // Handle different response formats
  let researchText = "";
  if (researchResponse.content?.[0]?.text) {
    researchText = researchResponse.content[0].text;
  } else if (researchResponse.response?.content?.[0]?.text) {
    researchText = researchResponse.response.content[0].text;
  } else if (typeof researchResponse === "string") {
    researchText = researchResponse;
  } else {
    researchText = JSON.stringify(researchResponse);
  }

  // Try to parse JSON from response
  let researchData;
  try {
    researchData = JSON.parse(researchText);
  } catch (e) {
    // Try to extract JSON from text
    const jsonMatch = researchText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      researchData = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error("No valid JSON found in research response");
    }
  }

  additionalCompetitors = researchData.additional_competitors || [];
  researchMetadata = researchData.research_metadata || {};

  console.log("Found additional competitors:", additionalCompetitors.length);
} catch (error) {
  console.error("Error parsing research results:", error.message);
  console.log("Research response:", researchResponse);

  // Fallback: return original data without additional competitors
  return [{ json: { ...inputData, competitor_research_error: error.message } }];
}

// Merge original competitors with researched ones
const originalCompetitors = inputData.competitors || [];
const allCompetitors = [...originalCompetitors];

// Add new competitors (avoid duplicates)
for (const newComp of additionalCompetitors) {
  const companyName = newComp.company_name || newComp.name || "";
  if (companyName && !allCompetitors.includes(companyName)) {
    allCompetitors.push(companyName);
  }
}

console.log("Total competitors after research:", allCompetitors.length);

// Return merged data
return [
  {
    json: {
      ...inputData,
      competitors: allCompetitors,
      competitor_research: {
        original_count: originalCompetitors.length,
        researched_count: additionalCompetitors.length,
        total_count: allCompetitors.length,
        research_metadata: researchMetadata,
        additional_competitors: additionalCompetitors,
      },
    },
  },
];
