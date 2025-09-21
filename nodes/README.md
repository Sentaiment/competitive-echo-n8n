# Competitive Echo n8n Workflow Nodes Documentation

This document provides detailed information about each node in the Competitive Echo n8n workflow, including their purpose, inputs, outputs, and functionality.

## Table of Contents

1. [003_parseGroupData.js](#003_parsegroupdatajs)
2. [004_researchAdditionalCompetitors.js](#004_researchadditionalcompetitorsjs)
3. [005_competitorResearchRequest-http.js](#005_competitorresearchrequest-httpjs)
4. [006_mergeCompetitorResearch.js](#006_mergecompetitorresearchjs)
5. [007_preparePrompt31.js](#007_prepareprompt31js)
6. [008_prompt31Request-http.js](#008_prompt31request-httpjs)
7. [009_parsePrompt31.js](#009_parseprompt31js)
8. [011_prompt32Request-http.js](#011_prompt32request-httpjs)
9. [012_formatPrompt32.js](#012_formatprompt32js)
10. [013_prompt32Formatter.js](#013_prompt32formatterjs)
11. [014b_prompt32CitationRequest-http.js](#014b_prompt32citationrequest-httpjs)
12. [015a_sourceDetailExtractor.js](#015a_sourcedetailextractorjs)
13. [015b_sourceResearch.js](#015b_sourceresearchjs)
14. [015c_LLMResearch.js](#015c_llmresearchjs)
15. [015d_enhancedDataMerger.js](#015d_enhanceddatamergerjs)
16. [016_citationFormater.js](#016_citationformaterjs)

---

## 003_parseGroupData.js

**Purpose:** Parse and extract brand information from CSV data, specifically designed for Wynn Las Vegas data structure.

**Input:**

- CSV data from upstream nodes containing brand information
- Expects rows with "Table name" and "Record data" columns

**Output:**

```json
{
  "company": "string",
  "competitors": ["array of strings"],
  "industry": "string",
  "domain": "string",
  "positioning": "string",
  "description": "string",
  "voice": "string",
  "values": "string",
  "whitelist": ["array of unique brands"],
  "business_context": {
    "industry_type": "string",
    "positioning_statement": "string",
    "brand_description": "string",
    "brand_voice": "string",
    "brand_values": "string",
    "competitive_set": ["array"],
    "market_focus": "string"
  },
  "debug_info": {
    "found_brands_row": boolean,
    "parsed_successfully": boolean,
    "total_rows_processed": number
  }
}
```

**Key Features:**

- Handles BOM (Byte Order Mark) characters in CSV headers
- Extracts brand data from JSON record data
- Creates comprehensive business context for scenario generation
- Normalizes and validates brand information
- Generates competitor whitelist for analysis

**Error Handling:**

- Validates presence of brands row
- Handles JSON parsing errors
- Provides detailed error messages for debugging

---

## 004_researchAdditionalCompetitors.js

**Purpose:** Determine if additional competitor research is needed and generate research prompts when competitor count is below threshold.

**Input:**

- Brand data from previous node containing company, competitors, and industry information

**Output:**

```json
{
  // All original input data preserved
  "competitor_research_needed": boolean,
  "research_prompt": {
    "system_content": "string",
    "user_content": "string"
  }
}
```

**Key Features:**

- Checks if current competitors meet minimum threshold (10 competitors)
- Only generates research prompt if additional competitors are needed
- Creates structured prompts for AI competitor research
- Preserves all original data for downstream processing

**Logic:**

- If competitors ≥ 10: Returns original data unchanged
- If competitors < 10: Generates research prompt for AI to find additional competitors

---

## 005_competitorResearchRequest-http.js

**Purpose:** HTTP request template for competitor research using Claude 3.5 Sonnet.

**Input:**

- Research prompt data from previous node

**Output:**

- HTTP request payload for Claude API

**Configuration:**

```json
{
  "model": "claude-3-5-sonnet-20240620",
  "max_tokens": 2000,
  "temperature": 0.1,
  "system": "$json.research_prompt.system_content",
  "messages": [
    {
      "role": "user",
      "content": "$json.research_prompt.user_content"
    }
  ]
}
```

**Key Features:**

- Low temperature (0.1) for factual, consistent responses
- Moderate token limit (2000) for competitor research
- Dynamic prompt injection from upstream node

---

## 006_mergeCompetitorResearch.js

**Purpose:** Parse competitor research results and merge them with original brand data.

**Input:**

- Original brand data (from first input)
- AI research response (from last input)

**Output:**

```json
{
  // All original brand data preserved
  "competitors": ["expanded array with researched competitors"],
  "competitor_research": {
    "original_count": number,
    "researched_count": number,
    "total_count": number,
    "research_metadata": {},
    "additional_competitors": []
  }
}
```

**Key Features:**

- Handles multiple AI response formats (Claude, OpenAI, raw strings)
- Robust JSON extraction with fallback mechanisms
- Duplicate competitor prevention
- Comprehensive error handling with graceful fallbacks
- Detailed logging for debugging

**Error Recovery:**

- Returns original data with error message if parsing fails
- Maintains workflow continuity even with malformed responses

---

## 007_preparePrompt31.js

**Purpose:** Generate dynamic competitive analysis scenarios based on industry context and brand positioning.

**Input:**

- Brand data with company, competitors, industry, positioning, description, values

**Output:**

```json
{
  "system_content": "string",
  "user_content": "string",
  "whitelist": ["array of allowed brands"],
  "business_context": {
    "industry": "string",
    "positioning": "string",
    "contextual_focus": "string",
    "brand_themes": ["array of extracted themes"]
  }
}
```

**Key Features:**

- **Industry Adaptation:** Generates context-specific scenarios for:
  - Hotels & Resorts (luxury hospitality focus)
  - Restaurants (dining experience focus)
  - Retail (shopping experience focus)
  - Technology (platform selection focus)
  - Generic business (fallback context)
- **Theme Extraction:** Identifies key themes from positioning and values
- **Dynamic Context:** Adapts decision factors and scenario types to industry
- **Strict Competitor Policy:** Ensures all scenarios include only whitelisted brands

**Scenario Generation:**

- 12 scenarios with specific dimension distribution
- Functional competence (scenarios 1-5)
- Identity values (scenarios 6-9)
- Market leadership (scenarios 10-12)

---

## 008_prompt31Request-http.js

**Purpose:** HTTP request template for scenario generation using Claude 3.5 Sonnet.

**Input:**

- Prompt data from preparePrompt31 node

**Output:**

- HTTP request payload for Claude API

**Configuration:**

```json
{
  "model": "claude-3-5-sonnet-20240620",
  "max_tokens": 6000,
  "temperature": 0.2,
  "system": "$json.system_content",
  "messages": [
    {
      "role": "user",
      "content": "$json.user_content"
    }
  ]
}
```

**Key Features:**

- Higher token limit (6000) for generating 12 detailed scenarios
- Slightly higher temperature (0.2) for creative scenario generation
- Dynamic content injection from prompt preparation node

---

## 009_parsePrompt31.js

**Purpose:** Extract and validate JSON scenarios from AI response with robust parsing.

**Input:**

- AI response containing scenario generation results

**Output:**

```json
{
  "scenarios": [
    {
      "scenario_id": number,
      "scenario_title": "string",
      "user_query": "string",
      "dimension": "string",
      "rationale": "string",
      "expected_metrics": [],
      "data_limitations": [],
      "confidence_score": null
    }
  ],
  "source_citations": []
}
```

**Key Features:**

- **Multi-format Support:** Handles Anthropic Messages, raw HTTP, OpenAI formats
- **JSON Extraction:** Finds content between `<<JSON_START>>` and `<<JSON_END>>` markers
- **Code Fence Removal:** Strips accidental markdown formatting
- **Control Character Cleaning:** Removes problematic characters
- **Schema Validation:** Ensures exactly 12 scenarios with proper structure

**Error Handling:**

- Clear error messages with first 300 characters when markers missing
- Multiple parsing attempts with fallbacks
- Validation of expected array structure

---

## 011_prompt32Request-http.js

**Purpose:** HTTP request template for competitive analysis using Claude 3.7 Sonnet.

**Input:**

- Individual scenario data with title, query, and whitelist

**Output:**

- HTTP request payload for Claude API

**Configuration:**

```json
{
  "model": "claude-3-7-sonnet-20250219",
  "max_tokens": 7500,
  "temperature": 0.2,
  "system": "competitive intelligence analyst prompt",
  "messages": [
    {
      "role": "user",
      "content": "dynamic competitive analysis request"
    }
  ]
}
```

**Key Features:**

- **Latest Model:** Claude 3.7 Sonnet for enhanced analysis capabilities
- **High Token Limit:** 7500 tokens for detailed competitive analysis
- **Comprehensive Analysis:** Requests rankings, scores, and detailed analysis
- **Dual Source Requirements:** Mandates both traditional business and social media sources
- **Specific Competitor Focus:** Enforces whitelist compliance

**Source Requirements:**

- Traditional: Forbes, industry reports, business publications, analyst reports
- Social Media: Reddit, YouTube, Twitter, Instagram, TikTok, Facebook, Quora, Medium
- Exact URL requirements for specific posts, not general sites
- Minimum 3-5 traditional + 2-3 social media sources

---

## 012_formatPrompt32.js

**Purpose:** Process and format competitive analysis responses with updated allowlist policy.

**Input:**

- Multiple competitive analysis responses from AI

**Output:**

```json
{
  "scenarios_completed": number,
  "results": [
    {
      "scenario_id": number,
      "scenario_title": "string",
      "response_text": "string",
      "tokens_used": number,
      "model": "string",
      "timestamp": "string",
      "allowlist_audit": {
        "allowed_urls": ["array"],
        "blocked_urls": ["array"],
        "explicit_allowlist_size": number,
        "policy": "allow_all_domains"
      }
    }
  ]
}
```

**Key Features:**

- **Updated Allowlist Policy:** All domains now allowed (explicit allowlist maintained for reference)
- **Robust Response Processing:** Handles multiple input formats (Claude, pre-formatted, raw strings)
- **Citation Normalization:** Processes source citations with proper validation
- **URL Extraction:** Finds and audits URLs in both JSON and text content
- **Comprehensive Logging:** Detailed allowlist audit information

**Allowlist Management:**

- Explicit allowlist maintained for tracking purposes
- All valid domains allowed regardless of allowlist status
- Comprehensive logging of domain decisions

---

## 013_prompt32Formatter.js

**Purpose:** Convert competitive analysis responses into merge-compatible structured format.

**Input:**

- Formatted competitive analysis results from previous node

**Output:**

```json
{
  "scenario_rankings": [
    {
      "scenario_id": number,
      "scenario_title": "string",
      "scenario_description": "string",
      "dimension": "string",
      "user_query": "string",
      "competitors_ranked": [
        {
          "company": "string",
          "score": number,
          "rationale": "string"
        }
      ],
      "analysis_details": {
        "Company Name": {
          "summary": "string",
          "highlights": ["array"],
          "metrics": {}
        }
      },
      "key_findings": ["array"],
      "response_text": "string",
      "model": "string",
      "tokens_used": number,
      "timestamp": "string"
    }
  ],
  "data_sources": ["array"],
  "source_citations": ["array"],
  "summary_stats": {
    "total_scenarios": number,
    "scenarios_with_rankings": number,
    "scenarios_with_analysis": number,
    "scenarios_with_titles": number,
    "scenarios_with_descriptions": number,
    "total_sources": number,
    "total_citations": number,
    "processing_timestamp": "string"
  },
  "company": "string",
  "processing_type": "prompt_32_formatter"
}
```

**Key Features:**

- **Robust JSON Extraction:** Multiple methods for extracting JSON from AI responses
- **Aggressive Cleaning:** Fixes malformed JSON patterns, backslashes, commas
- **Direct String Extraction:** Fallback method for problematic scenarios
- **Comprehensive Error Handling:** Graceful fallbacks for parsing failures
- **Detailed Logging:** Extensive debug information for troubleshooting

**Data Processing:**

- Extracts competitor rankings with scores and rationales
- Processes analysis details with summaries and highlights
- Collects and aggregates all sources and citations
- Generates comprehensive summary statistics

**Error Recovery:**

- Scenario-specific handling for problematic responses
- Multiple parsing attempts (JSON → string extraction → fallback)
- Preserves original response text for debugging
- Creates fallback data to ensure no scenarios are lost

---

## Workflow Flow

```
003_parseGroupData → 004_researchAdditionalCompetitors → 005_competitorResearchRequest-http
                                                        ↓
007_preparePrompt31 → 008_prompt31Request-http → 009_parsePrompt31
                                                           ↓
                                011_prompt32Request-http → 012_formatPrompt32 → 013_prompt32Formatter
```

## 015a_sourceDetailExtractor.js

**Purpose:** Extract granular source details from competitive analysis data implementing Sentaiment PRD v2.0 source citation system.

**Input:**

- Competitive analysis data from various workflow stages (scenario rankings, formatted results, etc.)

**Output:**

```json
{
  "source_extraction_prompts": [
    {
      "source_id": "string",
      "source_name": "string",
      "source_url": "string",
      "source_domain": "string",
      "publication_date": "string",
      "author": "string",
      "scenarios_used": ["array"],
      "context": ["array"],
      "citation_data": {},
      "source_type": "string",
      "extraction_prompt": {
        "system_content": "string",
        "user_content": "string"
      }
    }
  ],
  "original_data": {},
  "extraction_metadata": {
    "total_sources": number,
    "total_scenarios": number,
    "total_source_references": number,
    "data_extraction_run_timestamp": "string",
    "prd_version": "2.0",
    "source_types": {},
    "scenarios_processed": []
  }
}
```

**Key Features:**

- **Multi-format Input Support:** Handles scenario rankings, results arrays, single scenarios, and Claude responses
- **Intelligent Source Detection:** Extracts sources from multiple data structures (sources arrays, analysis details, response text)
- **Source Type Classification:** Automatically categorizes sources (industry guides, review platforms, social media, etc.)
- **URL and Domain Extraction:** Intelligently extracts URLs and domains from source references
- **Deduplication Logic:** Removes duplicate sources while preserving most complete version
- **Comprehensive Logging:** Detailed debugging information for troubleshooting

**Source Type Detection:**

- Industry guides (Forbes, J.D. Power, AAA Diamond)
- Review platforms (TripAdvisor, Yelp, Google Reviews)
- Social media (Reddit, Twitter, Instagram, Facebook, TikTok)
- Video content (YouTube, Vimeo)
- News and media (Review-Journal, CNN, BBC, Reuters)
- Company sources (Annual reports, press releases, company websites)
- Academic and research sources
- Government and regulatory sources

---

## 015b_sourceResearch.js

**Purpose:** Generate research requests for real-time source analysis following Sentaiment PRD v2.0 standards.

**Input:**

- Source extraction prompts from sourceDetailExtractor node

**Output:**

```json
{
  "source_research_requests": [
    {
      "source_id": "string",
      "source_name": "string",
      "scenarios_used": ["array"],
      "research_prompt": {
        "system_content": "string",
        "user_content": "string"
      }
    }
  ],
  "original_data": {},
  "research_metadata": {
    "total_sources": number,
    "research_timestamp": "string",
    "prd_version": "2.0",
    "research_type": "real_time_source_analysis"
  }
}
```

**Key Features:**

- **Structured Research Requests:** Creates comprehensive prompts for each source
- **PRD v2.0 Compliance:** Follows Sentaiment Product Requirements Document standards
- **Comprehensive Metadata Extraction:** Requests authority scores, verification status, bias indicators
- **Strategic Focus:** Emphasizes actionability scores and strategic relevance
- **Quality Metrics:** Includes diversity scores, recency assessments, and confidence levels

---

## 015c_LLMResearch.js

**Purpose:** Process source research requests and generate comprehensive source metadata using LLM analysis.

**Input:**

- Source research requests from sourceResearch node

**Output:**

```json
{
  "source_research_results": [
    {
      "source_citations": [
        {
          "claim_text": "string",
          "claim_category": "competitive_analysis",
          "claim_impact_score": number,
          "source_type": "string",
          "source_url": "string",
          "source_domain": "string",
          "publication_date": "string",
          "author": "string",
          "author_credibility_score": number,
          "source_origin": "string",
          "training_data_cutoff": "string",
          "authority_score": number,
          "verification_status": "string",
          "content_type": "string",
          "bias_indicators": "string",
          "cross_references": number,
          "confidence_level": "string",
          "supporting_evidence": "string",
          "real_time_indicators": ["array"],
          "brand_mention_type": "string",
          "sentiment_direction": "string",
          "influence_weight": number,
          "strategic_relevance": "string",
          "actionability_score": number,
          "geographic_scope": "string",
          "time_sensitivity": "string",
          "tags": ["array"]
        }
      ],
      "extraction_metadata": {},
      "source_id": "string",
      "source_name": "string",
      "scenarios_used": ["array"],
      "research_prompt": "string"
    }
  ],
  "research_metadata": {
    "total_sources_processed": number,
    "successful_researches": number,
    "failed_researches": number,
    "research_timestamp": "string",
    "prd_version": "2.0"
  }
}
```

**Key Features:**

- **Comprehensive Source Analysis:** Extracts detailed metadata for each source
- **Quality Scoring:** Provides authority scores, credibility ratings, and confidence levels
- **Strategic Assessment:** Calculates actionability scores and strategic relevance
- **Error Handling:** Graceful fallback for failed research attempts
- **Mock Response Support:** Includes mock responses for testing (can be replaced with actual API calls)
- **Detailed Logging:** Comprehensive processing information for debugging

---

## 015d_enhancedDataMerger.js

**Purpose:** Merge data from multiple workflow branches implementing Sentaiment PRD v2.0 data merging standards.

**Input:**

- Multiple inputs from different workflow branches (original citations, source research, enhanced citations)

**Output:**

```json
{
  "source_citations": ["array of citation objects"],
  "source_research_data": {},
  "extraction_metadata": {
    "total_claims_found": number,
    "high_impact_claims": number,
    "source_diversity_score": number,
    "recency_score": number,
    "deduplication_applied": boolean,
    "extraction_timestamp": "string"
  },
  "merge_source": "string",
  "merge_metadata": {
    "merge_timestamp": "string",
    "input_count": number,
    "has_original_citations": boolean,
    "has_source_research": boolean,
    "has_enhanced_citations": boolean,
    "prd_version": "2.0"
  }
}
```

**Key Features:**

- **Intelligent Merge Strategy:** Automatically determines merge approach based on available data types
- **Multi-source Support:** Handles original citations, source research results, and enhanced citation data
- **Data Preservation:** Maintains all original data while creating merged structure
- **Comprehensive Logging:** Detailed debugging information for merge process
- **Error Handling:** Graceful handling of unrecognizable data formats
- **Metadata Tracking:** Complete audit trail of merge process

---

## 016_citationFormater.js

**Purpose:** Parse and format citation data from Claude API responses and direct citation arrays.

**Input:**

- Multiple inputs containing citation data (Claude responses, direct citation arrays)

**Output:**

```json
{
  "enhanced_citations": [
    {
      "claim_text": "string",
      "claim_category": "competitive_analysis",
      "claim_impact_score": number,
      "source_type": "string",
      "source_url": "string",
      "source_domain": "string",
      "publication_date": "string",
      "author": "string",
      "author_credibility_score": number,
      "source_origin": "string",
      "training_data_cutoff": "string",
      "authority_score": number,
      "verification_status": "string",
      "content_type": "string",
      "bias_indicators": "string",
      "cross_references": number,
      "confidence_level": "string",
      "supporting_evidence": "string",
      "real_time_indicators": ["array"],
      "brand_mention_type": "string",
      "sentiment_direction": "string",
      "influence_weight": number,
      "strategic_relevance": "string",
      "actionability_score": number,
      "geographic_scope": "string",
      "time_sensitivity": "string",
      "tags": ["array"]
    }
  ],
  "processing_metadata": {
    "total_citations": number,
    "processing_timestamp": "string",
    "source": "citation_formater_fixed"
  }
}
```

**Key Features:**

- **Multi-format Parsing:** Handles Claude API responses and direct citation arrays
- **JSON Extraction:** Intelligently extracts JSON from Claude response text
- **Error Handling:** Graceful fallback for parsing errors
- **Citation Aggregation:** Combines citations from multiple input sources
- **Comprehensive Logging:** Detailed processing information for debugging
- **Metadata Preservation:** Maintains processing timestamps and source information

**Input Handling:**

- Claude API response format with content arrays
- Direct citation arrays in source_citations field
- JSON extraction from response text using regex patterns
- Error handling for malformed responses

## Notes

- All nodes include comprehensive error handling and logging
- Data is preserved and passed through the workflow chain
- Each node can operate independently with proper input validation
- The workflow supports both single and batch processing of scenarios
- All timestamps and metadata are preserved for audit trails

---

_Last Updated: [Current Date]_
_Total Nodes Documented: 10_
