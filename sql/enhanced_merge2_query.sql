-- Enhanced Merge2 SQL Query for Sentaiment PRD v2.0
-- Merges original citation data with source research data

-- Create a CTE to normalize all input data
WITH normalized_inputs AS (
  SELECT 
    'original_citations' as data_type,
    json_extract(json, '$.source_citations') as citations,
    json_extract(json, '$.citations') as alt_citations,
    json_extract(json, '$.data_sources') as sources,
    json_extract(json, '$.scenarios') as scenarios,
    json_extract(json, '$.company') as company,
    json_extract(json, '$.industry') as industry,
    json as raw_data
  FROM json_each('[{}]') -- This will be replaced with actual input data
  
  UNION ALL
  
  SELECT 
    'source_research' as data_type,
    NULL as citations,
    NULL as alt_citations,
    NULL as sources,
    NULL as scenarios,
    json_extract(json, '$.original_data.company') as company,
    json_extract(json, '$.original_data.industry') as industry,
    json as raw_data
  FROM json_each('[{}]') -- This will be replaced with actual input data
  
  UNION ALL
  
  SELECT 
    'enhanced_citations' as data_type,
    json_extract(json, '$.enhanced_citations') as citations,
    NULL as alt_citations,
    json_extract(json, '$.enhanced_sources') as sources,
    NULL as scenarios,
    json_extract(json, '$.original_data.company') as company,
    json_extract(json, '$.original_data.industry') as industry,
    json as raw_data
  FROM json_each('[{}]') -- This will be replaced with actual input data
),

-- Extract and flatten citations
flattened_citations AS (
  SELECT 
    data_type,
    company,
    industry,
    json_extract(citation.value, '$.claim_text') as claim_text,
    json_extract(citation.value, '$.claim_category') as claim_category,
    json_extract(citation.value, '$.claim_impact_score') as claim_impact_score,
    json_extract(citation.value, '$.source_type') as source_type,
    json_extract(citation.value, '$.source_url') as source_url,
    json_extract(citation.value, '$.source_domain') as source_domain,
    json_extract(citation.value, '$.publication_date') as publication_date,
    json_extract(citation.value, '$.author') as author,
    json_extract(citation.value, '$.author_credibility_score') as author_credibility_score,
    json_extract(citation.value, '$.source_origin') as source_origin,
    json_extract(citation.value, '$.training_data_cutoff') as training_data_cutoff,
    json_extract(citation.value, '$.authority_score') as authority_score,
    json_extract(citation.value, '$.verification_status') as verification_status,
    json_extract(citation.value, '$.content_type') as content_type,
    json_extract(citation.value, '$.bias_indicators') as bias_indicators,
    json_extract(citation.value, '$.cross_references') as cross_references,
    json_extract(citation.value, '$.confidence_level') as confidence_level,
    json_extract(citation.value, '$.supporting_evidence') as supporting_evidence,
    json_extract(citation.value, '$.real_time_indicators') as real_time_indicators,
    json_extract(citation.value, '$.brand_mention_type') as brand_mention_type,
    json_extract(citation.value, '$.sentiment_direction') as sentiment_direction,
    json_extract(citation.value, '$.influence_weight') as influence_weight,
    json_extract(citation.value, '$.strategic_relevance') as strategic_relevance,
    json_extract(citation.value, '$.actionability_score') as actionability_score,
    json_extract(citation.value, '$.geographic_scope') as geographic_scope,
    json_extract(citation.value, '$.time_sensitivity') as time_sensitivity,
    json_extract(citation.value, '$.tags') as tags,
    json_extract(citation.value, '$.citation_id') as citation_id,
    json_extract(citation.value, '$.processing_timestamp') as processing_timestamp,
    json_extract(citation.value, '$.prd_version') as prd_version
  FROM normalized_inputs
  CROSS JOIN json_each(COALESCE(citations, alt_citations, '[]'))
  WHERE citations IS NOT NULL OR alt_citations IS NOT NULL
),

-- Extract and flatten sources
flattened_sources AS (
  SELECT 
    data_type,
    company,
    industry,
    json_extract(source.value, '$.id') as source_id,
    json_extract(source.value, '$.source_name') as source_name,
    json_extract(source.value, '$.title') as title,
    json_extract(source.value, '$.publisher') as publisher,
    json_extract(source.value, '$.author') as author,
    json_extract(source.value, '$.published_date') as published_date,
    json_extract(source.value, '$.date_accessed') as date_accessed,
    json_extract(source.value, '$.authoritative') as authoritative,
    json_extract(source.value, '$.origin') as origin,
    json_extract(source.value, '$.origin_confidence') as origin_confidence,
    json_extract(source.value, '$.origin_notes') as origin_notes,
    json_extract(source.value, '$.authority_score') as authority_score,
    json_extract(source.value, '$.quality_score') as quality_score,
    json_extract(source.value, '$.prd_version') as prd_version
  FROM normalized_inputs
  CROSS JOIN json_each(COALESCE(sources, '[]'))
  WHERE sources IS NOT NULL
),

