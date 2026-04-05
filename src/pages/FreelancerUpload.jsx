import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import {
  Download,
  Upload,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  Loader2,
  FileText
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export default function FreelancerUpload() {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResult, setUploadResult] = useState(null);
  const [errorLog, setErrorLog] = useState([]);

  const sampleData = [
    {
      full_name: "Jane Smith",
      father_name: "William Smith",
      email: "jane.smith@example.com",
      phone: "9876543210",
      date_of_birth: "20/03/1992",
      gender: "female",
      address: "456 Park Avenue",
      locality: "Central",
      city: "Delhi",
      state: "Delhi",
      pincode: "110001",
      aadhaar_number: "987654321098",
      pan_number: "XYZAB5678C",
      department: "design",
      designation: "Graphic Designer",
      date_of_joining: "01/06/2024",
      work_type: "online",
      status: "active"
    }
  ];

  const downloadSampleCSV = () => {
    const headers = [
      "full_name", "father_name", "email", "phone", "date_of_birth", "gender",
      "address", "locality", "city", "state", "pincode",
      "aadhaar_number", "pan_number", "department", "designation",
      "date_of_joining", "work_type", "status"
    ];

    const csvContent = [
      headers.join(","),
      ...sampleData.map(row => 
        headers.map(h => `"${row[h] || ''}"`).join(",")
      )
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'freelancer_upload_sample.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const parseCSV = (text) => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];
    
    const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
    const rows = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = [];
      let current = '';
      let inQuotes = false;
      
      for (const char of lines[i]) {
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      values.push(current.trim());
      
      const row = {};
      headers.forEach((h, idx) => {
        row[h] = values[idx] || '';
      });
      rows.push({ data: row, lineNumber: i + 1 });
    }
    
    return rows;
  };

  const parseDateDDMMYYYY = (dateStr) => {
    if (!dateStr) return null;
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const [day, month, year] = parts;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    return null;
  };

  const validateRow = (row, lineNumber) => {
    const errors = [];
    
    if (!row.full_name?.trim()) errors.push("Full name is required");
    if (!row.email?.trim()) errors.push("Email is required");
    if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) errors.push("Invalid email format");
    if (!row.phone?.trim()) errors.push("Phone is required");
    
    if (row.aadhaar_number && !/^\d{12}$/.test(row.aadhaar_number.replace(/\s/g, ''))) {
      errors.push("Aadhaar must be 12 digits");
    }
    
    if (row.pan_number && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(row.pan_number.toUpperCase())) {
      errors.push("Invalid PAN format");
    }
    
    if (row.gender && !['male', 'female', 'other'].includes(row.gender.toLowerCase())) {
      errors.push("Gender must be male, female, or other");
    }
    
    if (row.status && !['pending', 'active', 'inactive'].includes(row.status.toLowerCase())) {
      errors.push("Invalid status value");
    }

    if (row.date_of_birth && !parseDateDDMMYYYY(row.date_of_birth)) {
      errors.push("Date of birth must be in DD/MM/YYYY format");
    }

    if (row.date_of_joining && !parseDateDDMMYYYY(row.date_of_joining)) {
      errors.push("Date of joining must be in DD/MM/YYYY format");
    }

    return errors;
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    setUploadProgress(0);
    setUploadResult(null);
    setErrorLog([]);

    const text = await file.text();
    const rows = parseCSV(text);
    
    if (rows.length === 0) {
      setUploadResult({ success: 0, failed: 0, skipped: 0, total: 0 });
      setUploading(false);
      return;
    }

    const existingEmployees = await base44.entities.Employee.list();
    const existingEmails = new Set(existingEmployees.map(e => e.email?.toLowerCase().trim()));
    const existingPhones = new Set(existingEmployees.map(e => e.phone?.trim()).filter(Boolean));

    const errors = [];
    let successCount = 0;
    let failedCount = 0;
    let skippedCount = 0;

    const batchSize = 3;
    const delayBetweenBatches = 3000;
    const delayBetweenRecords = 800;
    
    for (let i = 0; i < rows.length; i++) {
      const { data, lineNumber } = rows[i];
      
      const emailLower = data.email?.toLowerCase().trim();
      const phoneTrimmed = data.phone?.trim();
      
      if (emailLower && existingEmails.has(emailLower)) {
        errors.push({
          line: lineNumber,
          email: data.email || 'N/A',
          name: data.full_name || 'N/A',
          errors: ['Freelancer with this email already exists - skipped'],
          skipped: true
        });
        skippedCount++;
        setUploadProgress(Math.round(((i + 1) / rows.length) * 100));
        continue;
      }
      
      if (phoneTrimmed && existingPhones.has(phoneTrimmed)) {
        errors.push({
          line: lineNumber,
          email: data.email || 'N/A',
          name: data.full_name || 'N/A',
          errors: ['Freelancer with this phone number already exists - skipped'],
          skipped: true
        });
        skippedCount++;
        setUploadProgress(Math.round(((i + 1) / rows.length) * 100));
        continue;
      }
      
      const validationErrors = validateRow(data, lineNumber);
      
      if (validationErrors.length > 0) {
        errors.push({
          line: lineNumber,
          email: data.email || 'N/A',
          name: data.full_name || 'N/A',
          errors: validationErrors
        });
        failedCount++;
      } else {
        let retries = 3;
        let success = false;
        
        while (retries > 0 && !success) {
          try {
            await base44.entities.Employee.create({
              full_name: data.full_name?.trim(),
              father_name: data.father_name?.trim() || '',
              email: data.email?.trim().toLowerCase(),
              phone: data.phone?.trim(),
              date_of_birth: parseDateDDMMYYYY(data.date_of_birth),
              gender: data.gender?.toLowerCase() || null,
              address: data.address?.trim() || '',
              locality: data.locality?.trim() || '',
              city: data.city?.trim() || '',
              state: data.state?.trim() || '',
              pincode: data.pincode?.trim() || '',
              aadhaar_number: data.aadhaar_number?.replace(/\s/g, '') || '',
              pan_number: data.pan_number?.toUpperCase() || '',
              department: data.department?.toLowerCase() || '',
              designation: data.designation?.trim() || '',
              date_of_joining: parseDateDDMMYYYY(data.date_of_joining),
              employment_type: 'contractual',
              role: 'freelancer',
              work_type: ['online', 'center_based', 'both'].includes(data.work_type?.toLowerCase()) ? data.work_type.toLowerCase() : 'online',
              status: data.status?.toLowerCase() || 'pending',
              bg_verification_status: 'pending'
            });
            successCount++;
            success = true;
            existingEmails.add(emailLower);
            if (phoneTrimmed) existingPhones.add(phoneTrimmed);
          } catch (err) {
            retries--;
            if (err.message?.toLowerCase().includes('rate limit') && retries > 0) {
              await new Promise(resolve => setTimeout(resolve, 5000 * (4 - retries)));
            } else if (retries === 0) {
              errors.push({
                line: lineNumber,
                email: data.email || 'N/A',
                name: data.full_name || 'N/A',
                errors: [err.message || 'Failed to create freelancer record']
              });
              failedCount++;
            }
          }
        }
        
        await new Promise(resolve => setTimeout(resolve, delayBetweenRecords));
        
        if ((i + 1) % batchSize === 0) {
          await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
        }
      }
      
      setUploadProgress(Math.round(((i + 1) / rows.length) * 100));
    }

    setErrorLog(errors);
    setUploadResult({
      success: successCount,
      failed: failedCount,
      skipped: skippedCount,
      total: rows.length
    });
    setUploading(false);
    e.target.value = '';
  };

  const downloadErrorLog = () => {
    if (errorLog.length === 0) return;

    const logContent = [
      `Freelancer Upload Error Log - ${format(new Date(), 'dd-MM-yyyy HH:mm:ss')}`,
      `${'='.repeat(60)}`,
      '',
      `Total Errors: ${errorLog.length}`,
      '',
      ...errorLog.map(err => [
        `Line ${err.line}: ${err.name} (${err.email})`,
        `  Errors: ${err.errors.join(', ')}`,
        ''
      ].join('\n'))
    ].join('\n');

    const blob = new Blob([logContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `freelancer_upload_errors_${format(new Date(), 'yyyyMMdd_HHmmss')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Freelancer Upload</h2>
        <p className="text-slate-500">Bulk upload contractual employees using CSV file</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Download Sample */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileSpreadsheet className="w-5 h-5 text-purple-600" />
              Download Sample Format
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-slate-600 text-sm">
              Download the sample CSV file to understand the required format. Fill in your freelancer data following the same structure.
            </p>
            <div className="bg-slate-50 rounded-lg p-4">
              <h4 className="font-medium text-sm mb-2">Required Fields:</h4>
              <ul className="text-xs text-slate-600 space-y-1">
                <li>• <strong>full_name</strong> - Freelancer's full name</li>
                <li>• <strong>email</strong> - Valid email address</li>
                <li>• <strong>phone</strong> - Contact number</li>
              </ul>
              <h4 className="font-medium text-sm mt-3 mb-2">Optional Fields:</h4>
              <ul className="text-xs text-slate-600 space-y-1">
                <li>• father_name, date_of_birth (DD/MM/YYYY), gender</li>
                <li>• address, locality, city, state, pincode</li>
                <li>• aadhaar_number (12 digits), pan_number</li>
                <li>• department, designation, date_of_joining (DD/MM/YYYY)</li>
                <li>• <strong>work_type</strong> (online/center_based/both)</li>
                <li>• status (pending/active/inactive)</li>
              </ul>
            </div>
            <Button onClick={downloadSampleCSV} className="w-full bg-purple-600 hover:bg-purple-700">
              <Download className="w-4 h-4 mr-2" />
              Download Sample CSV
            </Button>
          </CardContent>
        </Card>

        {/* Upload Section */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Upload className="w-5 h-5 text-green-600" />
              Upload Freelancer Data
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center hover:border-purple-400 transition-colors">
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleFileUpload}
                  disabled={uploading}
                />
                {uploading ? (
                  <div className="space-y-3">
                    <Loader2 className="w-10 h-10 mx-auto text-purple-500 animate-spin" />
                    <p className="text-slate-600">Uploading... {uploadProgress}%</p>
                    <Progress value={uploadProgress} className="w-full" />
                  </div>
                ) : (
                  <>
                    <FileText className="w-10 h-10 mx-auto text-slate-400 mb-3" />
                    <p className="text-slate-600 font-medium">Click to upload CSV file</p>
                    <p className="text-slate-400 text-sm mt-1">or drag and drop</p>
                  </>
                )}
              </label>
            </div>

            {uploadResult && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-green-50 rounded-lg p-3 text-center">
                    <CheckCircle className="w-5 h-5 text-green-600 mx-auto mb-1" />
                    <p className="text-lg font-bold text-green-700">{uploadResult.success}</p>
                    <p className="text-xs text-green-600">Successful</p>
                  </div>
                  <div className="bg-amber-50 rounded-lg p-3 text-center">
                    <AlertCircle className="w-5 h-5 text-amber-600 mx-auto mb-1" />
                    <p className="text-lg font-bold text-amber-700">{uploadResult.skipped}</p>
                    <p className="text-xs text-amber-600">Skipped (Duplicate)</p>
                  </div>
                  <div className="bg-red-50 rounded-lg p-3 text-center">
                    <AlertCircle className="w-5 h-5 text-red-600 mx-auto mb-1" />
                    <p className="text-lg font-bold text-red-700">{uploadResult.failed}</p>
                    <p className="text-xs text-red-600">Failed</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3 text-center">
                    <FileSpreadsheet className="w-5 h-5 text-slate-600 mx-auto mb-1" />
                    <p className="text-lg font-bold text-slate-700">{uploadResult.total}</p>
                    <p className="text-xs text-slate-600">Total</p>
                  </div>
                </div>

                {errorLog.length > 0 && (
                  <Button 
                    onClick={downloadErrorLog} 
                    variant="outline" 
                    className="w-full border-red-300 text-red-600 hover:bg-red-50"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download Error Log ({errorLog.length} errors)
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Error Preview */}
      {errorLog.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg text-red-600">
              <AlertCircle className="w-5 h-5" />
              Upload Errors Preview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-64 overflow-y-auto space-y-2">
              {errorLog.slice(0, 10).map((err, idx) => (
                <div key={idx} className={`${err.skipped ? 'bg-amber-50' : 'bg-red-50'} rounded-lg p-3 text-sm`}>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className={err.skipped ? "text-amber-600 border-amber-300" : "text-red-600 border-red-300"}>
                      Line {err.line}
                    </Badge>
                    <span className="font-medium text-slate-800">{err.name}</span>
                    <span className="text-slate-500">({err.email})</span>
                  </div>
                  <p className={`${err.skipped ? 'text-amber-600' : 'text-red-600'} text-xs`}>{err.errors.join(', ')}</p>
                </div>
              ))}
              {errorLog.length > 10 && (
                <p className="text-center text-slate-500 text-sm py-2">
                  ... and {errorLog.length - 10} more errors. Download the full log for details.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}