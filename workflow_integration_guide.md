# Sentaiment PRD v2.0 Integration Guide

## Workflow Integration Points

### Current Flow:

```
Prompt 32 Request → Merge → Format Prompt 32 → Prompt 32 Formatter → Citation Formater
```

### Enhanced Flow with Sentaiment PRD v2.0:

```
Prompt 32 Request → Source Detail Extractor → Source Research Node → Merge → Enhanced Citation Formater
```

## Node Integration Steps

### 1. Add Source Detail Extractor Node

- **Position**: After "Prompt 32 Request - Claude" (Node ID: 06891aad-65f1-4dd1-9b30-1c856ef81a44)
- **Type**: Code Node
- **File**: `nodes/source_detail_extractor.js`
- **Purpose**: Extract source references from competitive analysis data

### 2. Add Source Research Node

- **Position**: After Source Detail Extractor
- **Type**: Code Node
- **File**: `nodes/source_research_node.js`
- **Purpose**: Research specific sources for detailed metadata

### 3. Add Source Research Request Node

- **Position**: After Source Research Node
- **Type**: HTTP Request Node
- **Purpose**: Send research requests to Claude API
- **Configuration**:
  ```json
  {
    "method": "POST",
    "url": "https://api.anthropic.com/v1/messages",
    "authentication": "predefinedCredentialType",
    "nodeCredentialType": "anthropicApi",
    "jsonBody": "={{ JSON.stringify({
      \"model\": \"claude-3-5-sonnet-20240620\",
      \"max_tokens\": 4000,
      \"temperature\": 0.1,
      \"system\": $json.research_prompt.system_content,
      \"messages\": [
        { \"role\": \"user\", \"content\": $json.research_prompt.user_content }
      ]
    }) }}"
  }
  ```

### 4. Replace Citation Formater

- **Position**: Replace existing "Citation Formater" node
- **Type**: Code Node
- **File**: `nodes/enhanced_citation_formater.js`
- **Purpose**: Process citations with Sentaiment PRD v2.0 schema

## Data Flow

### Input Data Structure

```json
{
  "scenarios": [
    {
      "scenario_id": 1,
      "title": "Luxury Suite Service",
      "sources": ["Forbes Travel Guide 2023", "TripAdvisor reviews"],
      "key_findings": ["..."]
    }
  ]
}
```

### Output Data Structure (Sentaiment PRD v2.0)

```json
{
  "enhanced_citations": [
    {
      "claim_text": "Wynn Las Vegas maintains service leadership",
      "claim_category": "competitive_analysis",
      "claim_impact_score": 7,
      "source_type": "web_research",
      "source_url": "https://www.forbestravelguide.com/hotels/wynn-las-vegas",
      "source_domain": "forbestravelguide.com",
      "publication_date": "2023-01-15",
      "author": "Forbes Travel Guide",
      "author_credibility_score": 9,
      "source_origin": "real_time_search",
      "authority_score": 9,
      "verification_status": "verified",
      "content_type": "competitive_research",
      "bias_indicators": "low",
      "cross_references": 3,
      "confidence_level": "high",
      "supporting_evidence": "Forbes Five-Star rating",
      "real_time_indicators": ["recent_announcement"],
      "brand_mention_type": "direct_comparison",
      "sentiment_direction": "positive",
      "influence_weight": 0.9,
      "strategic_relevance": "service_quality",
      "actionability_score": 8,
      "geographic_scope": "regional",
      "time_sensitivity": "quarterly",
      "tags": ["competitive_analysis", "luxury_hospitality", "service_quality"]
    }
  ],
  "enhanced_sources": [...],
  "quality_metrics": {
    "total_citations": 25,
    "verified_citations": 20,
    "high_authority_citations": 15,
    "average_authority_score": 7.8
  }
}
```

## Key Features Implemented

### 1. Comprehensive Source Tracking

- ✅ Source type classification
- ✅ Origin detection (training vs real-time)
- ✅ Authority scoring (1-10)
- ✅ Publication dates and authors
- ✅ Verification status

### 2. Enhanced Metadata

- ✅ Influence weight calculation
- ✅ Bias indicators
- ✅ Cross-reference tracking
- ✅ Confidence levels
- ✅ Strategic relevance scoring

### 3. Quality Metrics

- ✅ Source diversity scoring
- ✅ Recency analysis
- ✅ Authority distribution
- ✅ Verification rates

### 4. Sentaiment PRD Compliance

- ✅ JSON schema validation
- ✅ Provider integration ready
- ✅ OpenRouter compatible
- ✅ Comprehensive source attribution

## Testing Checklist

- [ ] Source Detail Extractor processes all scenario sources
- [ ] Source Research Node generates valid research requests
- [ ] Enhanced Citation Formater follows Sentaiment PRD schema
- [ ] Quality metrics are calculated correctly
- [ ] All citations include required metadata fields
- [ ] Origin detection works for different source types
- [ ] Authority scoring is consistent and accurate

## Next Steps

1. **Integrate nodes** into your n8n workflow
2. **Test with sample data** to verify schema compliance
3. **Add web scraping** for additional source verification
4. **Implement validation** middleware for schema compliance
5. **Add monitoring** for quality metrics and error handling
