import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Plus, Eye, CheckCircle, XCircle, Clock, TestTube, Settings, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function APIModule() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showTestDialog, setShowTestDialog] = useState(false);
  const [showTestPlusDialog, setShowTestPlusDialog] = useState(false);
  const [showConnectionTest, setShowConnectionTest] = useState(false);
  const [connectionTestResult, setConnectionTestResult] = useState(null);
  const [connectionTestLoading, setConnectionTestLoading] = useState(false);
  const [selectedVerification, setSelectedVerification] = useState(null);
  const [testPanNumber, setTestPanNumber] = useState("");
  const [testName, setTestName] = useState("");
  const [testResult, setTestResult] = useState(null);
  const [testLoading, setTestLoading] = useState(false);
  const [testPlusResult, setTestPlusResult] = useState(null);
  const [testPlusLoading, setTestPlusLoading] = useState(false);
  const [formData, setFormData] = useState({
    employee_email: "",
    employee_name: "",
    verification_type: "",
    request_data: {},
    notes: ""
  });

  const { data: verifications = [] } = useQuery({
    queryKey: ['apiVerifications'],
    queryFn: () => base44.entities.APIVerification.list('-created_date', 100)
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.APIVerification.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apiVerifications'] });
      setShowAddDialog(false);
      resetForm();
      toast.success('Verification request created');
    },
    onError: () => toast.error('Failed to create request')
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.APIVerification.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apiVerifications'] });
      setShowViewDialog(false);
      toast.success('Status updated');
    },
    onError: () => toast.error('Failed to update')
  });

  const resetForm = () => {
    setFormData({
      employee_email: "",
      employee_name: "",
      verification_type: "",
      request_data: {},
      notes: ""
    });
  };

  const handleCreate = () => {
    if (!formData.employee_email || !formData.verification_type) {
      toast.error('Please fill required fields');
      return;
    }
    createMutation.mutate(formData);
  };

  const handleStatusUpdate = (status) => {
    if (!selectedVerification) return;
    updateMutation.mutate({
      id: selectedVerification.id,
      data: { status }
    });
  };

  const handleTestPAN = async () => {
    if (!testPanNumber) {
      toast.error('Please enter PAN number');
      return;
    }
    
    // Validate PAN format (5 letters + 4 digits + 1 letter)
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    if (!panRegex.test(testPanNumber)) {
      toast.error('Invalid PAN format. Use: ABCDE1234F');
      return;
    }
    
    setTestLoading(true);
    setTestResult(null);
    
    try {
      const response = await base44.functions.invoke('verifyPAN', {
        pan_number: testPanNumber,
        name: testName || undefined
      });

      if (response.data.success) {
        setTestResult({ 
          success: true, 
          statusCode: response.data.statusCode,
          ...response.data.data 
        });
        toast.success('PAN verified successfully');
      } else {
        setTestResult({ 
          success: false,
          error: response.data.error || 'Verification failed',
          statusCode: response.data.statusCode,
          ...response.data.data 
        });
        toast.error(response.data.error || 'Verification failed');
      }
    } catch (error) {
      setTestResult({ 
        success: false, 
        error: error.message || 'Verification failed' 
      });
      toast.error(error.message || 'Verification failed');
    } finally {
      setTestLoading(false);
    }
  };

  const resetTest = () => {
    setTestPanNumber("");
    setTestName("");
    setTestResult(null);
  };

  const handleTestPANPlus = async () => {
    if (!testPanNumber) {
      toast.error('Please enter PAN number');
      return;
    }
    
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    if (!panRegex.test(testPanNumber)) {
      toast.error('Invalid PAN format. Use: ABCDE1234F');
      return;
    }
    
    setTestPlusLoading(true);
    setTestPlusResult(null);
    
    try {
      const response = await base44.functions.invoke('verifyPANPlus', {
        pan_number: testPanNumber
      });

      if (response.data.success) {
        setTestPlusResult({ 
          success: true, 
          statusCode: response.data.statusCode,
          ...response.data.data 
        });
        toast.success('PAN verified successfully with additional details');
      } else {
        setTestPlusResult({ 
          success: false,
          error: response.data.error || 'Verification failed',
          statusCode: response.data.statusCode,
          ...response.data.data 
        });
        toast.error(response.data.error || 'Verification failed');
      }
    } catch (error) {
      setTestPlusResult({ 
        success: false, 
        error: error.message || 'Verification failed' 
      });
      toast.error(error.message || 'Verification failed');
    } finally {
      setTestPlusLoading(false);
    }
  };

  const resetTestPlus = () => {
    setTestPanNumber("");
    setTestPlusResult(null);
  };

  const handleConnectionTest = async () => {
    setConnectionTestLoading(true);
    setConnectionTestResult(null);
    
    try {
      const response = await base44.functions.invoke('testDeepvueConnection', {});
      setConnectionTestResult(response.data);
      
      if (response.data.success) {
        toast.success('Connection successful!');
      } else {
        toast.error(response.data.finalMessage || 'Connection failed');
      }
    } catch (error) {
      setConnectionTestResult({
        success: false,
        finalMessage: error.message,
        steps: []
      });
      toast.error('Connection test failed');
    } finally {
      setConnectionTestLoading(false);
    }
  };

  const filteredVerifications = verifications.filter(v =>
    v.employee_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.employee_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.verification_type?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status) => {
    const styles = {
      pending: "bg-yellow-100 text-yellow-800",
      processing: "bg-blue-100 text-blue-800",
      completed: "bg-green-100 text-green-800",
      failed: "bg-red-100 text-red-800"
    };
    return <Badge className={styles[status] || ""}>{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">API Verification Module</h2>
          <p className="text-slate-600">Manual verification requests</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowConnectionTest(true)} variant="outline" className="border-blue-600 text-blue-600 hover:bg-blue-50">
            <Settings className="w-4 h-4 mr-2" />
            Test Connection
          </Button>
          <Button onClick={() => setShowTestDialog(true)} variant="outline" className="border-green-600 text-green-600 hover:bg-green-50">
            <TestTube className="w-4 h-4 mr-2" />
            Test PAN Basic
          </Button>
          <Button onClick={() => setShowTestPlusDialog(true)} variant="outline" className="border-purple-600 text-purple-600 hover:bg-purple-50">
            <TestTube className="w-4 h-4 mr-2" />
            Test PAN Plus
          </Button>
          <Button onClick={() => setShowAddDialog(true)} className="bg-indigo-600 hover:bg-indigo-700">
            <Plus className="w-4 h-4 mr-2" />
            New Request
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Verification Requests</CardTitle>
          <CardDescription>Manage API verification requests</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search by name, email, or type..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredVerifications.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-slate-500">
                    No verification requests found
                  </TableCell>
                </TableRow>
              ) : (
                filteredVerifications.map((verification) => (
                  <TableRow key={verification.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{verification.employee_name}</p>
                        <p className="text-sm text-slate-500">{verification.employee_email}</p>
                      </div>
                    </TableCell>
                    <TableCell className="capitalize">{verification.verification_type}</TableCell>
                    <TableCell>{getStatusBadge(verification.status)}</TableCell>
                    <TableCell>
                      {new Date(verification.created_date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedVerification(verification);
                          setShowViewDialog(true);
                        }}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>New Verification Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Employee Email *</Label>
                <Input
                  value={formData.employee_email}
                  onChange={(e) => setFormData({ ...formData, employee_email: e.target.value })}
                  placeholder="employee@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Employee Name *</Label>
                <Input
                  value={formData.employee_name}
                  onChange={(e) => setFormData({ ...formData, employee_name: e.target.value })}
                  placeholder="John Doe"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Verification Type *</Label>
              <Input
                value={formData.verification_type}
                onChange={(e) => setFormData({ ...formData, verification_type: e.target.value })}
                placeholder="e.g., background_check, document_verify"
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} className="bg-indigo-600 hover:bg-indigo-700">
              Create Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Test PAN Plus Dialog */}
      <Dialog open={showTestPlusDialog} onOpenChange={(open) => {
        setShowTestPlusDialog(open);
        if (!open) resetTestPlus();
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Test PAN Plus API - Enhanced Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>PAN Number *</Label>
              <Input
                value={testPanNumber}
                onChange={(e) => setTestPanNumber(e.target.value.toUpperCase())}
                placeholder="ABCDE1234F"
                maxLength={10}
                className="uppercase"
              />
              <p className="text-xs text-slate-500">Format: 5 letters + 4 digits + 1 letter</p>
            </div>

            <Button 
              onClick={handleTestPANPlus} 
              disabled={testPlusLoading}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              {testPlusLoading ? (
                <>
                  <Clock className="w-4 h-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <TestTube className="w-4 h-4 mr-2" />
                  Verify PAN Plus
                </>
              )}
            </Button>

            {testPlusResult && (
              <div className="mt-4 space-y-3">
                <div className={`flex items-center justify-between p-3 rounded-lg ${!testPlusResult.success ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
                  <span className={`font-semibold ${!testPlusResult.success ? 'text-red-800' : 'text-green-800'}`}>
                    API Response {testPlusResult.statusCode && `(${testPlusResult.statusCode})`}
                  </span>
                  <Badge className={!testPlusResult.success ? 'bg-red-600' : 'bg-green-600'}>
                    {testPlusResult.success ? 'Success' : 'Failed'}
                  </Badge>
                </div>

                {testPlusResult.success && (
                  <div className="p-4 bg-slate-50 rounded-lg space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs text-slate-600">PAN Number</Label>
                        <p className="font-medium">{testPlusResult.pan_number}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-slate-600">Category</Label>
                        <p className="font-medium">{testPlusResult.category}</p>
                      </div>
                      <div className="col-span-2">
                        <Label className="text-xs text-slate-600">Full Name</Label>
                        <p className="font-medium text-lg">{testPlusResult.full_name}</p>
                      </div>
                      {testPlusResult.father_name && (
                        <div className="col-span-2">
                          <Label className="text-xs text-slate-600">Father's Name</Label>
                          <p className="font-medium">{testPlusResult.father_name}</p>
                        </div>
                      )}
                      {testPlusResult.dob && (
                        <div>
                          <Label className="text-xs text-slate-600">Date of Birth</Label>
                          <p className="font-medium">{testPlusResult.dob}</p>
                        </div>
                      )}
                      {testPlusResult.gender && (
                        <div>
                          <Label className="text-xs text-slate-600">Gender</Label>
                          <p className="font-medium capitalize">{testPlusResult.gender}</p>
                        </div>
                      )}
                      {testPlusResult.masked_aadhaar && (
                        <div>
                          <Label className="text-xs text-slate-600">Masked Aadhaar</Label>
                          <p className="font-medium font-mono">{testPlusResult.masked_aadhaar}</p>
                        </div>
                      )}
                      <div>
                        <Label className="text-xs text-slate-600">Aadhaar Linked</Label>
                        <Badge className={testPlusResult.aadhaar_linked ? 'bg-green-600' : 'bg-red-600'}>
                          {testPlusResult.aadhaar_linked ? 'Yes' : 'No'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                )}

                {testPlusResult.error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <Label className="text-xs text-red-600">Error</Label>
                    <p className="text-sm text-red-800 font-medium mt-1">{testPlusResult.error}</p>
                  </div>
                )}

                <details className="pt-2">
                  <summary className="text-xs text-slate-600 cursor-pointer hover:text-slate-800">
                    View Full Response JSON
                  </summary>
                  <pre className="mt-2 p-3 bg-slate-900 text-slate-100 rounded text-xs overflow-auto max-h-48">
                    {JSON.stringify(testPlusResult, null, 2)}
                  </pre>
                </details>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowTestPlusDialog(false);
              resetTestPlus();
            }}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Test PAN Dialog */}
      <Dialog open={showTestDialog} onOpenChange={(open) => {
        setShowTestDialog(open);
        if (!open) resetTest();
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Test PAN Basic Verification API</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>PAN Number *</Label>
                <Input
                  value={testPanNumber}
                  onChange={(e) => setTestPanNumber(e.target.value.toUpperCase())}
                  placeholder="ABCDE1234F"
                  maxLength={10}
                  className="uppercase"
                />
                <p className="text-xs text-slate-500">Format: 5 letters + 4 digits + 1 letter</p>
              </div>
              <div className="space-y-2">
                <Label>Name (Optional)</Label>
                <Input
                  value={testName}
                  onChange={(e) => setTestName(e.target.value)}
                  placeholder="John Doe"
                />
              </div>
            </div>

            <Button 
              onClick={handleTestPAN} 
              disabled={testLoading}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              {testLoading ? (
                <>
                  <Clock className="w-4 h-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <TestTube className="w-4 h-4 mr-2" />
                  Verify PAN
                </>
              )}
            </Button>

            {testResult && (
              <div className="mt-4 space-y-3">
                <div className={`flex items-center justify-between p-3 rounded-lg ${!testResult.success ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
                  <span className={`font-semibold ${!testResult.success ? 'text-red-800' : 'text-green-800'}`}>
                    API Response {testResult.statusCode && `(${testResult.statusCode})`}
                  </span>
                  <Badge className={!testResult.success ? 'bg-red-600' : 'bg-green-600'}>
                    {testResult.success ? 'Success' : 'Failed'}
                  </Badge>
                </div>

                {testResult.success && testResult.data ? (
                  <div className="p-4 bg-slate-50 rounded-lg space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs text-slate-600">PAN Number</Label>
                        <p className="font-medium">{testResult.data.pan_number || testPanNumber}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-slate-600">Status</Label>
                        <p className="font-medium text-green-600">{testResult.data.status || 'Valid'}</p>
                      </div>
                      {testResult.data.name && (
                        <div>
                          <Label className="text-xs text-slate-600">Name</Label>
                          <p className="font-medium">{testResult.data.name}</p>
                        </div>
                      )}
                      {testResult.data.category && (
                        <div>
                          <Label className="text-xs text-slate-600">Category</Label>
                          <p className="font-medium">{testResult.data.category}</p>
                        </div>
                      )}
                    </div>

                    {testResult.transaction_id && (
                      <div className="pt-3 border-t border-slate-200">
                        <Label className="text-xs text-slate-600">Transaction ID</Label>
                        <p className="text-sm font-mono text-slate-700">{testResult.transaction_id}</p>
                      </div>
                    )}
                  </div>
                ) : testResult.error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <Label className="text-xs text-red-600">Error</Label>
                    <p className="text-sm text-red-800 font-medium mt-1">{testResult.error}</p>
                  </div>
                )}

                <details className="pt-2">
                  <summary className="text-xs text-slate-600 cursor-pointer hover:text-slate-800">
                    View Full Response JSON
                  </summary>
                  <pre className="mt-2 p-3 bg-slate-900 text-slate-100 rounded text-xs overflow-auto max-h-48">
                    {JSON.stringify(testResult, null, 2)}
                  </pre>
                </details>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowTestDialog(false);
              resetTest();
            }}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Connection Test Dialog */}
      <Dialog open={showConnectionTest} onOpenChange={setShowConnectionTest}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Deepvue Connection Test</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div>
                <p className="font-semibold text-blue-900">Connection Diagnostics</p>
                <p className="text-sm text-blue-700">Tests credentials, authorization, and API connectivity</p>
              </div>
              <Button 
                onClick={handleConnectionTest} 
                disabled={connectionTestLoading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {connectionTestLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <TestTube className="w-4 h-4 mr-2" />
                    Run Test
                  </>
                )}
              </Button>
            </div>

            {connectionTestResult && (
              <div className="space-y-3">
                <div className={`p-4 rounded-lg border-2 ${connectionTestResult.success ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500'}`}>
                  <div className="flex items-center gap-2">
                    {connectionTestResult.success ? (
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    ) : (
                      <AlertCircle className="w-6 h-6 text-red-600" />
                    )}
                    <div>
                      <p className={`font-bold ${connectionTestResult.success ? 'text-green-900' : 'text-red-900'}`}>
                        {connectionTestResult.success ? 'All Tests Passed' : 'Test Failed'}
                      </p>
                      <p className={`text-sm ${connectionTestResult.success ? 'text-green-700' : 'text-red-700'}`}>
                        {connectionTestResult.finalMessage}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Test Steps:</Label>
                  {connectionTestResult.steps.map((step, idx) => (
                    <div key={idx} className="border rounded-lg p-3 bg-slate-50">
                      <div className="flex items-start gap-3">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                          step.status === 'success' ? 'bg-green-500' : 
                          step.status === 'failed' ? 'bg-red-500' : 
                          step.status === 'info' ? 'bg-blue-500' : 'bg-yellow-500'
                        }`}>
                          {step.status === 'success' ? (
                            <CheckCircle className="w-4 h-4 text-white" />
                          ) : step.status === 'failed' ? (
                            <XCircle className="w-4 h-4 text-white" />
                          ) : (
                            <span className="text-white text-xs font-bold">{step.step}</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{step.message}</p>
                          {step.data && (
                            <details className="mt-2">
                              <summary className="text-xs text-slate-600 cursor-pointer hover:text-slate-800">
                                View Details
                              </summary>
                              <pre className="mt-1 p-2 bg-slate-900 text-slate-100 rounded text-xs overflow-auto max-h-32">
                                {JSON.stringify(step.data, null, 2)}
                              </pre>
                            </details>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConnectionTest(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Verification Details</DialogTitle>
          </DialogHeader>
          {selectedVerification && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-600">Employee</Label>
                  <p className="font-medium">{selectedVerification.employee_name}</p>
                  <p className="text-sm text-slate-500">{selectedVerification.employee_email}</p>
                </div>
                <div>
                  <Label className="text-slate-600">Status</Label>
                  <div className="mt-1">{getStatusBadge(selectedVerification.status)}</div>
                </div>
              </div>
              <div>
                <Label className="text-slate-600">Verification Type</Label>
                <p className="font-medium capitalize">{selectedVerification.verification_type}</p>
              </div>
              {selectedVerification.notes && (
                <div>
                  <Label className="text-slate-600">Notes</Label>
                  <p className="text-sm">{selectedVerification.notes}</p>
                </div>
              )}
              <div className="flex gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => handleStatusUpdate('processing')}
                  disabled={selectedVerification.status === 'processing'}
                >
                  <Clock className="w-4 h-4 mr-2" />
                  Set Processing
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 text-green-600 hover:text-green-700"
                  onClick={() => handleStatusUpdate('completed')}
                  disabled={selectedVerification.status === 'completed'}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Mark Complete
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 text-red-600 hover:text-red-700"
                  onClick={() => handleStatusUpdate('failed')}
                  disabled={selectedVerification.status === 'failed'}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Mark Failed
                </Button>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowViewDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}