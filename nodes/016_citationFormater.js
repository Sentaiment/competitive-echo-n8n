// Enhanced Citation Formater - Parse Claude responses first
const items = $input.all();
console.log("=== CITATION FORMATER DEBUG ===");
console.log("Processing items:", items.length);

let allCitations = [];

items.forEach((item, index) => {
  console.log(`Processing item ${index}:`, Object.keys(item.json || {}));

  let parsedCitations = [];

  // Handle Claude API response format
  if (item.json?.content?.[0]?.text) {
    try {
      const responseText = item.json.content[0].text;
      console.log("Found Claude response text");

      // Try to extract JSON from Claude response
      const jsonMatch =
        responseText.match(/```json\n([\s\S]*?)\n```/) ||
        responseText.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const extractedData = JSON.parse(jsonMatch[1] || jsonMatch[0]);
        if (extractedData.source_citations) {
          parsedCitations = extractedData.source_citations;
        }
      }
    } catch (error) {
      console.error(`Error parsing item ${index}:`, error.message);
    }
  }

  // Handle direct citation arrays
  if (item.json?.source_citations) {
    parsedCitations = parsedCitations.concat(item.json.source_citations);
  }

  allCitations = allCitations.concat(parsedCitations);
});

console.log(`Total citations collected: ${allCitations.length}`);

// Rest of your existing Citation Formater logic...
// [Keep the existing normalization and processing code]

return [
  {
    json: {
      enhanced_citations: allCitations, // Make sure this key is consistent
      processing_metadata: {
        total_citations: allCitations.length,
        processing_timestamp: new Date().toISOString(),
        source: "citation_formater_fixed",
      },
    },
  },
];
