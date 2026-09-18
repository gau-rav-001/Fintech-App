const { 
  solveFinancialMath, 
  getFrequentFinanceResponse, 
  getInstantCasualResponse, 
  generateSuggestedPrompts 
} = require("../ai/brain/financialBrain.js");

function solveFinancialQuery(q) {
  const math = solveFinancialMath(q);
  if (math) return { text: math };
  const faq = getFrequentFinanceResponse(q);
  if (faq) return { text: faq };
  const casual = getInstantCasualResponse(q);
  if (casual) return { text: casual };
  return null;
}

const testQueries = [
  "How to reach 1 Cr in 10 years at 12%?",
  "10 saal me 50 lakh banane ke liye kitna SIP lagega at 12%",
  "1 Cr in 20 years at 6% inflation",
  "50 30 20 budget for ₹80,000 salary",
  "SGB vs physical gold",
  "Debt avalanche vs debt snowball",
  "Active vs index funds",
  "New vs old tax regime comparison",
  "hello, how are you?"
];

console.log("=== RUNNING ADVANCED FINANCIAL BRAIN OFFLINE TEST ===");

let passed = 0;
for (const q of testQueries) {
  const t0 = performance.now();
  const res = solveFinancialQuery(q);
  const t1 = performance.now();
  
  if (res && res.text) {
    passed++;
    const suggestions = generateSuggestedPrompts(q, res.text);
    console.log(`\n✅ Query: "${q}" (${(t1 - t0).toFixed(2)}ms) [0 tokens/API]`);
    console.log(`Response preview: ${res.text.slice(0, 100).replace(/\n/g, ' ')}...`);
    console.log(`Suggested Follow-ups:`, suggestions);
  } else {
    console.log(`\n❌ Failed query: "${q}"`);
  }
}

console.log(`\n========================================`);
console.log(`Test complete: ${passed}/${testQueries.length} passed.`);
if (passed === testQueries.length) {
  console.log("ALL TESTS PASSED WITH 0 API CALLS! 🚀");
}
