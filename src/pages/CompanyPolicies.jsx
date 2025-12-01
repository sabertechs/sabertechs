import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  FileText,
  Search,
  Loader2,
  ExternalLink,
  Calendar,
  Tag
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const categories = [
  { value: "hr", label: "HR Policies" },
  { value: "it", label: "IT & Security" },
  { value: "finance", label: "Finance" },
  { value: "operations", label: "Operations" },
  { value: "compliance", label: "Compliance" },
  { value: "safety", label: "Health & Safety" },
  { value: "general", label: "General" },
];

const categoryColors = {
  hr: "bg-purple-100 text-purple-700 border-purple-200",
  it: "bg-blue-100 text-blue-700 border-blue-200",
  finance: "bg-green-100 text-green-700 border-green-200",
  operations: "bg-amber-100 text-amber-700 border-amber-200",
  compliance: "bg-red-100 text-red-700 border-red-200",
  safety: "bg-orange-100 text-orange-700 border-orange-200",
  general: "bg-slate-100 text-slate-700 border-slate-200",
};

const categoryIcons = {
  hr: "👥",
  it: "💻",
  finance: "💰",
  operations: "⚙️",
  compliance: "📋",
  safety: "🛡️",
  general: "📄",
};

export default function CompanyPolicies() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const { data: policies = [], isLoading } = useQuery({
    queryKey: ["policies-active"],
    queryFn: () => base44.entities.CompanyPolicy.filter({ is_active: true }, "-created_date"),
  });

  const filteredPolicies = policies.filter((p) => {
    const matchesSearch = p.title?.toLowerCase().includes(search.toLowerCase()) ||
                          p.description?.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === "all" || p.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const groupedPolicies = filteredPolicies.reduce((acc, policy) => {
    const cat = policy.category || "general";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(policy);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Company Policies</h1>
        <p className="text-slate-500">Access all company policies and guidelines</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search policies..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      ) : filteredPolicies.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="text-center py-12 text-slate-500">
            <FileText className="w-12 h-12 mx-auto text-slate-300 mb-2" />
            <p>No policies found</p>
          </CardContent>
        </Card>
      ) : categoryFilter === "all" ? (
        // Grouped view
        <div className="space-y-8">
          {Object.entries(groupedPolicies).map(([category, catPolicies]) => (
            <div key={category}>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xl">{categoryIcons[category]}</span>
                <h2 className="text-lg font-semibold text-slate-800">
                  {categories.find((c) => c.value === category)?.label || "General"}
                </h2>
                <Badge variant="outline" className="ml-2">{catPolicies.length}</Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {catPolicies.map((policy) => (
                  <PolicyCard key={policy.id} policy={policy} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        // Flat view when category is selected
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPolicies.map((policy) => (
            <PolicyCard key={policy.id} policy={policy} />
          ))}
        </div>
      )}
    </div>
  );
}

function PolicyCard({ policy }) {
  const category = policy.category || "general";
  
  return (
    <Card className={`border shadow-sm hover:shadow-md transition-shadow ${categoryColors[category]?.split(" ")[2] || ""}`}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <Badge className={`${categoryColors[category]} mb-2`}>
              {categories.find((c) => c.value === category)?.label || "General"}
            </Badge>
            <h3 className="font-semibold text-slate-800 mb-1">{policy.title}</h3>
            {policy.description && (
              <p className="text-sm text-slate-500 line-clamp-2 mb-3">{policy.description}</p>
            )}
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
              {policy.version && (
                <span className="flex items-center gap-1">
                  <Tag className="w-3 h-3" /> v{policy.version}
                </span>
              )}
              {policy.effective_date && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {format(new Date(policy.effective_date), "MMM d, yyyy")}
                </span>
              )}
            </div>
          </div>
        </div>
        <Button
          className="w-full mt-4 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200"
          onClick={() => window.open(policy.file_url, "_blank")}
        >
          <ExternalLink className="w-4 h-4 mr-2" /> View Policy
        </Button>
      </CardContent>
    </Card>
  );
}