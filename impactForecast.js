// ============================================
// FEATURE 4: Impact Forecasting
// Based on user's habits, predict 5-year carbon
// footprint and show "What If" scenarios
// ============================================

import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

// ── Generate forecast for a user's habits ──
async function generateForecast(userHabits) {
  console.log("\n🔮 Generating 5-year impact forecast...\n");

  const prompt = `
You are a carbon footprint forecaster. Based on a user's current monthly carbon data,
predict their 5-year trajectory and generate 3 "What If" improvement scenarios.

User's current monthly carbon data:
${JSON.stringify(userHabits, null, 2)}

India average: 158 kg CO2/month per person (1.9 tonnes/year)
Paris Agreement target: 167 kg CO2/month per person (2 tonnes/year)

Generate a 5-year forecast (Year 1 to Year 5) for:
1. Their CURRENT path (no changes)
2. "What If" Scenario A: They go meatless on Mondays
3. "What If" Scenario B: They switch to public transport / cycling for commute
4. "What If" Scenario C: They do both A and B + reduce AC usage by 2 hours/day

Respond ONLY with this exact JSON format, no other text:
{
  "current_monthly_kg": 280,
  "current_annual_kg": 3360,
  "vs_india_average": "77% above average",
  "vs_paris_target": "68% above Paris target",
  "forecast_years": [1, 2, 3, 4, 5],
  "current_path": [3360, 3420, 3480, 3550, 3620],
  "scenario_a": {
    "name": "Meatless Mondays",
    "description": "Skip meat every Monday",
    "monthly_saving_kg": 18,
    "forecast": [3144, 3168, 3192, 3220, 3248],
    "co2_saved_5yr": 1080,
    "equivalent": "equivalent to planting 49 trees"
  },
  "scenario_b": {
    "name": "Green Commute",
    "description": "Use metro/cycle instead of car/bike",
    "monthly_saving_kg": 32,
    "forecast": [2976, 2990, 3005, 3020, 3040],
    "co2_saved_5yr": 1920,
    "equivalent": "equivalent to not driving 9,600 km"
  },
  "scenario_c": {
    "name": "Full Eco Mode",
    "description": "Meatless Mondays + Green Commute + Less AC",
    "monthly_saving_kg": 65,
    "forecast": [2580, 2560, 2540, 2520, 2500],
    "co2_saved_5yr": 3900,
    "equivalent": "equivalent to planting 177 trees"
  }
}
`;

  try {
    const response = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    });

    const data = await response.json();
    const rawText = data.candidates[0].content.parts[0].text;
    const cleanJson = rawText.replace(/```json|```/g, "").trim();
    const result = JSON.parse(cleanJson);

    displayForecast(result);
    return result;
  } catch (error) {
    console.error("❌ Error generating forecast:", error.message);
  }
}

function displayForecast(data) {
  console.log("=".repeat(55));
  console.log("📊 YOUR 5-YEAR CARBON IMPACT FORECAST");
  console.log("=".repeat(55));
  console.log(`Current footprint: ${data.current_monthly_kg} kg CO₂/month`);
  console.log(`Annual total:      ${data.current_annual_kg} kg CO₂/year`);
  console.log(`vs India average:  ${data.vs_india_average}`);
  console.log(`vs Paris target:   ${data.vs_paris_target}`);

  console.log("\n📈 5-YEAR PROJECTIONS (kg CO₂/year):\n");
  console.log("Year  | Current Path | Scenario A   | Scenario B   | Scenario C");
  console.log("-".repeat(65));

  data.forecast_years.forEach((year, i) => {
    console.log(
      `Yr ${year}  | ${String(data.current_path[i]).padEnd(12)} | ${String(data.scenario_a.forecast[i]).padEnd(12)} | ${String(data.scenario_b.forecast[i]).padEnd(12)} | ${data.scenario_c.forecast[i]}`
    );
  });

  console.log("\n🌿 WHAT IF SCENARIOS:\n");
  [data.scenario_a, data.scenario_b, data.scenario_c].forEach((s, i) => {
    console.log(`Scenario ${i + 1}: ${s.name}`);
    console.log(`  "${s.description}"`);
    console.log(`  Saves ${s.monthly_saving_kg} kg CO₂/month`);
    console.log(`  Over 5 years: ${s.co2_saved_5yr} kg CO₂ saved`);
    console.log(`  🌳 ${s.equivalent}\n`);
  });
}

// ── TEST with sample user data ──
// In the real app, this comes from Supabase (Gauri's part)
const sampleUserHabits = {
  monthly_food_carbon_kg: 120,     // from receipt scanner
  monthly_transport_carbon_kg: 95, // car commute daily
  monthly_energy_carbon_kg: 65,    // from bill analyzer
  diet_type: "non-vegetarian",
  commute_method: "personal car",
  household_size: 3,
  city: "Delhi",
};

generateForecast(sampleUserHabits);

export { generateForecast };
