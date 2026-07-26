import React, { useEffect, useState } from "react";
import { http, formatMoney } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Sparkles, TrendingUp, Trophy, Calculator, Rocket } from "lucide-react";

const COMMON_CATEGORIES = [
  "Food", "Travel", "Entertainment", "Shopping", "Bills", "Health",
  "Education", "Rent", "Coffee", "Cigarette", "Alcohol", "Others",
];

export default function WhatIf() {
  const { user } = useAuth();
  const cur = user?.currency || "INR";
  const [category, setCategory] = useState("Food");
  const [monthlyReduction, setMonthlyReduction] = useState(500);
  const [goals, setGoals] = useState([]);
  const [goalId, setGoalId] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    http.get("/goals").then((r) => setGoals(r.data || [])).catch(() => {});
  }, []);

  const simulate = async () => {
    setLoading(true);
    try {
      const { data } = await http.post("/whatif/simulate", {
        reduce_category: category,
        reduce_amount_monthly: Number(monthlyReduction),
        goal_id: goalId || null,
      });
      setResult(data);
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6" data-testid="whatif-page">
      <div>
        <h1 className="font-heading text-3xl font-bold text-[#1C1917] flex items-center gap-2">
          <Calculator className="w-7 h-7 text-[#2A4F4F]" />
          What-If Simulator
        </h1>
        <p className="text-[#78716C] mt-1">Chhote badlaav se kitna faida — abhi calculate karo</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Input */}
        <div className="bg-white border border-[#E7E5DF] rounded-xl p-6 space-y-4">
          <h2 className="font-heading text-lg font-semibold text-[#1C1917]">Scenario Banao</h2>

          <div>
            <label className="text-xs font-semibold uppercase text-[#78716C] tracking-wider">Kaunsi Category Kam Karogi?</label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger data-testid="whatif-category-select" className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COMMON_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase text-[#78716C] tracking-wider">Kitna Kam Kar Sakte Ho (per month)?</label>
            <Input
              type="number"
              data-testid="whatif-amount-input"
              value={monthlyReduction}
              onChange={(e) => setMonthlyReduction(e.target.value)}
              placeholder="500"
              className="mt-1"
            />
            <div className="flex gap-2 mt-2">
              {[100, 500, 1000, 2000].map((v) => (
                <button
                  key={v}
                  data-testid={`whatif-preset-${v}`}
                  onClick={() => setMonthlyReduction(v)}
                  className="text-xs px-3 py-1 rounded-full bg-[#F2F0EA] hover:bg-[#E7E5DF] text-[#57534E]"
                >
                  ₹{v}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase text-[#78716C] tracking-wider">Kis Goal Se Jodo? (optional)</label>
            <Select value={goalId || "none"} onValueChange={(v) => setGoalId(v === "none" ? "" : v)}>
              <SelectTrigger data-testid="whatif-goal-select" className="mt-1">
                <SelectValue placeholder="Koi goal select karo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">-- None --</SelectItem>
                {goals.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.emoji || "🎯"} {g.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button onClick={simulate} disabled={loading} data-testid="whatif-simulate-btn"
            className="w-full bg-[#2A4F4F] hover:bg-[#1F3939] text-white">
            <Sparkles className="w-4 h-4 mr-2" />
            {loading ? "Calculating..." : "Calculate karo"}
          </Button>
        </div>

        {/* Result */}
        <div className="space-y-4">
          {result ? (
            <>
              {result.current_monthly_avg && (
                <div className="bg-[#F9F8F6] border border-[#E7E5DF] rounded-xl p-4">
                  <div className="text-xs uppercase font-semibold text-[#78716C] tracking-wider">Abhi Aap Kharch Karte Ho</div>
                  <div className="font-heading text-2xl font-bold text-[#B15039] mt-1">
                    {formatMoney(result.current_monthly_avg, cur)}<span className="text-sm text-[#78716C] font-normal">/month on {result.reduce_category}</span>
                  </div>
                </div>
              )}

              <div className="bg-gradient-to-br from-[#4A7C59] to-[#3B6446] rounded-xl p-6 text-white">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="w-5 h-5" />
                  <span className="text-xs uppercase font-semibold tracking-wider opacity-90">1 Saal Mein Bachega</span>
                </div>
                <div className="font-heading text-4xl font-bold" data-testid="whatif-yearly-savings">
                  {formatMoney(result.yearly_savings, cur)}
                </div>
                <div className="mt-3 text-sm opacity-90">
                  5 saal mein: <span className="font-bold">{formatMoney(result.five_year_savings, cur)}</span>
                </div>
              </div>

              {result.goal_impact && (
                <div className="bg-white border-2 border-[#B8763A] rounded-xl p-5">
                  <div className="flex items-center gap-2 text-[#B8763A]">
                    <Trophy className="w-5 h-5" />
                    <span className="text-xs uppercase font-semibold tracking-wider">Goal Impact</span>
                  </div>
                  <div className="mt-2 font-heading text-lg font-bold text-[#1C1917]">
                    {result.goal_impact.goal_name}
                  </div>
                  <div className="text-sm text-[#57534E] mt-1">
                    Bacha: <span className="font-semibold">{formatMoney(result.goal_impact.remaining, cur)}</span>
                  </div>
                  {result.goal_impact.months_faster_to_complete > 0 ? (
                    <div className="mt-3 p-3 bg-[#B8763A]/10 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Rocket className="w-4 h-4 text-[#B8763A]" />
                        <span className="font-bold text-[#B8763A]">
                          {result.goal_impact.months_faster_to_complete} mahine mein pura!
                        </span>
                      </div>
                      {result.goal_impact.would_complete_by && (
                        <div className="text-xs text-[#78716C] mt-1">
                          Complete date: {new Date(result.goal_impact.would_complete_by).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="mt-2 text-xs text-[#78716C]">Amount thoda badhao — abhi impact chhota hai</div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="bg-[#F9F8F6] border-2 border-dashed border-[#E7E5DF] rounded-xl p-8 text-center">
              <Sparkles className="w-8 h-8 mx-auto text-[#A8A29E] mb-2" />
              <p className="text-sm text-[#78716C]">
                Left mein scenario bharo aur "Calculate karo" dabao — result yahan dikhega
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
