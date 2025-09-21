// Dynamic Prompt 31 - Generates scenarios based on actual CSV data
const company = ($json.company || "").trim();
const competitors = Array.isArray($json.competitors) ? $json.competitors : [];
const industry = $json.industry || "";
const positioning = $json.positioning || "";
const description = $json.description || "";
const values = $json.values || "";
const whitelist = Array.from(
  new Set([company, ...competitors].filter(Boolean))
);

if (whitelist.length < 2) {
  throw new Error("Need at least 2 brands for competitive analysis.");
}

const requiredBrandsList = whitelist.join(", ");

// Dynamic context generation based on industry and data
function generateIndustryContext(industry, positioning, description, values) {
  const industryLower = industry.toLowerCase();

  let contextualFocus = "";
  let decisionFactors = "";
  let scenarioTypes = "";

  if (
    industryLower.includes("hotel") ||
    industryLower.includes("resort") ||
    industryLower.includes("hospitality")
  ) {
    contextualFocus = "luxury hospitality and guest experience selection";
    decisionFactors =
      "service quality, amenities, location, reputation, dining options, spa services, room quality, loyalty programs, special experiences, value proposition";
    scenarioTypes =
      "luxury hotel selection decisions, booking preferences, resort experience comparisons, hospitality service evaluations";
  } else if (
    industryLower.includes("restaurant") ||
    industryLower.includes("food") ||
    industryLower.includes("dining")
  ) {
    contextualFocus = "dining experience and culinary service selection";
    decisionFactors =
      "food quality, service excellence, ambiance, value, location convenience, dietary accommodations, reservation availability";
    scenarioTypes =
      "restaurant choice decisions, dining experience preferences, culinary service comparisons";
  } else if (
    industryLower.includes("retail") ||
    industryLower.includes("fashion") ||
    industryLower.includes("shopping")
  ) {
    contextualFocus = "retail shopping and brand preference";
    decisionFactors =
      "product quality, customer service, pricing, brand reputation, shopping experience, product selection, store atmosphere";
    scenarioTypes =
      "brand selection decisions, shopping venue preferences, retail experience comparisons";
  } else if (
    industryLower.includes("tech") ||
    industryLower.includes("software") ||
    industryLower.includes("digital")
  ) {
    contextualFocus = "technology solutions and platform selection";
    decisionFactors =
      "functionality, user experience, integration capabilities, support quality, pricing, security, scalability";
    scenarioTypes =
      "technology platform decisions, software selection, digital solution comparisons";
  } else {
    // Generic business context
    contextualFocus = "business solutions and service provider selection";
    decisionFactors =
      "quality, service excellence, value proposition, reputation, reliability, innovation, customer support";
    scenarioTypes =
      "service provider selection, business solution comparisons, vendor evaluation decisions";
  }

  return { contextualFocus, decisionFactors, scenarioTypes };
}

const { contextualFocus, decisionFactors, scenarioTypes } =
  generateIndustryContext(industry, positioning, description, values);

// Extract key themes from positioning and values for more targeted scenarios
const positioningThemes = positioning
  ? positioning
      .toLowerCase()
      .match(
        /\b(luxury|premium|quality|service|innovation|authentic|exclusive|sophisticated)\b/g
      ) || []
  : [];
const valueThemes = values
  ? values
      .toLowerCase()
      .match(
        /\b(service|quality|innovation|luxury|authentic|personal|environment|sustain|art|design)\b/g
      ) || []
  : [];
const combinedThemes = [...new Set([...positioningThemes, ...valueThemes])];

const system_content = `You are Sentaiment's Statistical Competitive Ranking Analyzer.
Your ONLY task: generate buyer-decision scenarios dynamically based on the provided business context.

DYNAMIC CONTEXT ADAPTATION:
- Industry Focus: ${contextualFocus}
- Key Decision Factors: ${decisionFactors}
- Scenario Types: ${scenarioTypes}
- Brand Positioning Context: ${
  positioning ? positioning.substring(0, 200) : "Premium market positioning"
}
- Key Brand Themes: ${
  combinedThemes.length
    ? combinedThemes.join(", ")
    : "quality, service, excellence"
}

INDUSTRY-SPECIFIC REQUIREMENTS:
${
  industry === "Hotels & Resorts"
    ? `
