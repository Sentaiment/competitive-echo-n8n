// Source Research Node - Implements real-time source research following Sentaiment PRD v2.0
// This node researches specific sources to extract detailed metadata

const inputData = $input.first().json;

console.log("=== SOURCE RESEARCH NODE ===");
console.log("Processing source research requests");

const sourceExtractionPrompts = inputData.source_extraction_prompts || [];
const originalData = inputData.original_data || {};

console.log(
  `Processing ${sourceExtractionPrompts.length} source research requests`
);

// Process each source extraction prompt
const sourceResearchResults = sourceExtractionPrompts.map((prompt, index) => {
  console.log(`Processing source ${index + 1}: ${prompt.source_name}`);

  // Create research request following Sentaiment PRD schema
  const researchRequest = {
    source_id: prompt.source_id,
    source_name: prompt.source_name,
    scenarios_used: prompt.scenarios_used,
    research_prompt: {
      system_content: `You are a source research specialist implementing the Sentaiment PRD v2.0 source citation system. Research the given source and extract comprehensive metadata with strict adherence to the JSON schema.

CORE REQUIREMENTS:
- Research the specific source to find actual URLs, dates, and authors
- Determine authority scores based on source credibility and reputation
- Assess verification status through cross-referencing
- Identify source origin through temporal and accessibility analysis
- Calculate influence weights and bias indicators
- Extract supporting evidence and cross-references

RETURN ONLY VALID JSON matching the source_citation schema.`,

      user_content: `RESEARCH SOURCE METADATA

Source: ${prompt.source_name}
Context: Used in competitive analysis scenarios ${prompt.scenarios_used.join(
        ", "
      )}

RESEARCH TASKS:
1. Find the specific URL for this source
2. Extract exact publication date (YYYY-MM-DD format)
3. Identify author(s) or organization
4. Determine authority score (1-10) based on:
   - Source credibility and reputation
   - Industry recognition and peer validation
   - Historical accuracy and reliability
   - Editorial standards and fact-checking
   - Social media engagement metrics (likes, shares, comments)
   - Community credibility and user verification
5. Assess verification status through cross-referencing
6. Determine source origin:
   - training_data: Information from model training (pre-2025)
   - real_time_search: Recent web search results (post-2025)
   - social_media: Reddit, YouTube, Twitter, TikTok, Instagram posts
   - hybrid: Mix of training and real-time data
7. Calculate influence weight (0.0-1.0) based on:
   - Authority score
   - Recency of information
   - Cross-reference count
   - Source reach and distribution
   - Social media engagement (upvotes, views, shares)
   - Community consensus and discussion quality
8. Identify bias indicators (low/medium/high) based on:
   - Editorial stance
   - Funding sources
   - Political affiliations
   - Commercial interests
   - Social media echo chambers
   - User sentiment patterns
9. Extract cross-references and supporting evidence
10. Determine content type:
    - competitive_research/earnings_call/press_release/analyst_report
    - reddit_discussion/youtube_review/twitter_thread/instagram_post
    - user_generated_content/influencer_content/community_feedback
11. Assess sentiment direction (positive/negative/neutral)
12. Identify brand mention type (direct_comparison/market_positioning/strategic_move)
13. Calculate actionability score (1-10) for strategic relevance
14. Determine geographic scope (global/regional/local)
15. Assess time sensitivity (immediate/quarterly/annual)
16. For social media sources, extract:
    - Engagement metrics (likes, shares, comments, views)
    - Community sentiment and discussion quality
    - User credibility and verification status
    - Post recency and viral potential

RETURN JSON FORMAT:
{
  "source_citations": [
    {
      "claim_text": "Specific claim from this source",
      "claim_category": "competitive_analysis",
      "claim_impact_score": 7,
      "source_type": "web_research|training_data|company_report|news_article|reddit_discussion|youtube_review|twitter_thread|instagram_post|tiktok_video",
      "source_url": "https://actual-source-url.com",
      "source_domain": "domain.com",
      "publication_date": "2025-01-15",
      "author": "Actual Author Name or Organization",
      "author_credibility_score": 8,
      "source_origin": "web_research|training_data|company_filing|social_media",
      "training_data_cutoff": "2025-01",
      "authority_score": 8,
      "verification_status": "verified|unverified|conflicting",
      "content_type": "competitive_research|earnings_call|press_release|analyst_report|reddit_discussion|youtube_review|twitter_thread|instagram_post|tiktok_video",
      "bias_indicators": "low|medium|high",
      "cross_references": 2,
      "confidence_level": "high|medium|low",
      "supporting_evidence": "Specific data points or context",
      "real_time_indicators": ["recent_announcement", "market_movement", "social_engagement", "viral_content"],
      "brand_mention_type": "direct_comparison|market_positioning|strategic_move",
      "sentiment_direction": "positive|negative|neutral",
      "influence_weight": 0.8,
      "strategic_relevance": "market_share|pricing|product_launch|expansion",
      "actionability_score": 8,
      "geographic_scope": "global|regional|local",
      "time_sensitivity": "immediate|quarterly|annual",
      "tags": ["competitive_analysis", "luxury_hospitality", "service_quality"],
      "social_media_metrics": {
        "engagement_score": 8,
        "community_consensus": "high|medium|low",
        "viral_potential": "high|medium|low",
        "user_credibility": "verified|unverified|influencer"
      }
    }
  ],
  "extraction_metadata": {
    "total_claims_found": 1,
    "high_impact_claims": 1,
    "source_diversity_score": 7,
    "recency_score": 6,
    "deduplication_applied": true,
    "extraction_timestamp": "${new Date().toISOString()}",
    "social_media_sources": 1,
    "traditional_sources": 0
  }
}

Focus on finding the most accurate and comprehensive metadata for this specific source.`,
    },
  };

  return researchRequest;
});

// Return research requests for processing
return [
  {
    json: {
      source_research_requests: sourceResearchResults,
      original_data: originalData,
      research_metadata: {
        total_sources: sourceExtractionPrompts.length,
        research_timestamp: new Date().toISOString(),
        prd_version: "2.0",
        research_type: "real_time_source_analysis",
      },
    },
  },
];
