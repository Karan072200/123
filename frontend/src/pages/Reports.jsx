import React, { useEffect, useState } from "react";
import { http, formatMoney, API } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { Sparkles, Loader2, FileText, FileSpreadsheet, Download } from "lucide-react";
import { toast } from "sonner";
import { usePremium } from "@/context/PremiumContext";

const CHART_COLORS = ["#4A7C59", "#D96C52", "#E8B365", "#2A4F4F", "#7A6C5D", "#3B6446", "#B15039", "#8B6220"];

export default function Reports() {
  const { user } = useAuth();
  const { openLocked } = usePremium();
  const cur = user?.currency || "INR";
  const [summary, setSummary] = useState(null);
  const [monthly, setMonthly] = useState([]);
  const [ai, setAi] = useState(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [exportMonth, setExportMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [exporting, setExporting] = useState(null);

  const load = async () => {
    const [s, m] = await Promise.all([
      http.get("/analytics/summary").then((r) => r.data),
      http.get("/analytics/monthly").then((r) => r.data),
    ]);
    setSummary(s);
    setMonthly(m);
  };

  useEffect(() => { load(); }, []);

  const isPremiumRequired = (e) => e?.response?.status === 402 && e?.response?.data?.detail?.code === "PREMIUM_REQUIRED";

  const getAi = async () => {
    setLoadingAi(true);
    try {
      const { data } = await http.post("/ai/insights");
      setAi(data);
    } catch (e) {
      if (isPremiumRequired(e)) openLocked("Advanced Reports");
      else toast.error("Insights nahi mil paaye");
    } finally { setLoadingAi(false); }
  };

  const doExport = async (format) => {
    setExporting(format);
    try {
      const res = await http.get(`/export/${format}?month=${exportMonth}`, { responseType: "blob" });
      const mime = format === "pdf" ? "application/pdf"
        : format === "excel" ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        : "text/csv";
      const ext = format === "excel" ? "xlsx" : format;
      const blob = new Blob([res.data], { type: mime });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `apka-munim-${exportMonth}.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success(`${format.toUpperCase()} download ho gaya`);
    } catch (e) {
      if (isPremiumRequired(e)) openLocked(format === "excel" ? "Excel Export" : "Unlimited PDF Export");
      else toast.error(`Export nahi hua: ${e?.message || "unknown error"}`);
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-bold text-[#1C1917]">Reports & AI Insights</h1>
        <p className="text-sm text-[#57534E] mt-1">Charts, trends aur smart tips.</p>
      </div>

      {/* Export card */}
      <div className="bg-white border border-[#E7E5DF] rounded-xl p-6" data-testid="export-card">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#4A7C59]/15 flex items-center justify-center">
              <Download className="w-5 h-5 text-[#3B6446]" />
            </div>
            <div>
              <h2 className="font-heading text-lg font-semibold text-[#1C1917]">Monthly Export</h2>
              <p className="text-xs text-[#78716C]">Download karo — CA ko bhejo ya khud dekhne ke liye.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Input type="month" value={exportMonth}
              onChange={(e) => setExportMonth(e.target.value)}
              data-testid="export-month-input"
              className="w-40 border-[#E7E5DF]" />
            <Button variant="outline" onClick={() => doExport("csv")} disabled={exporting !== null}
              data-testid="export-csv-btn"
              className="border-[#E7E5DF] rounded-full">
              {exporting === "csv"
                ? <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                : <FileSpreadsheet className="w-4 h-4 mr-1" />}
              CSV
            </Button>
            <Button variant="outline" onClick={() => doExport("excel")} disabled={exporting !== null}
              data-testid="export-excel-btn"
              className="border-[#E7E5DF] rounded-full">
              {exporting === "excel"
                ? <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                : <FileSpreadsheet className="w-4 h-4 mr-1" />}
              Excel
            </Button>
            <Button onClick={() => doExport("pdf")} disabled={exporting !== null}
              data-testid="export-pdf-btn"
              className="bg-[#2A4F4F] hover:bg-[#1F3B3B] text-white rounded-full">
              {exporting === "pdf"
                ? <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                : <FileText className="w-4 h-4 mr-1" />}
              PDF Report
            </Button>
          </div>
        </div>
      </div>

      {/* AI insights */}
      <div className="bg-white border border-[#E7E5DF] rounded-xl p-6" data-testid="ai-insights-card">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#E8B365]/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-[#8B6220]" />
            </div>
            <div>
              <h2 className="font-heading text-lg font-semibold text-[#1C1917]">Munim Ji AI Coach</h2>
              <p className="text-xs text-[#78716C]">Aapke data ke basis pe smart Hinglish insights.</p>
            </div>
          </div>
          <Button onClick={getAi} disabled={loadingAi}
            data-testid="get-ai-insights-btn"
            className="bg-[#2A4F4F] hover:bg-[#1F3B3B] text-white rounded-full">
            {loadingAi
              ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Soch raha hai…</>
              : <>Insights nikaalo</>}
          </Button>
        </div>
        {ai && (
          <div className="mt-5 space-y-3">
            <div className="font-heading text-xl font-semibold text-[#1C1917]" data-testid="ai-headline">{ai.headline}</div>
            <div className="text-sm text-[#57534E] leading-relaxed" data-testid="ai-summary">{ai.summary}</div>
            {ai.tips?.length > 0 && (
              <ul className="mt-3 space-y-2" data-testid="ai-tips-list">
                {ai.tips.map((t, i) => (
                  <li key={`tip-${i}-${t.slice(0, 20)}`} className="flex gap-3 text-sm text-[#1C1917]">
                    <div className="w-6 h-6 rounded-full bg-[#4A7C59]/15 text-[#3B6446] flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {i + 1}
                    </div>
                    <div className="leading-relaxed">{t}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Monthly income vs expense */}
      <div className="bg-white border border-[#E7E5DF] rounded-xl p-6">
        <h2 className="font-heading text-lg font-semibold text-[#1C1917] mb-4">Monthly Income vs Kharcha</h2>
        {monthly.length === 0 ? (
          <div className="text-sm text-[#78716C] py-12 text-center">
            Chart dikhne ke liye kuch transactions add karo.
          </div>
        ) : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E7E5DF" />
                <XAxis dataKey="month" tick={{ fill: "#78716C", fontSize: 12 }} />
                <YAxis tick={{ fill: "#78716C", fontSize: 12 }} />
                <Tooltip formatter={(v) => formatMoney(v, cur)}
                  contentStyle={{ background: "#fff", border: "1px solid #E7E5DF", borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="income" name="Aaya" fill="#4A7C59" radius={[6, 6, 0, 0]} />
                <Bar dataKey="expense" name="Gaya" fill="#D96C52" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Savings trend */}
        <div className="bg-white border border-[#E7E5DF] rounded-xl p-6">
          <h2 className="font-heading text-lg font-semibold text-[#1C1917] mb-4">Savings Trend</h2>
          {monthly.length === 0 ? (
            <div className="text-sm text-[#78716C] py-12 text-center">Data nahi hai.</div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E7E5DF" />
                  <XAxis dataKey="month" tick={{ fill: "#78716C", fontSize: 12 }} />
                  <YAxis tick={{ fill: "#78716C", fontSize: 12 }} />
                  <Tooltip formatter={(v) => formatMoney(v, cur)}
                    contentStyle={{ background: "#fff", border: "1px solid #E7E5DF", borderRadius: 8 }} />
                  <Line type="monotone" dataKey="savings" name="Bachat" stroke="#2A4F4F" strokeWidth={2.5}
                    dot={{ r: 4, fill: "#2A4F4F" }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Category pie */}
        <div className="bg-white border border-[#E7E5DF] rounded-xl p-6">
          <h2 className="font-heading text-lg font-semibold text-[#1C1917] mb-4">Kharcha by Category</h2>
          {!summary || summary.expense_by_category.length === 0 ? (
            <div className="text-sm text-[#78716C] py-12 text-center">Kharcha data nahi hai.</div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={summary.expense_by_category} dataKey="total" nameKey="category"
                    innerRadius={45} outerRadius={90} paddingAngle={2}>
                    {summary.expense_by_category.map((c, i) => (
                      <Cell key={c.category} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => formatMoney(v, cur)}
                    contentStyle={{ background: "#fff", border: "1px solid #E7E5DF", borderRadius: 8 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Account type distribution */}
      {summary && Object.keys(summary.per_account_type).length > 0 && (
        <div className="bg-white border border-[#E7E5DF] rounded-xl p-6">
          <h2 className="font-heading text-lg font-semibold text-[#1C1917] mb-4">Balance by Account Type</h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(summary.per_account_type).map(([k, v]) => (
              <div key={k} className="p-4 rounded-lg bg-[#F9F8F6] border border-[#E7E5DF]">
                <div className="text-xs uppercase tracking-widest text-[#A8A29E] font-semibold">{k}</div>
                <div className="font-heading text-lg font-bold text-[#1C1917] mt-1">{formatMoney(v, cur)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
