// Dynamic Prompt 32 - Generates competitive analysis requests for a single scenario
// Input: Individual scenario from split out (after 010_scenarioSplitOut)
// Output: Dynamic prompt content for competitive analysis

const inputData = $input.first().json || {};

console.log("=== DYNAMIC PROMPT 32 GENERATION (SINGLE SCENARIO) ===");
console.log("Input keys:", Object.keys(inputData));
console.log("Full input data:", JSON.stringify(inputData, null, 2));

// After split, we get individual scenario objects, not arrays
// Check if this is a single scenario or if we still have the full structure
let scenario, whitelist;

if (inputData.scenarios && Array.isArray(inputData.scenarios)) {
  // Still getting full structure (shouldn't happen after split)
  console.log(
    "WARNING: Received full scenarios array, expected single scenario"
  );
  scenario = inputData.scenarios[0]; // Take first scenario
  whitelist = inputData.whitelist || [];
} else if (inputData.scenario_id) {
  // This is a single scenario object
  scenario = inputData;
  whitelist = inputData.whitelist || [];
} else {
  throw new Error("No valid scenario found in input data");
}

console.log(
  "Processing scenario:",
  scenario.scenario_id,
  "-",
  scenario.scenario_title
);
console.log("Whitelist received:", whitelist);

// If no whitelist found, try to extract from scenario or use fallback
if (whitelist.length === 0) {
  console.log("WARNING: No whitelist found in input data");
  console.log("Available input keys:", Object.keys(inputData));

  // Try to extract competitors from scenario user_query as fallback
  const extractedCompetitors = new Set();
  if (scenario.user_query) {
    // Look for company names in the user query
    const matches = scenario.user_query.match(
      /\b(Wynn Las Vegas|The Venetian|MGM Grand|Fontainebleau Las Vegas|Bellagio|Caesars Palace|Aria|Cosmopolitan|Mandalay Bay|Luxor|Excalibur|New York New York|Paris Las Vegas|Planet Hollywood|Bally's|Flamingo|Harrah's|The LINQ|Treasure Island|Circus Circus)\b/gi
    );
    if (matches) {
      matches.forEach((match) => extractedCompetitors.add(match));
    }
  }

  if (extractedCompetitors.size > 0) {
    whitelist = Array.from(extractedCompetitors);
    console.log("Extracted competitors from scenario:", whitelist);
  } else {
    // Final fallback
    whitelist = [
      "Wynn Las Vegas",
      "The Venetian",
      "MGM Grand",
      "Fontainebleau Las Vegas",
    ];
    console.log("Using fallback whitelist:", whitelist);
  }
}

// Generate dynamic prompt for this single scenario
const competitorList = whitelist.join(", ");
const competitorCount = whitelist.length;

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
You MUST focus ONLY on these specific competitors: ${competitorList}.

MANDATORY: You must analyze ALL ${competitorCount} competitors listed above, not just a subset.
Do NOT include any other companies in your analysis. If you find other companies mentioned in social media sources, use them only as context for analyzing the specified competitors.

SOURCE REQUIREMENTS:
- Include BOTH traditional business sources AND social media sources
- For social media sources, provide EXACT links to specific posts, not just general site links
- Include traditional sources: Forbes Travel Guide, industry reports, company websites, business publications, trade journals, analyst reports
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

return [{ json: dynamicPrompt }];
