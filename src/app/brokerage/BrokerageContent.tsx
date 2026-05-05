"use client";

import { useState, useEffect, useCallback } from "react";
import BucketCard from "@/components/BucketCard";
import { useEditMode } from "@/components/EditModeContext";
import type { EnrichedPortfolio, Bucket } from "@/lib/types";
import toast from "react-hot-toast";
import { Plus, X } from "lucide-react";

export default function BrokerageContent() {
  const { isEditMode, authFetch } = useEditMode();
  const [portfolio, setPortfolio] = useState<EnrichedPortfolio | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddBucket, setShowAddBucket] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [newBucket, setNewBucket] = useState({
    id: "", name: "", color: "#3b82f6", description: "",
    category: "brokerage" as Bucket["category"],
  });

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    let active = true;
    async function load() {
      const res = await fetch("/api/portfolio");
      if (res.ok && active) {
        const data = await res.json() as EnrichedPortfolio;
        if (active) setPortfolio(data);
      }
      if (active) setLoading(false);
    }
    load();
    return () => { active = false; };
  }, [refreshKey]);

  const brokerageBuckets = portfolio?.buckets.filter((b) => b.category === "brokerage") ?? [];

  async function createBucket() {
    if (!newBucket.id || !newBucket.name) {
      toast.error("ID and name required");
      return;
    }
    const res = await authFetch("/api/buckets", {
      method: "POST",
      body: JSON.stringify({ bucket: newBucket }),
    });
    if (res.ok) {
      toast.success("Bucket created");
      setShowAddBucket(false);
      setNewBucket({ id: "", name: "", color: "#3b82f6", description: "", category: "brokerage" });
      refresh();
    } else {
      const err = await res.json() as { error?: string };
      toast.error(err.error ?? "Failed to create bucket");
    }
  }

  if (loading) return (
    <main className="max-w-[1400px] mx-auto px-6 py-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-40 rounded-xl animate-pulse" style={{ backgroundColor: "#131c2f" }} />
        ))}
      </div>
    </main>
  );

  const inputClass = "w-full bg-[#0b1120] border border-[#1f2a44] rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all";
  const labelClass = "block text-xs text-slate-500 mb-1 font-medium uppercase tracking-wider";

  return (
    <main className="max-w-[1400px] mx-auto px-6 py-8 w-full">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Brokerage</h1>
          <p className="text-sm text-slate-500 mt-1">
            {brokerageBuckets.length} account{brokerageBuckets.length !== 1 ? "s" : ""} · Click any card to view positions
          </p>
        </div>
        {isEditMode && (
          <button
            onClick={() => setShowAddBucket(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Account
          </button>
        )}
      </div>

      {brokerageBuckets.length === 0 ? (
        <div className="rounded-xl border p-12 text-center" style={{ backgroundColor: "#131c2f", borderColor: "#1f2a44" }}>
          <p className="text-slate-500 text-sm mb-2">No brokerage accounts yet.</p>
          {isEditMode && (
            <button onClick={() => setShowAddBucket(true)} className="text-blue-400 text-sm hover:underline">
              Create your first account →
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {brokerageBuckets.map((bucket) => (
            <BucketCard
              key={bucket.id}
              bucket={bucket}
              href={`/brokerage/${bucket.id}`}
              large
            />
          ))}
        </div>
      )}

      {showAddBucket && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(11, 17, 32, 0.85)", backdropFilter: "blur(4px)" }}
        >
          <div className="w-full max-w-md rounded-2xl border p-6" style={{ backgroundColor: "#131c2f", borderColor: "#1f2a44" }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-slate-100">New Brokerage Account</h2>
              <button onClick={() => setShowAddBucket(false)} className="text-slate-600 hover:text-slate-300 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className={labelClass}>ID (url-safe slug) *</label>
                <input
                  type="text"
                  value={newBucket.id}
                  onChange={(e) => setNewBucket({ ...newBucket, id: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })}
                  placeholder="e.g. my-portfolio"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Display Name *</label>
                <input
                  type="text"
                  value={newBucket.name}
                  onChange={(e) => setNewBucket({ ...newBucket, name: e.target.value })}
                  placeholder="e.g. Long-Term Core"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Description</label>
                <textarea
                  value={newBucket.description}
                  onChange={(e) => setNewBucket({ ...newBucket, description: e.target.value })}
                  placeholder="Optional description…"
                  rows={2}
                  className={inputClass + " resize-none"}
                />
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <label className={labelClass}>Color</label>
                  <input
                    type="color"
                    value={newBucket.color}
                    onChange={(e) => setNewBucket({ ...newBucket, color: e.target.value })}
                    className="h-9 w-full rounded-lg border border-[#1f2a44] cursor-pointer"
                    style={{ backgroundColor: "#0b1120" }}
                  />
                </div>
                <div className="flex-1">
                  <label className={labelClass}>Category</label>
                  <select
                    value={newBucket.category}
                    onChange={(e) => setNewBucket({ ...newBucket, category: e.target.value as Bucket["category"] })}
                    className={inputClass}
                  >
                    <option value="brokerage">Brokerage</option>
                    <option value="savings">Savings</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={() => setShowAddBucket(false)} className="flex-1 py-2.5 rounded-xl text-sm text-slate-400 border border-[#1f2a44] hover:bg-white/5 transition-colors">Cancel</button>
                <button onClick={createBucket} className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white transition-colors">Create</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
