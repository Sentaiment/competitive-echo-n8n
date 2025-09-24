// Dynamic Prompt 31 - Generates scenarios based on actual CSV data

// ==== Inputs ====
const company = ($json.company || "").trim();
const competitors = Array.isArray($json.competitors) ? $json.competitors : [];
const industry = ($json.industry || "").trim();
const positioning = $json.positioning || "";
const description = $json.description || "";
const values = $json.values || "";

// ==== Limits (centralized) ====
const TITLE_WORD_LIMIT = 6;
const USER_QUERY_WORD_LIMIT = 50; // relaxed from 28
const RATIONALE_WORD_LIMIT = 12;

// ==== Whitelist ====
const whitelist = Array.from(
  new Set([company, ...competitors].filter(Boolean))
);
if (whitelist.length < 2) {
  throw new Error("Need at least 2 brands for competitive analysis.");
}
const requiredBrandsList = whitelist.join(", ");

// ==== Dynamic context generation ====
// Define BEFORE use to avoid "is not defined" in VM
function generateIndustryContext(
  industryRaw,
  positioningText,
  descriptionText,
  valuesText
) {
  const s = (industryRaw || "").toLowerCase();

  // keyword flags
  const isHotel = /hotel|resort|hospitality/.test(s);
  const isRestaurant = /restaurant|food|dining/.test(s);
  const isRetail = /retail|fashion|shopping/.test(s);
  const isTech = /tech|software|digital|saas|platform/.test(s);

  // defaults
  let contextualFocus = "business solutions and service provider selection";
  let decisionFactors =
    "quality, service excellence, value proposition, reputation, reliability, innovation, customer support";
  let scenarioTypes =
    "service provider selection, business solution comparisons, vendor evaluation decisions";
  let industryLabel = industryRaw || "General";

  if (isHotel) {
    contextualFocus = "luxury hospitality and guest experience selection";
    decisionFactors =
      "service quality, amenities, location, reputation, dining options, spa services, room quality, loyalty programs, special experiences, value proposition";
    scenarioTypes =
      "luxury hotel selection decisions, booking preferences, resort experience comparisons, hospitality service evaluations";
    industryLabel = industryRaw || "Hospitality";
  } else if (isRestaurant) {
    contextualFocus = "dining experience and culinary service selection";
    decisionFactors =
      "food quality, service excellence, ambiance, value, location convenience, dietary accommodations, reservation availability";
    scenarioTypes =
      "restaurant choice decisions, dining experience preferences, culinary service comparisons";
    industryLabel = industryRaw || "Food & Dining";
  } else if (isRetail) {
    contextualFocus = "retail shopping and brand preference";
    decisionFactors =
      "product quality, customer service, pricing, brand reputation, shopping experience, product selection, store atmosphere";
    scenarioTypes =
      "brand selection decisions, shopping venue preferences, retail experience comparisons";
    industryLabel = industryRaw || "Retail";
  } else if (isTech) {
    contextualFocus = "technology solutions and platform selection";
    decisionFactors =
      "functionality, user experience, integration capabilities, support quality, pricing, security, scalability, roadmap";
    scenarioTypes =
      "technology platform decisions, software selection, digital solution comparisons";
    industryLabel = industryRaw || "Technology";
  }

  return { contextualFocus, decisionFactors, scenarioTypes, industryLabel };
}

const { contextualFocus, decisionFactors, scenarioTypes, industryLabel } =
  generateIndustryContext(industry, positioning, description, values);

// ==== Themes ====
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
const combinedThemesText = combinedThemes.length
  ? combinedThemes.join(", ")
  : "quality, service, excellence";

// ==== System + User prompts ====
const system_content = `You are Sentaiment's Statistical Competitive Ranking Analyzer.
Your ONLY task: generate buyer-decision scenarios dynamically based on the provided business context.

DYNAMIC CONTEXT ADAPTATION:
- Industry Focus: ${contextualFocus}
- Key Decision Factors: ${decisionFactors}
- Scenario Types: ${scenarioTypes}
- Brand Positioning Context: ${
  positioning ? positioning.substring(0, 200) : "Premium market positioning"
}
- Key Brand Themes: ${combinedThemesText}

INDUSTRY-SPECIFIC REQUIREMENTS:
${
  /Hotels/i.test(industryLabel)
    ? `
