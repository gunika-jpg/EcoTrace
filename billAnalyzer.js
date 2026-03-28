// ============================================
// FEATURE 2: Smart Utility Bill Analyzer
// Send electricity/water bill to Gemini,
// get energy leaks + personalized savings plan
// ============================================

import fetch from "node-fetch";
import fs from "fs";
import dotenv from "dotenv";
dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

const BILL_PROMPT = `
You are an energy analyst for Indian households helping reduce electricity bills and carbon footprint.

Look at this electricity or water bill image and:
1. Extract the monthly usage (kWh for electricity, kiloliters for water)
2. Compare to Indian average (electricity: 90 kWh/month per person, water: 5 kL/month per person)
3. Identify any unusual spikes or "energy leaks"
4. Calculate the carbon footprint (India grid average: 0.82 kg CO2 per kWh)
5. Give a personalized 3-step savings plan

Respond ONLY with this exact JSON format, no other text:
{
  "bill_type": "electricity or water",
  "billing_period": "month/period",
  "usage_amount": 245,
  "usage_unit": "kWh",
  "bill_amount_inr": 1840,
  "carbon_kg": 200.9,
  "vs_india_average": "35% above average",
  "energy_leaks": [
    {
      "issue": "description of the spike or leak",
      "period": "when it happened",
      "impact": "estimated extra cost or CO2"
    }
  ],
  "savings_plan": [
    {
      "action": "specific action to take",
      "saves_inr_per_month": 200,
      "saves_co2_kg_per_month": 15,
      "difficulty": "easy/medium/hard"
    }
  ],
  "projected_annual_saving_inr": 2400,
  "projected_annual_co2_saving_kg": 180
}
`;

async function analyzeBill(imagePath) {
  console.log(`\n⚡ Analyzing bill: ${imagePath}`);
  console.log("⏳ Sending to Gemini AI...\n");

  const imageBuffer = fs.readFileSync(imagePath);
  const base64Image = imageBuffer.toString("base64");
  const ext = imagePath.split(".").pop().toLowerCase();
  const mimeType = ext === "png" ? "image/png" : "image/jpeg";

  const requestBody = {
    contents: [
      {
        parts: [
          { inline_data: { mime_type: mimeType, data: base64Image } },
          { text: BILL_PROMPT },
        ],
      },
    ],
  };

  try {
    const response = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();
    const rawText = data.candidates[0].content.parts[0].text;
    const cleanJson = rawText.replace(/```json|```/g, "").trim();
    const result = JSON.parse(cleanJson);

    displayBillResults(result);
    return result;
  } catch (error) {
    console.error("❌ Error analyzing bill:", error.message);
  }
}

function displayBillResults(data) {
  console.log("=".repeat(50));
  console.log(`⚡ Bill Type: ${data.bill_type.toUpperCase()}`);
  console.log(`📅 Period: ${data.billing_period}`);
  console.log(`📊 Usage: ${data.usage_amount} ${data.usage_unit}`);
  console.log(`💰 Amount: ₹${data.bill_amount_inr}`);
  console.log(`🌍 Carbon: ${data.carbon_kg} kg CO₂`);
  console.log(`📈 vs India avg: ${data.vs_india_average}`);

  if (data.energy_leaks.length > 0) {
    console.log("\n⚠️  ENERGY LEAKS DETECTED:");
    data.energy_leaks.forEach((leak) => {
      console.log(`   🔴 ${leak.issue}`);
      console.log(`      Period: ${leak.period}`);
      console.log(`      Impact: ${leak.impact}`);
    });
  }

  console.log("\n💡 YOUR SAVINGS PLAN:");
  data.savings_plan.forEach((step, i) => {
    const diff = step.difficulty === "easy" ? "🟢" : step.difficulty === "medium" ? "🟡" : "🔴";
    console.log(`\n   Step ${i + 1} ${diff}: ${step.action}`);
    console.log(`   Saves: ₹${step.saves_inr_per_month}/month | ${step.saves_co2_kg_per_month} kg CO₂/month`);
  });

  console.log("\n" + "=".repeat(50));
  console.log(`💰 Total annual savings: ₹${data.projected_annual_saving_inr}`);
  console.log(`🌍 Annual CO₂ saved: ${data.projected_annual_co2_saving_kg} kg`);
  console.log("=".repeat(50));
}

// TEST — replace "bill.jpg" with your actual bill image
analyzeBill("bill.jpg");

export { analyzeBill };