- Focus on luxury hospitality decision-making scenarios
- Consider guest experience factors: service, amenities, dining, location, reputation
- Include scenarios about booking decisions, experience preferences, loyalty considerations
- Address both leisure and business travel contexts
`
    : `
- Focus on ${industry} industry decision-making scenarios  
- Consider relevant business factors for ${industry}
- Include realistic customer decision points for this industry
- Address both individual and business customer contexts
`
}

STRICT COMPETITOR POLICY:
- Allowed names = ALLOWED_COMPETITORS (case-insensitive) plus COMPANY_NAME. No others.
- EVERY scenario MUST list ALL allowed brands in the user_query (explicitly by name). No omissions.
- Never write pairwise "A vs B"; always a full-set comparison among ALL allowed brands.

DYNAMIC SCENARIO GENERATION:
- Adapt question types to the specific industry: ${industry}
- Use the brand's actual positioning: ${
  positioning ? positioning.substring(0, 100) + "..." : "Premium positioning"
}
- Focus on realistic customer decision points for ${industry}
- Consider the competitive factors most relevant to this business type

OUTPUT FORMAT:
- Concise strings. No invented facts/numbers/rankings.
- Per scenario limits: title ≤ 6 words; user_query ≤ 28 words; rationale ≤ 12 words.
- expected_metrics = []; data_limitations = []; confidence_score = null.

DIMENSION DISTRIBUTION:
- Scenarios 1-5: functional_competence (performance, features, service quality)
- Scenarios 6-9: identity_values (brand alignment, values, positioning)  
- Scenarios 10-12: market_leadership (reputation, innovation, market position)

Return ONLY valid JSON in this EXACT format:
<<JSON_START>>
{
  "scenarios": [
    {
      "scenario_id": 1,
      "scenario_title": "Luxury Suite Design Comparison",
      "user_query": "How do luxury suite designs compare across Wynn Las Vegas, The Venetian, MGM Grand, and Fontainebleau Las Vegas?",
      "dimension": "design_aesthetics",
      "rationale": "Analyzes design elements that differentiate luxury accommodations",
      "expected_metrics": [],
      "data_limitations": [],
      "confidence_score": null
    }
  ],
  "source_citations": []
}
<<JSON_END>>`;

const user_content = `COMPANY_NAME: ${company}
ALLOWED_COMPETITORS: ${JSON.stringify(whitelist)}
INDUSTRY: ${industry}
POSITIONING: ${positioning}
BRAND_DESCRIPTION: ${
  description ? description.substring(0, 300) : "Not provided"
}
BRAND_VALUES: ${values ? values.substring(0, 200) : "Not provided"}

CRITICAL JSON STRUCTURE REQUIREMENTS:
- Return EXACTLY 12 scenarios with scenario_id 1-12
- Each scenario MUST have: scenario_id, scenario_title, user_query, dimension, rationale, expected_metrics, data_limitations, confidence_score
- expected_metrics = [] (empty array)
- data_limitations = [] (empty array) 
- confidence_score = null
- In EVERY user_query, explicitly list ALL brands: ${requiredBrandsList}
- scenario_title ≤ 6 words
- user_query ≤ 28 words
- rationale ≤ 12 words

DIMENSION DISTRIBUTION:
- Scenarios 1-5: functional_competence
- Scenarios 6-9: identity_values
- Scenarios 10-12: market_leadership

TASK:
- Generate 12 buyer-decision scenarios adapted to ${industry}
- Focus on ${contextualFocus}
- Consider these decision factors: ${decisionFactors}
- Create ${scenarioTypes} that buyers in this industry would actually face
- Use the brand's actual positioning and values to inform realistic competitive scenarios
- Incorporate brand themes: ${
  combinedThemes.join(", ") || "quality and service"
}
- Return ONLY the JSON between <<JSON_START>> and <<JSON_END>> with NO additional text.`;

console.log("=== DYNAMIC PROMPT GENERATION ===");
console.log("Industry:", industry);
console.log("Company:", company);
console.log("Competitors:", competitors);
console.log("Contextual Focus:", contextualFocus);
console.log("Brand Themes:", combinedThemes);

return [
  {
    json: {
      system_content,
      user_content,
      whitelist,
      business_context: {
        industry,
        positioning,
        contextual_focus: contextualFocus,
        brand_themes: combinedThemes,
      },
    },
  },
];