-- Calculate quality metrics
quality_metrics AS (
  SELECT 
    COUNT(DISTINCT citation_id) as total_citations,
    COUNT(DISTINCT CASE WHEN verification_status = 'verified' THEN citation_id END) as verified_citations,
    COUNT(DISTINCT CASE WHEN authority_score >= 8 THEN citation_id END) as high_authority_citations,
    COUNT(DISTINCT CASE WHEN source_url LIKE 'http%' THEN citation_id END) as citations_with_urls,
    AVG(COALESCE(authority_score, 5)) as average_authority_score,
    COUNT(DISTINCT publisher) as source_diversity_score,
    COUNT(DISTINCT CASE 
      WHEN publication_date IS NOT NULL 
        AND date(publication_date) > date('now', '-1 year') 
      THEN citation_id 
    END) * 10.0 / COUNT(DISTINCT citation_id) as recency_score
  FROM flattened_citations
),

-- Build the final merged result
merged_result AS (
  SELECT 
    json_object(
      'enhanced_citations', json_group_array(
        json_object(
          'claim_text', claim_text,
          'claim_category', COALESCE(claim_category, 'competitive_analysis'),
          'claim_impact_score', COALESCE(claim_impact_score, 5),
          'source_type', COALESCE(source_type, 'other'),
          'source_url', source_url,
          'source_domain', source_domain,
          'publication_date', publication_date,
          'author', COALESCE(author, 'Unknown'),
          'author_credibility_score', COALESCE(author_credibility_score, 5),
          'source_origin', COALESCE(source_origin, 'unknown'),
          'training_data_cutoff', COALESCE(training_data_cutoff, '2025-01'),
          'authority_score', COALESCE(authority_score, 5),
          'verification_status', COALESCE(verification_status, 'unverified'),
          'content_type', COALESCE(content_type, 'competitive_research'),
          'bias_indicators', COALESCE(bias_indicators, 'unknown'),
          'cross_references', COALESCE(cross_references, 0),
          'confidence_level', COALESCE(confidence_level, 'medium'),
          'supporting_evidence', COALESCE(supporting_evidence, 'No additional evidence provided'),
          'real_time_indicators', COALESCE(real_time_indicators, '[]'),
          'brand_mention_type', COALESCE(brand_mention_type, 'other'),
          'sentiment_direction', COALESCE(sentiment_direction, 'neutral'),
          'influence_weight', COALESCE(influence_weight, 0.5),
          'strategic_relevance', COALESCE(strategic_relevance, 'market_positioning'),
          'actionability_score', COALESCE(actionability_score, 5),
          'geographic_scope', COALESCE(geographic_scope, 'regional'),
          'time_sensitivity', COALESCE(time_sensitivity, 'quarterly'),
          'tags', COALESCE(tags, '["competitive_analysis"]'),
          'citation_id', COALESCE(citation_id, 'citation_' || row_number() OVER ()),
          'processing_timestamp', COALESCE(processing_timestamp, datetime('now')),
          'prd_version', COALESCE(prd_version, '2.0')
        )
      ),
      'enhanced_sources', json_group_array(
        json_object(
          'id', source_id,
          'source_name', source_name,
          'title', title,
          'publisher', publisher,
          'author', author,
          'published_date', published_date,
          'date_accessed', COALESCE(date_accessed, date('now')),
          'authoritative', COALESCE(authoritative, false),
          'origin', COALESCE(origin, 'unknown'),
          'origin_confidence', COALESCE(origin_confidence, 0.5),
          'origin_notes', origin_notes,
          'authority_score', COALESCE(authority_score, 5),
          'quality_score', COALESCE(quality_score, 5),
          'prd_version', COALESCE(prd_version, '2.0')
        )
      ),
      'quality_metrics', json_object(
        'total_citations', qm.total_citations,
        'verified_citations', qm.verified_citations,
        'high_authority_citations', qm.high_authority_citations,
        'citations_with_urls', qm.citations_with_urls,
        'average_authority_score', qm.average_authority_score,
        'source_diversity_score', qm.source_diversity_score,
        'recency_score', qm.recency_score
      ),
      'merge_metadata', json_object(
        'merge_timestamp', datetime('now'),
        'input_count', (SELECT COUNT(*) FROM normalized_inputs),
        'has_original_citations', (SELECT COUNT(*) FROM normalized_inputs WHERE data_type = 'original_citations'),
        'has_source_research', (SELECT COUNT(*) FROM normalized_inputs WHERE data_type = 'source_research'),
        'has_enhanced_citations', (SELECT COUNT(*) FROM normalized_inputs WHERE data_type = 'enhanced_citations'),
        'prd_version', '2.0'
      )
    ) as merged_data
  FROM flattened_citations
  CROSS JOIN quality_metrics qm
  GROUP BY 1
)

SELECT merged_data FROM merged_result;
