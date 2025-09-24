// Parse & Group Data for generic Brands CSV structure
const rows = $input.all().map((i) => i.json);

console.log("=== PROCESSING BRAND DATA ===");
console.log("Total rows:", rows.length);

// Helper functions
const norm = (s) => (s == null ? "" : String(s).trim());
const cleanDomain = (u = "") =>
  norm(u)
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .split("/")[0] || null;

// Find the Brands row - handle BOM character in column name
const brandsRow = rows.find((row) => {
  // Check both possible column names (with and without BOM)
  const tableName1 = row["Table name"] || "";
  const tableName2 = row["﻿Table name"] || ""; // BOM character version

  return (
    String(tableName1).toLowerCase() === "brands" ||
    String(tableName2).toLowerCase() === "brands"
  );
});

if (!brandsRow) {
  throw new Error(
    `No brands row found. Available table names: ${rows
      .map((r) => r["Table name"] || r["﻿Table name"])
      .join(", ")}`
  );
}

console.log("Found brands row:", brandsRow);

// Get the record data - handle both column name variations
const recordDataRaw = brandsRow["Record data"] || brandsRow["﻿Record data"];

if (!recordDataRaw) {
  throw new Error("No record data found in brands row");
}

// Parse the JSON record data
let brandData;
try {
  brandData =
    typeof recordDataRaw === "string"
      ? JSON.parse(recordDataRaw)
      : recordDataRaw;
} catch (e) {
  throw new Error(`Failed to parse brands record data: ${e.message}`);
}

console.log("Parsed brand data:", brandData);

// Extract the brand information
const company = norm(brandData.name) || null;
const competitors = Array.isArray(brandData.competitors)
  ? brandData.competitors.map(norm).filter(Boolean)
  : [];
const industry = norm(brandData.industry) || null;
const domain = cleanDomain(brandData.brand_url || "");
const positioning = norm(brandData.positioning) || null;
const description = norm(brandData.description) || null;
const voice = norm(brandData.voice) || null;
const values = norm(brandData.values) || null;

// Create comprehensive whitelist
const whitelist = Array.from(
  new Set([company, ...competitors].filter(Boolean))
);

console.log("Extracted data:");
console.log("- Company:", company);
console.log("- Competitors:", competitors);
console.log("- Industry:", industry);
console.log("- Whitelist:", whitelist);

// Store company name in workflow context for later use
try {
  if (typeof $workflow !== "undefined") {
    $workflow.context = $workflow.context || {};
    $workflow.context.target_company = company;
    console.log("Stored company in workflow context:", company);
    console.log("Workflow context after setting:", $workflow.context);
  } else {
    console.log("$workflow not available in 003_parseGroupData");
  }
} catch (e) {
  console.log("Could not store company in workflow context:", e.message);
}

// Build enhanced context for dynamic scenario generation
const businessContext = {
  industry_type: industry,
  positioning_statement: positioning,
  brand_description: description,
  brand_voice: voice,
  brand_values: values,
  competitive_set: whitelist,
  market_focus: null,
};

return [
  {
    json: {
      company,
      competitors,
      industry,
      domain,
      positioning,
      description,
      voice,
      values,
      whitelist,
      business_context: businessContext,
      // Keep original data for debugging
      debug_info: {
        found_brands_row: true,
        parsed_successfully: true,
        total_rows_processed: rows.length,
      },
    },
  },
];
