// Competitor Research Node - Research additional competitors if we have fewer than 10
const inputData = $json;

console.log("=== COMPETITOR RESEARCH ===");
console.log("Current competitors:", inputData.competitors?.length || 0);
console.log("Company:", inputData.company);
console.log("Industry:", inputData.industry);

// Check if we need to research more competitors
const currentCompetitors = inputData.competitors || [];
const minCompetitors = 14;

if (currentCompetitors.length >= minCompetitors) {
  console.log("Sufficient competitors found, no research needed");
  return [{ json: inputData }];
}

const company = inputData.company || "";
const industry = inputData.industry || "";
const competitorsNeeded = minCompetitors - currentCompetitors.length;

console.log(`Need to research ${competitorsNeeded} additional competitors`);

// Create research prompt for additional competitors
const researchPrompt = {
  system_content: `You are a competitive intelligence researcher. Research additional competitors in the ${industry} industry for ${company}. Return ONLY valid JSON in the exact format specified.`,
  user_content: `COMPETITOR RESEARCH REQUEST

Company: ${company}
Industry: ${industry}
Current Competitors: ${currentCompetitors.join(", ")}

Research ${competitorsNeeded} additional competitors in the ${industry} industry that would be relevant for competitive analysis of ${company}.

Requirements:
- Focus on direct competitors in the same market segment
- Include both established and emerging competitors
- Prioritize companies with similar positioning or target market
- Do NOT include companies that are not direct competitors
- Do NOT make up or invent companies
- Only include real, verifiable companies

Return ONLY valid JSON in this EXACT format:
{
  "additional_competitors": [
    {
      "company_name": "Real Company Name",
      "industry_segment": "luxury_hospitality",
      "competitive_relevance": "direct_competitor",
      "market_position": "premium",
      "research_confidence": "high|medium|low",
      "verification_notes": "Brief note on why this is a relevant competitor"
    }
  ],
  "research_metadata": {
    "total_researched": ${competitorsNeeded},
    "research_timestamp": "${new Date().toISOString()}",
    "industry_focus": "${industry}",
    "target_company": "${company}"
  }
}

Focus on real companies that would actually compete with ${company} in the ${industry} industry.`,
};

return [
  {
    json: {
      ...inputData,
      competitor_research_needed: true,
      research_prompt: researchPrompt,
    },
  },
];
