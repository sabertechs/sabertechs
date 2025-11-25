import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Download, FileText, Search, Filter } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function MyPayslips() {
  const [user, setUser] = useState(null);
  const [yearFilter, setYearFilter] = useState("all");
  const [selectedPayslip, setSelectedPayslip] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
    };
    fetchUser();
  }, []);

  const { data: payslips = [] } = useQuery({
    queryKey: ['payslips', user?.email],
    queryFn: () => base44.entities.Payslip.filter({ employee_email: user?.email }, '-created_date'),
    enabled: !!user?.email,
  });

  const years = [...new Set(payslips.map(p => p.year))].sort((a, b) => b - a);

  const filteredPayslips = yearFilter === "all" 
    ? payslips 
    : payslips.filter(p => p.year.toString() === yearFilter);

  const totalEarnings = filteredPayslips
    .filter(p => p.payment_status === 'paid')
    .reduce((sum, p) => sum + (p.net_salary || 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">My Payslips</h2>
        <p className="text-slate-500">View and download your salary statements</p>
      </div>

      {/* Summary Card */}
      <Card className="border-0 shadow-sm bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <p className="text-indigo-100">Total Earnings ({yearFilter === 'all' ? 'All Time' : yearFilter})</p>
              <p className="text-3xl font-bold mt-1">₹{totalEarnings.toLocaleString()}</p>
            </div>
            <div className="flex items-center gap-2">
              <FileText className="w-12 h-12 text-indigo-200" />
              <div>
                <p className="text-2xl font-bold">{filteredPayslips.length}</p>
                <p className="text-indigo-100">Payslips</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filter */}
      <Card className="border-0 shadow-sm">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <Select value={yearFilter} onValueChange={setYearFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                {years.map(year => (
                  <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Payslips Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPayslips.map((payslip) => (
          <Card key={payslip.id} className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedPayslip(payslip)}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-lg font-semibold text-slate-800">{payslip.month} {payslip.year}</p>
                  <Badge className={payslip.payment_status === 'paid' ? 'bg-green-100 text-green-700 mt-1' : 'bg-amber-100 text-amber-700 mt-1'}>
                    {payslip.payment_status}
                  </Badge>
                </div>
                <div className="p-3 bg-indigo-100 rounded-xl">
                  <FileText className="w-5 h-5 text-indigo-600" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Gross Salary</span>
                  <span className="font-medium">₹{payslip.gross_salary?.toLocaleString() || '-'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Deductions</span>
                  <span className="font-medium text-red-600">-₹{((payslip.pf_deduction || 0) + (payslip.tax_deduction || 0) + (payslip.other_deductions || 0)).toLocaleString()}</span>
                </div>
                <div className="pt-2 border-t flex justify-between">
                  <span className="font-medium text-slate-700">Net Salary</span>
                  <span className="font-bold text-indigo-600">₹{payslip.net_salary?.toLocaleString()}</span>
                </div>
              </div>
              {payslip.payslip_url && (
                <a href={payslip.payslip_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                  <Button className="w-full mt-4" variant="outline">
                    <Download className="w-4 h-4 mr-2" /> Download
                  </Button>
                </a>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredPayslips.length === 0 && (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-12 text-center">
            <FileText className="w-16 h-16 mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-semibold text-slate-800">No Payslips Found</h3>
            <p className="text-slate-500 mt-1">Your payslips will appear here once generated</p>
          </CardContent>
        </Card>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selectedPayslip} onOpenChange={() => setSelectedPayslip(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Payslip Details - {selectedPayslip?.month} {selectedPayslip?.year}</DialogTitle>
          </DialogHeader>
          {selectedPayslip && (
            <div className="space-y-4">
              <div className="bg-slate-50 rounded-xl p-4">
                <h4 className="font-semibold text-slate-800 mb-3">Earnings</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Basic Salary</span>
                    <span>₹{selectedPayslip.basic_salary?.toLocaleString() || '-'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">HRA</span>
                    <span>₹{selectedPayslip.hra?.toLocaleString() || '-'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">DA</span>
                    <span>₹{selectedPayslip.da?.toLocaleString() || '-'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Other Allowances</span>
                    <span>₹{selectedPayslip.other_allowances?.toLocaleString() || '-'}</span>
                  </div>
                  <div className="flex justify-between font-medium pt-2 border-t">
                    <span>Gross Salary</span>
                    <span className="text-green-600">₹{selectedPayslip.gross_salary?.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 rounded-xl p-4">
                <h4 className="font-semibold text-slate-800 mb-3">Deductions</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">PF</span>
                    <span>₹{selectedPayslip.pf_deduction?.toLocaleString() || '-'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Tax</span>
                    <span>₹{selectedPayslip.tax_deduction?.toLocaleString() || '-'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Other Deductions</span>
                    <span>₹{selectedPayslip.other_deductions?.toLocaleString() || '-'}</span>
                  </div>
                  <div className="flex justify-between font-medium pt-2 border-t">
                    <span>Total Deductions</span>
                    <span className="text-red-600">-₹{((selectedPayslip.pf_deduction || 0) + (selectedPayslip.tax_deduction || 0) + (selectedPayslip.other_deductions || 0)).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="bg-indigo-50 rounded-xl p-4">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-slate-800">Net Salary</span>
                  <span className="text-2xl font-bold text-indigo-600">₹{selectedPayslip.net_salary?.toLocaleString()}</span>
                </div>
              </div>

              {selectedPayslip.payslip_url && (
                <a href={selectedPayslip.payslip_url} target="_blank" rel="noopener noreferrer">
                  <Button className="w-full bg-indigo-600 hover:bg-indigo-700">
                    <Download className="w-4 h-4 mr-2" /> Download Payslip
                  </Button>
                </a>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}