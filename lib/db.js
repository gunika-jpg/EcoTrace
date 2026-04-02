// ============================================================
// lib/db.js
// All Supabase database operations in one place.
// Import what you need: import { carbonLogs, squads } from '../lib/db';
// ============================================================

import { supabase } from './supabase';

// ── CARBON LOGS ───────────────────────────────────────────────

export const carbonLogs = {

  // Add a new log entry (called after Gemini scan)
  async add({ userId, itemName, carbonValue, category, source, rawData }) {
    const { data, error } = await supabase
      .from('carbon_logs')
      .insert({
        user_id: userId,
        item_name: itemName,
        carbon_value: carbonValue,
        category,
        source,
        raw_data: rawData,
      })
      .select()
      .single();

    if (error) throw error;

    // Also update the user's total score
    await supabase.rpc('increment_carbon_score', {
      p_user_id: userId,
      p_value: carbonValue,
    });

    return data;
  },

  // Get all logs for a user (most recent first)
  async getByUser(userId, limit = 50) {
    const { data, error } = await supabase
      .from('carbon_logs')
      .select('*')
      .eq('user_id', userId)
      .order('logged_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  },

  // Get monthly summary (for Impact Forecasting)
  async getMonthlySummary(userId) {
    const { data, error } = await supabase
      .from('carbon_logs')
      .select('carbon_value, logged_at, category')
      .eq('user_id', userId)
      .gte('logged_at', new Date(Date.now() - 90 * 86400000).toISOString());

    if (error) throw error;
    return data;
  },
};

// ── QUESTS ────────────────────────────────────────────────────

export const quests = {

  // Get all active quests
  async getAll() {
    const { data, error } = await supabase
      .from('quests')
      .select('*')
      .eq('is_active', true)
      .order('points', { ascending: false });

    if (error) throw error;
    return data;
  },

  // Get user's quest progress for this week
  async getUserProgress(userId) {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from('user_quests')
      .select('*, quests(*)')
      .eq('user_id', userId)
      .gte('week_start', weekStart.toISOString().split('T')[0]);

    if (error) throw error;
    return data;
  },

  // Mark a quest as complete
  async complete(userId, questId) {
    const { data, error } = await supabase
      .from('user_quests')
      .upsert({
        user_id: userId,
        quest_id: questId,
        status: 'completed',
        progress: 100,
        completed_at: new Date().toISOString(),
        week_start: new Date().toISOString().split('T')[0],
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};

// ── SQUADS ────────────────────────────────────────────────────

export const squads = {

  // Create a new squad
  async create(name, description, createdBy) {
    const { data, error } = await supabase
      .from('squads')
      .insert({ name, description, created_by: createdBy })
      .select()
      .single();

    if (error) throw error;

    // Auto-join as admin
    await supabase.from('squad_members').insert({
      squad_id: data.id,
      user_id: createdBy,
      role: 'admin',
    });

    return data;
  },

  // Join a squad by invite code
  async joinByCode(inviteCode, userId) {
    const { data: squad, error: findError } = await supabase
      .from('squads')
      .select('*')
      .eq('invite_code', inviteCode)
      .single();

    if (findError) throw new Error('Squad not found. Check your invite code.');

    const { data, error } = await supabase
      .from('squad_members')
      .insert({ squad_id: squad.id, user_id: userId })
      .select()
      .single();

    if (error) throw new Error('You might already be in this squad.');
    return { squad, membership: data };
  },

  // Get leaderboard for a squad
  async getLeaderboard(squadId) {
    const { data, error } = await supabase
      .from('squad_members')
      .select('*, users(name, email, weekly_carbon_score)')
      .eq('squad_id', squadId)
      .order('weekly_contribution', { ascending: false });

    if (error) throw error;
    return data;
  },

  // Get squads a user belongs to
  async getUserSquads(userId) {
    const { data, error } = await supabase
      .from('squad_members')
      .select('*, squads(*)')
      .eq('user_id', userId);

    if (error) throw error;
    return data;
  },

  // Subscribe to live leaderboard updates
  subscribeToLeaderboard(squadId, callback) {
    return supabase
      .channel(`squad-${squadId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'squad_members',
          filter: `squad_id=eq.${squadId}`,
        },
        callback
      )
      .subscribe();
  },
};

// ── MAP LOCATIONS ─────────────────────────────────────────────

export const mapLocations = {

  // Get all map pins
  async getAll(category = null) {
    let query = supabase
      .from('map_locations')
      .select('*')
      .order('verified', { ascending: false });

    if (category) query = query.eq('category', category);

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  // Add a new location
  async add({ name, category, address, lat, lng, description, addedBy }) {
    const { data, error } = await supabase
      .from('map_locations')
      .insert({ name, category, address, lat, lng, description, added_by: addedBy })
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};

// ── CERTIFICATES ──────────────────────────────────────────────

export const certificates = {

  async getByUser(userId) {
    const { data, error } = await supabase
      .from('certificates')
      .select('*')
      .eq('user_id', userId)
      .order('issued_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  async award({ userId, badgeName, badgeType, milestoneValue }) {
    const { data, error } = await supabase
      .from('certificates')
      .insert({ user_id: userId, badge_name: badgeName, badge_type: badgeType, milestone_value: milestoneValue })
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};

// ── CARBON REPORTS ────────────────────────────────────────────

export const carbonReports = {

  async getWeeklySummary(userId) {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const { data: currentWeek, error: error1 } = await supabase
      .from('carbon_logs')
      .select('carbon_value')
      .eq('user_id', userId)
      .gte('logged_at', weekStart.toISOString())
      .lt('logged_at', weekEnd.toISOString());

    const prevWeekStart = new Date(weekStart);
    prevWeekStart.setDate(prevWeekStart.getDate() - 7);
    const prevWeekEnd = new Date(prevWeekStart);
    prevWeekEnd.setDate(prevWeekEnd.getDate() + 7);

    const { data: previousWeek, error: error2 } = await supabase
      .from('carbon_logs')
      .select('carbon_value')
      .eq('user_id', userId)
      .gte('logged_at', prevWeekStart.toISOString())
      .lt('logged_at', prevWeekEnd.toISOString());

    if (error1 || error2) throw error1 || error2;

    const currentTotal = currentWeek.reduce((sum, log) => sum + (log.carbon_value || 0), 0);
    const previousTotal = previousWeek.reduce((sum, log) => sum + (log.carbon_value || 0), 0);
    
    const percentChange = previousTotal > 0 
      ? ((previousTotal - currentTotal) / previousTotal) * 100 
      : 0;

    return {
      currentWeek: parseFloat(currentTotal.toFixed(2)),
      previousWeek: parseFloat(previousTotal.toFixed(2)),
      percentChange: parseFloat(percentChange.toFixed(1)),
      isImprovement: percentChange > 0,
    };
  },

  async getMonthlySummary(userId) {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    
    const monthEnd = new Date(monthStart);
    monthEnd.setMonth(monthEnd.getMonth() + 1);

    const { data: currentMonth, error: error1 } = await supabase
      .from('carbon_logs')
      .select('carbon_value')
      .eq('user_id', userId)
      .gte('logged_at', monthStart.toISOString())
      .lt('logged_at', monthEnd.toISOString());

    const prevMonthStart = new Date(monthStart);
    prevMonthStart.setMonth(prevMonthStart.getMonth() - 1);
    const prevMonthEnd = new Date(prevMonthStart);
    prevMonthEnd.setMonth(prevMonthEnd.getMonth() + 1);

    const { data: previousMonth, error: error2 } = await supabase
      .from('carbon_logs')
      .select('carbon_value')
      .eq('user_id', userId)
      .gte('logged_at', prevMonthStart.toISOString())
      .lt('logged_at', prevMonthEnd.toISOString());

    if (error1 || error2) throw error1 || error2;

    const currentTotal = currentMonth.reduce((sum, log) => sum + (log.carbon_value || 0), 0);
    const previousTotal = previousMonth.reduce((sum, log) => sum + (log.carbon_value || 0), 0);
    
    const percentChange = previousTotal > 0 
      ? ((previousTotal - currentTotal) / previousTotal) * 100 
      : 0;

    return {
      currentMonth: parseFloat(currentTotal.toFixed(2)),
      previousMonth: parseFloat(previousTotal.toFixed(2)),
      percentChange: parseFloat(percentChange.toFixed(1)),
      isImprovement: percentChange > 0,
      monthName: monthStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    };
  },

  async getDailyBreakdown(userId, days = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from('carbon_logs')
      .select('carbon_value, logged_at')
      .eq('user_id', userId)
      .gte('logged_at', startDate.toISOString())
      .order('logged_at', { ascending: true });

    if (error) throw error;

    const dailyData = {};
    data.forEach(log => {
      const day = log.logged_at.split('T')[0];
      dailyData[day] = (dailyData[day] || 0) + (log.carbon_value || 0);
    });

    return Object.entries(dailyData).map(([date, value]) => ({
      date,
      value: parseFloat(value.toFixed(2)),
      dayName: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
    }));
  },
};

// ── UTILITY BILLS ──────────────────────────────────────────────

export const utilityBills = {

  // Get all bill analyses for a user
  async getUserBills(userId) {
    try {
      const { data, error } = await supabase
        .from('bill_analysis')
        .select('*')
        .eq('user_id', userId)
        .order('analyzed_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.log('Bill analysis table not available yet');
      return [];
    }
  },

  // Get total community carbon from all bills
  async getCommunityBillCarbon() {
    const { data, error } = await supabase
      .from('carbon_logs')
      .select('carbon_value')
      .eq('category', 'energy');

    if (error) throw error;
    
    const total = (data || []).reduce((sum, log) => sum + (log.carbon_value || 0), 0);
    return parseFloat(total.toFixed(2));
  },

  // Get total potential savings from all users' bills
  async getCommunityPotentialSavings() {
    try {
      const { data, error } = await supabase
        .from('bill_analysis')
        .select('potential_savings_co2, potential_savings_inr');

      if (error) throw error;
      
      const totalCO2 = (data || []).reduce((sum, bill) => sum + (bill.potential_savings_co2 || 0), 0);
      const totalINR = (data || []).reduce((sum, bill) => sum + (bill.potential_savings_inr || 0), 0);

      return {
        total_savings_co2: parseFloat(totalCO2.toFixed(2)),
        total_savings_inr: parseFloat(totalINR.toFixed(2)),
        trees_that_can_be_planted: Math.floor(totalCO2 / 20),
      };
    } catch (err) {
      console.log('Bill analysis table not available yet');
      return {
        total_savings_co2: 0,
        total_savings_inr: 0,
        trees_that_can_be_planted: 0,
      };
    }
  },

  // Get user's last bill
  async getLastBill(userId) {
    try {
      const { data, error } = await supabase
        .from('bill_analysis')
        .select('*')
        .eq('user_id', userId)
        .order('analyzed_at', { ascending: false })
        .limit(1)
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      console.log('Bill analysis table not available yet');
      return null;
    }
  },
};