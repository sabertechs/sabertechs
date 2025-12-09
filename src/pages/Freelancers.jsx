import React, { useState, useMemo, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  Search,
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  CheckCircle,
  Clock,
  XCircle,
  Download,
  FileText,
  ShieldCheck,
  Loader2,
  ArrowUpDown,
  FileSpreadsheet,
  UserCheck,
  UserX,
  FolderDown,
  ChevronLeft,
  ChevronRight,
  Archive,
  CreditCard,
  User,
  MapPin,
  Briefcase,
  MessageCircle
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SendWhatsAppDialog from "@/components/whatsapp/SendWhatsAppDialog";

export default function Freelancers() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [bgvFilter, setBgvFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [designationFilter, setDesignationFilter] = useState("all");
  const [joiningDateFrom, setJoiningDateFrom] = useState("");
  const [joiningDateTo, setJoiningDateTo] = useState("");
  const [sortField, setSortField] = useState("created_date");
  const [sortOrder, setSortOrder] = useState("desc");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showBulkActionDialog, setShowBulkActionDialog] = useState(false);
  const [bulkStatus, setBulkStatus] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [downloading, setDownloading] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [showWhatsAppDialog, setShowWhatsAppDialog] = useState(false);
  const [whatsAppEmployee, setWhatsAppEmployee] = useState(null);
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const employeesPerPage = 40;
  const [formData, setFormData] = useState({
    full_name: "",
    father_name: "",
    email: "",
    phone: "",
    department: "",
    designation: "",
    employment_type: "contractual",
    contract_end_date: "",
    date_of_joining: "",
    salary: "",
    status: "active",
    role: "employee"
  });

  // Fetch only contractual employees
  const { data: allEmployees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list('-created_date'),
    staleTime: 5000,
  });

  const employees = useMemo(() => allEmployees.filter(emp => emp.employment_type === 'contractual'), [allEmployees]);

  const { data: offerLetters = [] } = useQuery({
    queryKey: ['offerLetters'],
    queryFn: () => base44.entities.OfferLetter.list(),
    staleTime: 60000,
  });

  const { data: appSettings = [] } = useQuery({
    queryKey: ['appSettings'],
    queryFn: () => base44.entities.AppSettings.list(),
    staleTime: 60000,
  });

  const settingsDepartments = useMemo(() => {
    const setting = appSettings.find(s => s.setting_key === 'departments');
    return setting?.setting_value || [];
  }, [appSettings]);

  const settingsDesignations = useMemo(() => {
    const setting = appSettings.find(s => s.setting_key === 'designations');
    return setting?.setting_value || [];
  }, [appSettings]);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Employee.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setShowAddDialog(false);
      resetForm();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Employee.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setShowAddDialog(false);
      setSelectedEmployee(null);
      resetForm();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Employee.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['employees'] })
  });

  const resetForm = () => {
    setFormData({
      full_name: "",
      father_name: "",
      email: "",
      phone: "",
      department: "",
      designation: "",
      employment_type: "contractual",
      contract_end_date: "",
      date_of_joining: "",
      salary: "",
      status: "active",
      role: "employee"
    });
  };

  const handleEdit = (employee) => {
    setShowViewDialog(false);
    setSelectedEmployee(employee);
    setFormData({
      full_name: employee.full_name || "",
      father_name: employee.father_name || "",
      email: employee.email || "",
      phone: employee.phone || "",
      department: employee.department || "",
      designation: employee.designation || "",
      employment_type: employee.employment_type || "contractual",
      contract_end_date: employee.contract_end_date || "",
      date_of_joining: employee.date_of_joining || "",
      salary: employee.salary || "",
      status: employee.status || "active",
      role: employee.role || "employee"
    });
    setShowAddDialog(true);
  };

  const handleSubmit = () => {
    if (selectedEmployee) {
      updateMutation.mutate({ id: selectedEmployee.id, data: formData });
    } else {
      createMutation.mutate({ ...formData, employment_type: "contractual", bg_verification_status: "pending" });
    }
  };

  const getOfferLetter = useCallback((email) => offerLetters.find(ol => ol.employee_email === email), [offerLetters]);

  const toggleSelectEmployee = (empId) => {
    setSelectedEmployees(prev => 
      prev.includes(empId) ? prev.filter(id => id !== empId) : [...prev, empId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedEmployees.length === filteredEmployees.length) {
      setSelectedEmployees([]);
    } else {
      setSelectedEmployees(filteredEmployees.map(e => e.id));
    }
  };

  const filteredEmployees = useMemo(() => {
    const searchLower = search.toLowerCase();
    return employees.filter(emp => {
      const matchesSearch = emp.full_name?.toLowerCase().includes(searchLower) ||
                                 emp.email?.toLowerCase().includes(searchLower) ||
                                 emp.phone?.includes(search);
      const matchesStatus = statusFilter === "all" || emp.status === statusFilter;
      const matchesBgv = bgvFilter === "all" || emp.bg_verification_status === bgvFilter;
      const matchesDept = departmentFilter === "all" || emp.department === departmentFilter;
      const matchesDesignation = designationFilter === "all" || emp.designation === designationFilter;
      
      let matchesJoiningDate = true;
      if (joiningDateFrom && emp.date_of_joining) {
        matchesJoiningDate = matchesJoiningDate && emp.date_of_joining >= joiningDateFrom;
      }
      if (joiningDateTo && emp.date_of_joining) {
        matchesJoiningDate = matchesJoiningDate && emp.date_of_joining <= joiningDateTo;
      }
      
      return matchesSearch && matchesStatus && matchesBgv && matchesDept && matchesDesignation && matchesJoiningDate;
    }).sort((a, b) => {
      let aVal = a[sortField] || '';
      let bVal = b[sortField] || '';
      
      if (sortField === 'salary') {
        aVal = parseFloat(aVal) || 0;
        bVal = parseFloat(bVal) || 0;
      }
      
      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });
  }, [employees, search, statusFilter, bgvFilter, departmentFilter, designationFilter, joiningDateFrom, joiningDateTo, sortField, sortOrder]);

  const departments = useMemo(() => [...new Set(employees.map(e => e.department).filter(Boolean))], [employees]);
  const designations = useMemo(() => [...new Set(employees.map(e => e.designation).filter(Boolean))], [employees]);

  const totalPages = Math.ceil(filteredEmployees.length / employeesPerPage);
  const paginatedEmployees = filteredEmployees.slice(
    (currentPage - 1) * employeesPerPage,
    currentPage * employeesPerPage
  );

  React.useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, bgvFilter, departmentFilter, designationFilter, joiningDateFrom, joiningDateTo]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const handleBulkStatusUpdate = async () => {
    if (!bulkStatus || selectedEmployees.length === 0) return;
    
    for (const empId of selectedEmployees) {
      await base44.entities.Employee.update(empId, { status: bulkStatus });
    }
    
    queryClient.invalidateQueries(['employees']);
    setSelectedEmployees([]);
    setShowBulkActionDialog(false);
    setBulkStatus("");
  };

  const exportToCSV = () => {
    const headers = [
      "Full Name", "Father Name", "Email", "Phone", "Date of Birth", "Gender",
      "Address", "Locality", "City", "State", "Pincode",
      "Aadhaar Number", "PAN Number", "Department", "Designation",
      "Date of Joining", "Contract End Date", "Salary", "Role", "Status", "BGV Status"
    ];
    
    const dataToExport = selectedEmployees.length > 0 
      ? filteredEmployees.filter(emp => selectedEmployees.includes(emp.id))
      : filteredEmployees;
    
    const rows = dataToExport.map(emp => [
      emp.full_name || '',
      emp.father_name || '',
      emp.email || '',
      emp.phone || '',
      emp.date_of_birth || '',
      emp.gender || '',
      emp.address || '',
      emp.locality || '',
      emp.city || '',
      emp.state || '',
      emp.pincode || '',
      emp.aadhaar_number || '',
      emp.pan_number || '',
      emp.department || '',
      emp.designation || '',
      emp.date_of_joining || '',
      emp.contract_end_date || '',
      emp.salary || '',
      emp.role || '',
      emp.status || '',
      emp.bg_verification_status || ''
    ].map(val => `"${val}"`).join(','));
    
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `freelancers_export_${format(new Date(), 'yyyyMMdd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setBgvFilter("all");
    setDepartmentFilter("all");
    setDesignationFilter("all");
    setJoiningDateFrom("");
    setJoiningDateTo("");
    setSortField("created_date");
    setSortOrder("desc");
  };

  const bgvStatusIcon = (status) => {
    switch (status) {
      case 'approved': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'rejected': return <XCircle className="w-4 h-4 text-red-600" />;
      default: return <Clock className="w-4 h-4 text-amber-600" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Freelancers</h2>
          <p className="text-slate-500">Manage contractual employees</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={exportToCSV}
            className="border-green-600 text-green-600 hover:bg-green-50"
          >
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Export All
          </Button>
          <Button 
            variant="outline"
            onClick={() => setShowDeleteAllDialog(true)}
            className="border-red-600 text-red-600 hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete All
          </Button>
          <Button onClick={() => { resetForm(); setSelectedEmployee(null); setShowAddDialog(true); }} className="bg-purple-600 hover:bg-purple-700">
            <Plus className="w-4 h-4 mr-2" />
            Add Freelancer
          </Button>
        </div>
      </div>

      {/* Filters - same as Employees but without employment type filter */}
      <Card className="border-0 shadow-sm">
        <CardContent className="pt-6 space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                placeholder="Search freelancers..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-36">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Select value={bgvFilter} onValueChange={setBgvFilter}>
              <SelectTrigger className="w-full md:w-36">
                <SelectValue placeholder="BGV Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All BGV</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map(dept => (
                  <SelectItem key={dept} value={dept} className="capitalize">{dept}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex flex-col md:flex-row gap-4">
            <Select value={designationFilter} onValueChange={setDesignationFilter}>
              <SelectTrigger className="w-full md:w-44">
                <SelectValue placeholder="Designation" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Designations</SelectItem>
                {designations.map(des => (
                  <SelectItem key={des} value={des}>{des}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Label className="text-sm text-slate-500 whitespace-nowrap">Joining:</Label>
              <Input
                type="date"
                value={joiningDateFrom}
                onChange={(e) => setJoiningDateFrom(e.target.value)}
                className="w-36"
                placeholder="From"
              />
              <span className="text-slate-400">to</span>
              <Input
                type="date"
                value={joiningDateTo}
                onChange={(e) => setJoiningDateTo(e.target.value)}
                className="w-36"
                placeholder="To"
              />
            </div>
            <Select value={`${sortField}-${sortOrder}`} onValueChange={(v) => {
              const [field, order] = v.split('-');
              setSortField(field);
              setSortOrder(order);
            }}>
              <SelectTrigger className="w-full md:w-44">
                <SelectValue placeholder="Sort By" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created_date-desc">Newest First</SelectItem>
                <SelectItem value="created_date-asc">Oldest First</SelectItem>
                <SelectItem value="full_name-asc">Name A-Z</SelectItem>
                <SelectItem value="full_name-desc">Name Z-A</SelectItem>
                <SelectItem value="date_of_joining-desc">Joining (Latest)</SelectItem>
                <SelectItem value="date_of_joining-asc">Joining (Earliest)</SelectItem>
                <SelectItem value="salary-desc">Salary (High-Low)</SelectItem>
                <SelectItem value="salary-asc">Salary (Low-High)</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={clearFilters}>
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedEmployees.length > 0 && (
        <Card className="border-0 shadow-sm bg-purple-50">
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <span className="text-purple-700 font-medium">
                {selectedEmployees.length} freelancer(s) selected
              </span>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => setShowBulkActionDialog(true)}
                  className="border-purple-300 text-purple-700 hover:bg-purple-100"
                >
                  <UserCheck className="w-4 h-4 mr-1" />
                  Update Status
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={exportToCSV}
                  className="border-green-300 text-green-700 hover:bg-green-100"
                >
                  <FileSpreadsheet className="w-4 h-4 mr-1" />
                  Export CSV
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost"
                  onClick={() => setSelectedEmployees([])}
                  className="text-slate-500"
                >
                  Clear Selection
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Employee List - Similar to Employees page */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-4 py-4">
                    <Checkbox 
                      checked={selectedEmployees.length === filteredEmployees.length && filteredEmployees.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </th>
                  <th className="text-left px-4 py-4 text-sm font-medium text-slate-500 cursor-pointer hover:text-purple-600" onClick={() => handleSort('full_name')}>
                    <div className="flex items-center gap-1">
                      Freelancer
                      {sortField === 'full_name' && <ArrowUpDown className="w-3 h-3" />}
                    </div>
                  </th>
                  <th className="text-left px-4 py-4 text-sm font-medium text-slate-500">Department</th>
                  <th className="text-left px-4 py-4 text-sm font-medium text-slate-500">Designation</th>
                  <th className="text-left px-4 py-4 text-sm font-medium text-slate-500">Status</th>
                  <th className="text-left px-4 py-4 text-sm font-medium text-slate-500">BGV Status</th>
                  <th className="text-left px-4 py-4 text-sm font-medium text-slate-500 cursor-pointer hover:text-purple-600" onClick={() => handleSort('date_of_joining')}>
                    <div className="flex items-center gap-1">
                      Joined
                      {sortField === 'date_of_joining' && <ArrowUpDown className="w-3 h-3" />}
                    </div>
                  </th>
                  <th className="text-left px-4 py-4 text-sm font-medium text-slate-500">Contract End</th>
                  <th className="text-right px-4 py-4 text-sm font-medium text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedEmployees.map((emp) => (
                  <tr key={emp.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-4">
                      <Checkbox 
                        checked={selectedEmployees.includes(emp.id)}
                        onCheckedChange={() => toggleSelectEmployee(emp.id)}
                      />
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        {emp.profile_photo ? (
                          <img src={emp.profile_photo} alt="" className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-semibold">
                            {emp.full_name?.[0] || 'F'}
                          </div>
                        )}
                        <div>
                          <button 
                            onClick={() => { setSelectedEmployee(emp); setShowViewDialog(true); }}
                            className="font-medium text-slate-800 hover:text-purple-600 hover:underline text-left"
                          >
                            {emp.full_name}
                          </button>
                          <p className="text-sm text-slate-500">{emp.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 capitalize text-slate-600">{emp.department || '-'}</td>
                    <td className="px-4 py-4 text-slate-600">{emp.designation || '-'}</td>
                    <td className="px-4 py-4">
                      <Badge className={
                        emp.status === 'active' ? 'bg-green-100 text-green-700' :
                        emp.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                        'bg-slate-100 text-slate-700'
                      }>
                        {emp.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        {bgvStatusIcon(emp.bg_verification_status)}
                        <Badge className={
                          emp.bg_verification_status === 'approved' ? 'bg-green-100 text-green-700' :
                          emp.bg_verification_status === 'rejected' ? 'bg-red-100 text-red-700' :
                          'bg-amber-100 text-amber-700'
                        }>
                          {emp.bg_verification_status || 'pending'}
                        </Badge>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-slate-600">
                      {emp.date_of_joining && !isNaN(new Date(emp.date_of_joining).getTime()) ? format(new Date(emp.date_of_joining), 'MMM d, yyyy') : '-'}
                    </td>
                    <td className="px-4 py-4 text-slate-600">
                      {emp.contract_end_date && !isNaN(new Date(emp.contract_end_date).getTime()) ? format(new Date(emp.contract_end_date), 'MMM d, yyyy') : '-'}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setSelectedEmployee(emp); setShowViewDialog(true); }}>
                            <Eye className="w-4 h-4 mr-2" /> View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEdit(emp)}>
                            <Edit className="w-4 h-4 mr-2" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => { setWhatsAppEmployee(emp); setShowWhatsAppDialog(true); }}>
                            <MessageCircle className="w-4 h-4 mr-2 text-green-600" /> Send WhatsApp
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => deleteMutation.mutate(emp.id)} className="text-red-600">
                            <Trash2 className="w-4 h-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-4 border-t border-slate-100">
              <p className="text-sm text-slate-500">
                Showing {((currentPage - 1) * employeesPerPage) + 1} to {Math.min(currentPage * employeesPerPage, filteredEmployees.length)} of {filteredEmployees.length} freelancers
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                    if (
                      page === 1 ||
                      page === totalPages ||
                      (page >= currentPage - 1 && page <= currentPage + 1)
                    ) {
                      return (
                        <Button
                          key={page}
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(page)}
                          className={currentPage === page ? "bg-purple-600 hover:bg-purple-700" : ""}
                        >
                          {page}
                        </Button>
                      );
                    } else if (
                      page === currentPage - 2 ||
                      page === currentPage + 2
                    ) {
                      return <span key={page} className="px-1 text-slate-400">...</span>;
                    }
                    return null;
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedEmployee ? 'Edit Freelancer' : 'Add New Freelancer'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label>Full Name *</Label>
              <Input
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Phone *</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Department</Label>
              <Select value={formData.department} onValueChange={(v) => setFormData({ ...formData, department: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {settingsDepartments.map(dept => (
                    <SelectItem key={dept.id} value={dept.id} className="capitalize">{dept.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Designation</Label>
              <Select value={formData.designation} onValueChange={(v) => setFormData({ ...formData, designation: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select designation" />
                </SelectTrigger>
                <SelectContent>
                  {settingsDesignations.map(des => (
                    <SelectItem key={des.id} value={des.id}>{des.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Date of Joining</Label>
              <Input
                type="date"
                value={formData.date_of_joining}
                onChange={(e) => setFormData({ ...formData, date_of_joining: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Contract End Date</Label>
              <Input
                type="date"
                value={formData.contract_end_date}
                onChange={(e) => setFormData({ ...formData, contract_end_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Salary</Label>
              <Input
                type="number"
                value={formData.salary}
                onChange={(e) => setFormData({ ...formData, salary: parseFloat(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button onClick={handleSubmit} className="bg-purple-600 hover:bg-purple-700">
              {selectedEmployee ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Status Update Dialog */}
      <Dialog open={showBulkActionDialog} onOpenChange={setShowBulkActionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Freelancer Status</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-slate-600">
              Update status for {selectedEmployees.length} selected freelancer(s)
            </p>
            <Select value={bulkStatus} onValueChange={setBulkStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Select new status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="terminated">Terminated</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkActionDialog(false)}>Cancel</Button>
            <Button 
              onClick={handleBulkStatusUpdate} 
              disabled={!bulkStatus}
              className="bg-purple-600 hover:bg-purple-700"
            >
              Update Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog - Simplified version */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Freelancer Details</DialogTitle>
          </DialogHeader>
          {selectedEmployee && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 pb-4 border-b">
                {selectedEmployee.profile_photo ? (
                  <img src={selectedEmployee.profile_photo} alt="" className="w-20 h-20 rounded-full object-cover" />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-2xl font-bold">
                    {selectedEmployee.full_name?.[0] || 'F'}
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-slate-800">{selectedEmployee.full_name}</h3>
                  <p className="text-slate-500">{selectedEmployee.designation} • {selectedEmployee.department}</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <Badge className="bg-purple-100 text-purple-700">Contractual</Badge>
                    <Badge className={
                      selectedEmployee.status === 'active' ? 'bg-green-100 text-green-700' :
                      'bg-amber-100 text-amber-700'
                    }>
                      {selectedEmployee.status}
                    </Badge>
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={() => handleEdit(selectedEmployee)}>
                  <Edit className="w-4 h-4 mr-1" /> Edit
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-sm text-slate-500">Email</p>
                  <p className="font-medium">{selectedEmployee.email}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-sm text-slate-500">Phone</p>
                  <p className="font-medium">{selectedEmployee.phone}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-sm text-slate-500">Date of Joining</p>
                  <p className="font-medium">{selectedEmployee.date_of_joining && !isNaN(new Date(selectedEmployee.date_of_joining).getTime()) ? format(new Date(selectedEmployee.date_of_joining), 'MMM d, yyyy') : '-'}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-sm text-slate-500">Contract End Date</p>
                  <p className="font-medium">{selectedEmployee.contract_end_date && !isNaN(new Date(selectedEmployee.contract_end_date).getTime()) ? format(new Date(selectedEmployee.contract_end_date), 'MMM d, yyyy') : '-'}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-sm text-slate-500">Salary</p>
                  <p className="font-medium">₹{selectedEmployee.salary?.toLocaleString() || '-'}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* WhatsApp Dialog */}
      <SendWhatsAppDialog 
        open={showWhatsAppDialog} 
        onClose={() => { setShowWhatsAppDialog(false); setWhatsAppEmployee(null); }}
        employee={whatsAppEmployee}
      />

      {/* Delete All Dialog */}
      <Dialog open={showDeleteAllDialog} onOpenChange={setShowDeleteAllDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">Delete All Freelancers</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-slate-600">
              Are you sure you want to delete <strong>all {employees.length} freelancers</strong>? This action cannot be undone.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteAllDialog(false)}>Cancel</Button>
            <Button 
              onClick={async () => {
                setDeletingAll(true);
                for (const emp of employees) {
                  await base44.entities.Employee.delete(emp.id);
                }
                queryClient.invalidateQueries(['employees']);
                setDeletingAll(false);
                setShowDeleteAllDialog(false);
                toast.success('All freelancers deleted');
              }}
              disabled={deletingAll}
              className="bg-red-600 hover:bg-red-700"
            >
              {deletingAll ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
              Delete All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}