- Focus on luxury hospitality decision-making scenarios
- Consider guest experience factors: service, amenities, dining, location, reputation
- Include scenarios about booking decisions, experience preferences, loyalty considerations
- Address both leisure and business travel contexts
`
    : `
- Focus on ${industryLabel} industry decision-making scenarios
- Consider relevant business factors for ${industryLabel}
- Include realistic customer decision points for this industry
- Address both individual and business customer contexts
`
}

STRICT COMPETITOR POLICY:
- Allowed names = ALLOWED_COMPETITORS (case-insensitive) plus COMPANY_NAME. No others.
- EVERY scenario MUST list ALL allowed brands in the user_query (explicitly by name). No omissions.
- CRITICAL: Avoid direct "Company A vs Company B" comparison scenarios. Instead, create broader market evaluation scenarios that naturally include all competitors.
- Never write pairwise "A vs B"; always a full-set comparison among ALL allowed brands.
- Focus on comprehensive market analysis rather than head-to-head comparisons.
- CRITICAL: You must analyze ALL ${
  whitelist.length
} competitors in every scenario, not just 4.
- Do NOT limit yourself to only 4 competitors - include ALL competitors in every analysis.

DYNAMIC SCENARIO GENERATION:
- Adapt question types to the specific industry: ${industryLabel}
- Use the brand's actual positioning: ${
  positioning ? positioning.substring(0, 100) + "..." : "Premium positioning"
}
- Focus on realistic customer decision points for ${industryLabel}
- Consider the competitive factors most relevant to this business type

OUTPUT FORMAT:
- Concise strings. No invented facts/numbers/rankings.
- Per scenario limits: title ≤ ${TITLE_WORD_LIMIT} words; user_query ≤ ${USER_QUERY_WORD_LIMIT} words; rationale ≤ ${RATIONALE_WORD_LIMIT} words.
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
      "user_query": "How do luxury suite designs compare across ${requiredBrandsList}?",
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
INDUSTRY: ${industryLabel}
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
- scenario_title ≤ ${TITLE_WORD_LIMIT} words
- user_query ≤ ${USER_QUERY_WORD_LIMIT} words
- rationale ≤ ${RATIONALE_WORD_LIMIT} words

MANDATORY COMPETITOR REQUIREMENT:
- You MUST include ALL ${whitelist.length} companies in every scenario analysis
- Do NOT limit yourself to only 4 companies
- Every user_query must mention ALL companies: ${requiredBrandsList}
- The LLM will analyze ALL companies, not just a subset
- IMPORTANT: The first company in the list is the TARGET COMPANY being analyzed and must be included in all rankings
- AVOID COMPANY COMPARISON SCENARIOS: Do not create "Company A vs Company B" scenarios. Instead, create broader market evaluation questions that naturally encompass all competitors in a comprehensive analysis.

DIMENSION DISTRIBUTION:
- Scenarios 1-5: functional_competence
- Scenarios 6-9: identity_values
- Scenarios 10-12: market_leadership

TASK:
- Generate 12 buyer-decision scenarios adapted to ${industryLabel}
- Focus on ${contextualFocus}
- Consider these decision factors: ${decisionFactors}
- Create ${scenarioTypes} that buyers in this industry would actually face
- Use the brand's actual positioning and values to inform realistic competitive scenarios
- Incorporate brand themes: ${combinedThemesText}
- CRITICAL: Each scenario must analyze ALL ${
  whitelist.length
} competitors, not just 4
- Return ONLY the JSON between <<JSON_START>> and <<JSON_END>> with NO additional text.`;

// ==== Debug logs ====
console.log("=== DYNAMIC PROMPT GENERATION ===");
console.log("Industry (raw):", industry);
console.log("Industry (label):", industryLabel);
console.log("Company:", company);
console.log("Competitors:", competitors);
console.log("Whitelist size:", whitelist.length);
console.log("Contextual Focus:", contextualFocus);
console.log("Brand Themes:", combinedThemes);

// ==== Output ====
return [
  {
    json: {
      system_content,
      user_content,
      whitelist,
      business_context: {
        industry: industryLabel,
        positioning,
        contextual_focus: contextualFocus,
        brand_themes: combinedThemes,
      },
    },
  },
];
