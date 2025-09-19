-- AlaSQL Merge Query for Sentaiment PRD v2.0
-- Compatible with n8n Merge node (uses AlaSQL, not SQLite)

-- Simple merge that combines data from both inputs
SELECT 
  input1.json as input1_data,
  input2.json as input2_data,
  {
    "enhanced_citations": COALESCE(input1.json.enhanced_citations, input2.json.source_citations, []),
    "enhanced_sources": COALESCE(input1.json.enhanced_sources, input2.json.data_sources, []),
    "quality_metrics": COALESCE(input1.json.quality_metrics, {
      "total_citations": COALESCE(input1.json.enhanced_citations.length, input2.json.source_citations.length, 0),
      "prd_version": "2.0"
    }),
    "merge_metadata": {
      "merge_timestamp": new Date().toISOString(),
      "prd_version": "2.0",
      "merge_source": "alasql_merge",
      "has_input1": input1.json ? true : false,
      "has_input2": input2.json ? true : false
    }
  } as merged_data
FROM input1
LEFT JOIN input2 ON 1=1;
