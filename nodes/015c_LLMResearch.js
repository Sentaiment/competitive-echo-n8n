// LLM Research - Source Analysis
// This node processes each source research request and calls Claude API

const inputData = $input.first().json;
const sourceRequests = inputData.source_research_requests || [];

console.log("=== LLM RESEARCH - SOURCE ANALYSIS ===");
console.log("Processing", sourceRequests.length, "source requests");

// Process each source research request
const researchResults = [];

for (const request of sourceRequests) {
  try {
    console.log("Processing source:", request.source_name);

    // Create research request following Sentaiment PRD schema
    const researchRequest = {
      source_id: request.source_id || `source_${Date.now()}`,
      source_name: request.source_name || "Unknown Source",
      scenarios_used: request.scenarios_used || [],
      research_prompt: {
        system_content: `You are a source research specialist implementing the Sentaiment PRD v2.0 source citation system. Research the given source and extract comprehensive metadata with strict adherence to the JSON schema.

CORE REQUIREMENTS:
- Research the specific source to find actual URLs, dates, and authors
- Determine authority scores based on source credibility and reputation
- Assess verification status through cross-referencing
- Identify source origin through temporal and accessibility analysis
- Calculate influence weights and bias indicators
- Extract supporting evidence and cross-references

RETURN ONLY VALID JSON matching the source_citation schema. Do not include markdown or code fences.`,

        user_content: `RESEARCH SOURCE METADATA

Source: ${request.source_name}
Context: Used in competitive analysis scenarios ${(
          request.scenarios_used || []
        ).join(", ")}

RESEARCH TASKS:
1. Find the specific URL for this source
2. Extract exact publication date (YYYY-MM-DD format)
   - Preserve original publication year if present in the source name/title
   - If no date is available, return null (do not synthesize)
3. Identify author(s) or organization
4. Determine authority score (1-10) based on:
   - Source credibility and reputation
   - Industry recognition and peer validation
   - Historical accuracy and reliability
   - Editorial standards and fact-checking
5. Assess verification status through cross-referencing
6. Determine source origin:
   - training_data: Information from model training (pre-2025)
   - real_time_search: Recent web search results (post-2025)
   - hybrid: Mix of training and real-time data
7. Calculate influence weight (0.0-1.0) based on:
   - Authority score
   - Recency of information
   - Cross-reference count
   - Source reach and distribution
8. Identify bias indicators (low/medium/high) based on:
   - Editorial stance
   - Funding sources
   - Political affiliations
   - Commercial interests
9. Extract cross-references and supporting evidence
10. Determine content type (competitive_research/earnings_call/press_release/analyst_report)
11. Assess sentiment direction (positive/negative/neutral)
12. Identify brand mention type (direct_comparison/market_positioning/strategic_move)
13. Calculate actionability score (1-10) for strategic relevance
14. Determine geographic scope (global/regional/local)
15. Assess time sensitivity (immediate/quarterly/annual)

RETURN JSON FORMAT:
{
  "source_citations": [
    {
      "claim_text": "Specific claim from this source",
      "claim_category": "competitive_analysis",
      "claim_impact_score": 7,
      "source_type": "web_research|training_data|company_report|news_article",
      "source_url": "https://actual-source-url.com",
      "source_domain": "domain.com",
      "publication_date": "2025-01-15",
      "author": "Actual Author Name or Organization",
      "author_credibility_score": 8,
      "source_origin": "web_research|training_data|company_filing",
      "training_data_cutoff": "2025-01",
      "authority_score": 8,
      "verification_status": "verified|unverified|conflicting",
      "content_type": "competitive_research|earnings_call|press_release|analyst_report",
      "bias_indicators": "low|medium|high",
      "cross_references": 2,
      "confidence_level": "high|medium|low",
      "supporting_evidence": "Specific data points or context",
      "real_time_indicators": ["recent_announcement", "market_movement"],
      "brand_mention_type": "direct_comparison|market_positioning|strategic_move",
      "sentiment_direction": "positive|negative|neutral",
      "influence_weight": 0.8,
      "strategic_relevance": "market_share|pricing|product_launch|expansion",
      "actionability_score": 8,
      "geographic_scope": "global|regional|local",
      "time_sensitivity": "immediate|quarterly|annual",
      "tags": ["competitive_analysis", "market_research", "business_analysis"]
    }
  ],
  "extraction_metadata": {
    "total_claims_found": 1,
    "high_impact_claims": 1,
    "source_diversity_score": 7,
    "recency_score": 6,
    "deduplication_applied": true,
    "research_timestamp": "${new Date().toISOString()}"
  }
}

Focus on finding the most accurate and comprehensive metadata for this specific source. Return ONLY valid JSON. Do not include markdown or code fences.`,
      },
    };

    researchResults.push(researchRequest);
  } catch (error) {
    console.error("Error processing source:", request.source_name, error);
    // Add error result
    researchResults.push({
      source_id: request.source_id,
      source_name: request.source_name,
      scenarios_used: request.scenarios_used,
      error: error.message,
      research_prompt: null,
    });
  }
}

// Return research requests for processing
return [
  {
    json: {
      source_research_requests: researchResults,
      original_data: inputData,
      research_metadata: {
        total_sources: sourceRequests.length,
        research_timestamp: new Date().toISOString(),
        prd_version: "2.0",
        research_type: "real_time_source_analysis",
      },
    },
  },
];
