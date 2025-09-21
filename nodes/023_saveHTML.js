// Save HTML Report to File
const inputData = $json || {};

console.log("=== SAVING HTML REPORT ===");
console.log("Input data keys:", Object.keys(inputData));
console.log("Full input data:", inputData);

// Check for HTML content in different possible field names
const htmlReport =
  inputData.html_report ||
  inputData.note ||
  inputData.html ||
  inputData.content;
const company = inputData.company || "Unknown";
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const safeCompany = String(company).toLowerCase().replace(/\s+/g, "-");
const filename = `competitive-report-${safeCompany}-${timestamp}.html`;

if (!htmlReport) {
  console.error("No HTML report found in input data");
  console.error("Available keys:", Object.keys(inputData));
  return [
    {
      json: {
        error: "No HTML report to save",
        available_keys: Object.keys(inputData),
      },
    },
  ];
}

console.log("Saving HTML report as:", filename);
console.log("Report size:", htmlReport.length, "characters");

// Return the HTML content and filename for the next node to save
return [
  {
    json: {
      filename: filename,
      html_content: htmlReport,
      company: company,
      generated_at: inputData.generated_at,
      report_size: htmlReport.length,
    },
  },
];
