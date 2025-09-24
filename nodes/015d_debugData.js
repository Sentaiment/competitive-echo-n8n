// Debug Data Structure
// This node helps debug what data is being passed to the HTTP request

const inputData = $input.first().json;

console.log("=== DEBUG DATA STRUCTURE ===");
console.log("Full input data:", JSON.stringify(inputData, null, 2));
console.log("Keys:", Object.keys(inputData));
console.log("Has research_prompt:", !!inputData.research_prompt);
console.log("research_prompt type:", typeof inputData.research_prompt);

if (inputData.research_prompt) {
  console.log("research_prompt keys:", Object.keys(inputData.research_prompt));
  console.log(
    "Has system_content:",
    !!inputData.research_prompt.system_content
  );
  console.log("Has user_content:", !!inputData.research_prompt.user_content);
} else {
  console.log("❌ research_prompt is missing or undefined");
}

return [
  {
    json: {
      debug_info: {
        full_data: inputData,
        has_research_prompt: !!inputData.research_prompt,
        research_prompt_keys: inputData.research_prompt
          ? Object.keys(inputData.research_prompt)
          : [],
        system_content_exists: !!inputData.research_prompt?.system_content,
        user_content_exists: !!inputData.research_prompt?.user_content,
      },
    },
  },
];
