// ============================================
// FEATURE 1: Carbon-Sync Receipt Scanner
// Rahul's job: send receipt image to Gemini,
// get back items + carbon values as JSON
// ============================================

import fetch from "node-fetch";
import fs from "fs";
import dotenv from "dotenv";
import { supabase } from "./supabase.js";
import { saveScanResult } from "./supabase.js";
dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
// ── The prompt Gemini receives along with the receipt image ──
const RECEIPT_PROMPT = `
You are a carbon footprint calculator for Indian grocery receipts.

Look at this receipt image and:
1. Extract every food/grocery item you can see
2. For each item, estimate its carbon footprint in kg CO2
3. Classify each as "high", "medium", or "low" carbon
4. Suggest one lower-carbon swap for high-carbon items

Use these carbon reference values (kg CO2 per kg of product):
- Beef: 27, Chicken: 6.9, Mutton: 39, Fish: 5
- Milk: 1.4, Paneer: 8, Curd: 1.5, Eggs: 4.5
- Rice: 0.4, Wheat/Atta: 0.5, Dal/Lentils: 0.9
- Vegetables (local, seasonal): 0.3
- Fruits (local): 0.4, Imported fruits: 1.2
- Packaged snacks: 2.5, Bottled water: 0.15 per bottle

Respond ONLY with this exact JSON format, no other text:
{
  "store": "store name or Unknown",
  "date": "date on receipt or Unknown",
  "items": [
    {
      "name": "item name",
      "quantity": "quantity with unit",
      "carbon_kg": 2.4,
      "level": "high",
      "swap": "suggested alternative or null"
    }
  ],
  "total_carbon_kg": 11.2,
  "summary": "one sentence about this shopping trip's impact"
}
`;

// ── Main function: takes an image file path, returns carbon data ──
async function scanReceipt(imagePath) {
  console.log(`\n📸 Scanning receipt: ${imagePath}`);
  console.log("⏳ Sending to Gemini AI...\n");

  // Read the image and convert to base64
  const imageBuffer = fs.readFileSync(imagePath);
  const base64Image = imageBuffer.toString("base64");

  // Detect image type from file extension
  const ext = imagePath.split(".").pop().toLowerCase();
  const mimeType = ext === "png" ? "image/png" : "image/jpeg";

  // Build the request to Gemini
  const requestBody = {
    contents: [
      {
        parts: [
          {
            inline_data: {
              mime_type: mimeType,
              data: base64Image,
            },
          },
          {
            text: RECEIPT_PROMPT,
          },
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

// DEBUG - see exactly what Gemini returns


    const rawText = data.candidates[0].content.parts[0].text;

    // Clean up and parse JSON
    const cleanJson = rawText.replace(/```json|```/g, "").trim();
    
    const result = JSON.parse(cleanJson);

    // Display results nicely
    displayReceiptResults(result);
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id || "656667b1-3563-4c53-8ba0-560b745423d1";

    
    await saveScanResult(userId, result);
    return result;
  } catch (error) {
    console.error("❌ Error scanning receipt:", error.message);
    console.log("💡 Check: Is your GEMINI_API_KEY correct in .env?");
  }
}

// ── Pretty-print the results ──
function displayReceiptResults(data) {
  console.log("=".repeat(50));
  console.log(`🏪 Store: ${data.store}`);
  console.log(`📅 Date: ${data.date}`);
  console.log("=".repeat(50));

  data.items.forEach((item) => {
    const emoji = item.level === "high" ? "🔴" : item.level === "medium" ? "🟡" : "🟢";
    console.log(`\n${emoji} ${item.name} (${item.quantity})`);
    console.log(`   Carbon: ${item.carbon_kg} kg CO₂ — ${item.level.toUpperCase()}`);
    if (item.swap) {
      console.log(`   💡 Swap suggestion: ${item.swap}`);
    }
  });

  console.log("\n" + "=".repeat(50));
  console.log(`🌍 TOTAL TRIP CARBON: ${data.total_carbon_kg} kg CO₂`);
  console.log(`📊 ${data.summary}`);
  console.log("=".repeat(50));
}

// ── TEST: Run with a sample receipt image ──
// Replace "receipt.jpg" with an actual receipt image file in your folder
scanReceipt("receipt.jpg");

// ── Export for use in the main app ──
export { scanReceipt };
