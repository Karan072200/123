import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePrivacy } from '../../context/PrivacyContext';
import {
  FileText, ShoppingBag, Boxes, Plus, RefreshCw, Layers, Calendar, BarChart2
} from 'lucide-react';
import { http } from '../../lib/api';

export default function BillingDashboardWorkspace() {
  const navigate = useNavigate();
  const { hidden: privacyOn } = usePrivacy();
  const [viewMode, setViewMode] = useState('analytics'); // 'analytics' or 'quick-links'
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    todaySales: 0,
    todayPurchase: 0,
    salesGst: 0,
    purchaseGst: 0,
    totalReceivables: 0,
    totalPayables: 0,
    totalStockValue: 0
  });

  const formatAmount = (val) => {
    if (privacyOn) return '••••••';
    return `₹ ${Number(val || 0).toLocaleString('en-IN')}`;
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const { data } = await http.get('/invoices/summary');
      if (data) {
        setMetrics({
          todaySales: data.today_sales || 0,
          todayPurchase: data.today_purchase || 0,
          salesGst: data.sales_gst || 0,
          purchaseGst: data.purchase_gst || 0,
          totalReceivables: data.receivables || 0,
          totalPayables: data.payables || 0,
          totalStockValue: data.stock_value || 0
        });
      }
    } catch { /* Fallback */ } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadDashboardData(); }, []);

  return (
    <div className="space-y-6 text-xs">
      
      {/* Analytics vs Quick Links Switcher Bar */}
      <div className="flex items-center justify-between bg-slate-800 border border-slate-700 p-2.5 rounded-lg shadow-sm">
        <div className="flex items-center bg-slate-900 p-1 rounded border border-slate-700">
          <button
            onClick={() => setViewMode('analytics')}
            className={`px-3 py-1 font-bold rounded transition-colors ${
              viewMode === 'analytics' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Analytics
          </button>
          <button
            onClick={() => setViewMode('quick-links')}
            className={`px-3 py-1 font-bold rounded transition-colors ${
              viewMode === 'quick-links' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Quick Links
          </button>
        </div>

        <button
          onClick={loadDashboardData}
          className="flex items-center space-x-1 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded font-semibold"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {viewMode === 'quick-links' ? (
        /* Quick Links Grid */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {[
            { title: 'Sale Invoice', path: '/billing/invoices/create?type=sale', color: 'emerald' },
            { title: 'Purchase Invoice', path: '/billing/invoices/create?type=purchase', color: 'rose' },
            { title: 'Quotation', path: '/billing/quotations/create', color: 'blue' },
            { title: 'Delivery Challan', path: '/billing/challans/create', color: 'amber' },
            { title: 'Proforma Invoice', path: '/billing/proforma/create', color: 'purple' },
            { title: 'Purchase Order', path: '/billing/purchase-orders/create', color: 'slate' },
            { title: 'Sale Order', path: '/billing/sales-orders/create', color: 'indigo' },
            { title: 'Inward Payment', path: '/billing/payments/create?type=received', color: 'teal' },
          ].map((card, idx) => (
            <button
              key={idx}
              onClick={() => navigate(card.path)}
              className="p-4 bg-slate-800 hover:bg-slate-700/80 border border-slate-700 rounded-lg text-left space-y-2 group transition-all"
            >
              <div className="w-8 h-8 rounded bg-emerald-950/60 border border-emerald-800 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
                <FileText className="w-4 h-4" />
              </div>
              <p className="font-bold text-white text-sm">{card.title}</p>
            </button>
          ))}
        </div>
      ) : (
        /* Analytics View */
        <div className="space-y-6">
          {/* Sale vs Purchase Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-800 border border-slate-700 p-4 rounded-lg space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sale Summary</span>
              <div className="text-xl font-extrabold text-emerald-400">{formatAmount(metrics.todaySales)}</div>
              <div className="text-[11px] text-slate-400">+ GST {formatAmount(metrics.salesGst)}</div>
            </div>

            <div className="bg-slate-800 border border-slate-700 p-4 rounded-lg space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Purchase Summary</span>
              <div className="text-xl font-extrabold text-rose-400">{formatAmount(metrics.todayPurchase)}</div>
              <div className="text-[11px] text-slate-400">+ GST {formatAmount(metrics.purchaseGst)}</div>
            </div>

            <div className="bg-slate-800 border border-slate-700 p-4 rounded-lg space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Stock Value</span>
              <div className="text-xl font-extrabold text-amber-400">{formatAmount(metrics.totalStockValue)}</div>
              <div className="text-[11px] text-slate-400">Aggregate Current Inventory Valuation</div>
            </div>
          </div>

          {/* Customer Receivables & Supplier Payables */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-800 border border-slate-700 p-4 rounded-lg flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Customer Receivables</span>
                <div className="text-lg font-bold text-emerald-400 mt-1">{formatAmount(metrics.totalReceivables)}</div>
              </div>
              <button onClick={() => navigate('/billing/outstanding?type=customer')} className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded font-semibold">
                View Ledger →
              </button>
            </div>

            <div className="bg-slate-800 border border-slate-700 p-4 rounded-lg flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Supplier Payables</span>
                <div className="text-lg font-bold text-rose-400 mt-1">{formatAmount(metrics.totalPayables)}</div>
              </div>
              <button onClick={() => navigate('/billing/outstanding?type=supplier')} className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded font-semibold">
                View Ledger →
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
