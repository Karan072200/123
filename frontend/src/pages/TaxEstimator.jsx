import React, { useState } from "react";
import { http, formatMoney, formatApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calculator, Sparkles, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";

// India financial year: Apr 1 – Mar 31
function currentFinancialYearRange() {
  const now = new Date();
  const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1; // month 3 = April
  const start = new Date(year, 3, 1);
  const end = new Date(year + 1, 2, 31);
  return { start, end, label: `FY ${year}-${String(year + 1).slice(2)}` };
}

export default function TaxEstimator() {
  const { user } = useAuth();
  const cur = user?.currency || "INR";

  const [income, setIncome] = useState("");
  const [regime, setRegime] = useState("new");
  const [section80c, setSection80c] = useState("");
  const [section80d, setSection80d] = useState("");
  const [ageBelow60, setAgeBelow60] = useState(true);
  const [loadingIncome, setLoadingIncome] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [result, setResult] = useState(null);

  const fyRange = currentFinancialYearRange();

  const fillFromApp = async () => {
    setLoadingIncome(true);
    try {
      const rows = await http.get("/transactions").then((r) => r.data);
      const total = rows
        .filter((t) => {
          if (t.type !== "income") return false;
          const d = new Date(t.date);
          return d >= fyRange.start && d <= fyRange.end;
        })
        .reduce((s, t) => s + t.amount, 0);
      if (total <= 0) {
        toast(`${fyRange.label} mein koi income transaction nahi mila`, { duration: 4000 });
        return;
      }
      setIncome(String(Math.round(total)));
      toast.success(`${fyRange.label} ki income (${formatMoney(total, cur)}) bhar di`);
    } catch {
      toast.error("Income fetch nahi ho paya");
    } finally {
      setLoadingIncome(false);
    }
  };

  const calculate = async () => {
    const inc = Number(income);
    if (!inc || inc <= 0) return toast.error("Sahi annual income daalo");
    setCalculating(true);
    try {
      const { data } = await http.post("/tax/estimate", {
        annual_income: inc,
        regime,
        section_80c: Number(section80c) || 0,
        section_80d: Number(section80d) || 0,
        age_below_60: ageBelow60,
      });
      setResult(data);
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || "Calculate nahi ho paya");
    } finally {
      setCalculating(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="font-heading text-3xl font-bold text-[#1C1917]">Tax Estimator</h1>
        <p className="text-sm text-[#57534E] mt-1">Freelancers aur business owners ke liye rough income tax calculation (India).</p>
      </div>

      <div className="bg-white border border-[#E7E5DF] rounded-xl p-5 space-y-4">
        <div className="flex items-end justify-between gap-3 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <Label className="text-xs font-semibold tracking-widest uppercase text-[#78716C]">Annual Income (Gross)</Label>
            <Input type="number" step="0.01" value={income} onChange={(e) => setIncome(e.target.value)}
              data-testid="tax-income-input" className="mt-1.5" placeholder="e.g. 1200000" />
          </div>
          <Button variant="outline" onClick={fillFromApp} disabled={loadingIncome}
            data-testid="tax-autofill-btn"
            className="border-[#2A4F4F]/30 text-[#2A4F4F] hover:bg-[#2A4F4F]/5 rounded-full whitespace-nowrap">
            {loadingIncome ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1" />}
            {fyRange.label} se bharo
          </Button>
        </div>

        <div>
          <Label className="text-xs font-semibold tracking-widest uppercase text-[#78716C] mb-1.5 block">Tax Regime</Label>
          <Tabs value={regime} onValueChange={setRegime}>
            <TabsList className="grid grid-cols-2 w-full bg-[#F2F0EA]">
              <TabsTrigger value="new" data-testid="tax-regime-new"
                className="data-[state=active]:bg-[#2A4F4F] data-[state=active]:text-white">
                New Regime
              </TabsTrigger>
              <TabsTrigger value="old" data-testid="tax-regime-old"
                className="data-[state=active]:bg-[#2A4F4F] data-[state=active]:text-white">
                Old Regime
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {regime === "old" && (
          <div className="space-y-3 bg-[#F2F0EA] rounded-lg p-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold tracking-widest uppercase text-[#78716C]">Section 80C</Label>
                <Input type="number" step="0.01" value={section80c} onChange={(e) => setSection80c(e.target.value)}
                  data-testid="tax-80c-input" className="mt-1.5 bg-white" placeholder="max ₹1,50,000" />
              </div>
              <div>
                <Label className="text-xs font-semibold tracking-widest uppercase text-[#78716C]">Section 80D</Label>
                <Input type="number" step="0.01" value={section80d} onChange={(e) => setSection80d(e.target.value)}
                  data-testid="tax-80d-input" className="mt-1.5 bg-white" placeholder="health insurance" />
              </div>
            </div>
            <Select value={ageBelow60 ? "below" : "above"} onValueChange={(v) => setAgeBelow60(v === "below")}>
              <SelectTrigger data-testid="tax-age-select" className="bg-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="below">Age 60 se kam</SelectItem>
                <SelectItem value="above">Age 60 ya zyada (senior citizen)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        <Button onClick={calculate} disabled={calculating}
          data-testid="tax-calculate-btn"
          className="w-full bg-[#2A4F4F] hover:bg-[#1F3B3B] text-white rounded-full h-11">
          {calculating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Calculate ho raha…</>
            : <><Calculator className="w-4 h-4 mr-2" /> Tax Calculate Karo</>}
        </Button>
      </div>

      {result && (
        <div className="bg-white border border-[#E7E5DF] rounded-xl p-5 space-y-4" data-testid="tax-result">
          <h2 className="font-heading text-lg font-semibold text-[#1C1917]">Estimate ({result.regime === "new" ? "New" : "Old"} Regime)</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-[#78716C]">Taxable Income</div>
              <div className="font-heading text-xl font-bold text-[#1C1917] mt-0.5">{formatMoney(result.taxable_income, cur)}</div>
            </div>
            <div>
              <div className="text-xs text-[#78716C]">Effective Rate</div>
              <div className="font-heading text-xl font-bold text-[#1C1917] mt-0.5">{result.effective_rate_percent}%</div>
            </div>
            <div>
              <div className="text-xs text-[#78716C]">Tax (before cess)</div>
              <div className="font-semibold text-[#57534E] mt-0.5">{formatMoney(result.tax_before_cess, cur)}</div>
            </div>
            <div>
              <div className="text-xs text-[#78716C]">Health & Education Cess (4%)</div>
              <div className="font-semibold text-[#57534E] mt-0.5">{formatMoney(result.cess, cur)}</div>
            </div>
          </div>

          <div className="bg-[#2A4F4F]/10 border border-[#2A4F4F]/20 rounded-lg p-4">
            <div className="text-xs font-semibold tracking-widest uppercase text-[#2A4F4F]">Total Tax Payable</div>
            <div className="font-heading text-3xl font-bold text-[#2A4F4F] mt-1">{formatMoney(result.total_tax_payable, cur)}</div>
            <div className="text-xs text-[#57534E] mt-1">
              ≈ {formatMoney(result.total_tax_payable / 12, cur)} / mahina — agar advance tax ke liye alag rakhna ho
            </div>
          </div>

          <div className="flex items-start gap-2 text-xs text-[#78716C] bg-[#F2F0EA] rounded-lg p-3">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-[#B45309]" />
            <span>{result.disclaimer}</span>
          </div>
        </div>
      )}
    </div>
  );
}
