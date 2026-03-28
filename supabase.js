import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Save a receipt scan result to the database
export async function saveScanResult(userId, scanData) {
  const { data, error } = await supabase
    .from("carbon_logs")
    .insert({
      user_id: userId,
      item_name: scanData.store || "Receipt Scan",
      carbon_value: scanData.total_carbon_kg,
      category: "grocery",
      source: "Gemini AI",
      raw_data: JSON.stringify(scanData.items),
    });

  if (error) {
    console.error("❌ Error saving to Supabase:", error.message);
  } else {
    console.log("✅ Scan saved to database!");
  }

  return { data, error };  // ← this must be INSIDE the function
}              // ← closing bracket of the function


// Save a bill analysis result
export async function saveBillResult(userId, billData) {
  const { data, error } = await supabase
    .from("carbon_logs")
    .insert({
      user_id: userId,
      type: "bill",
      total_carbon_kg: billData.carbon_kg,
      items: billData.savings_plan,
      summary: `${billData.bill_type} bill — ${billData.vs_india_average}`,
      
    });

  if (error) {
    console.error("❌ Error saving bill to Supabase:", error.message);
  } else {
    console.log("✅ Bill analysis saved to database!");
  }

  return { data, error };
}

// Get all scans for a user
export async function getUserScans(userId) {
  const { data, error } = await supabase
    .from("carbon_logs")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("❌ Error fetching scans:", error.message);
  }

  return data;
}

export { supabase };