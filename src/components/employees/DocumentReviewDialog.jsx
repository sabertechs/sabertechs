import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, XCircle, Eye, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const REJECTION_REASONS = [
  "Blurry or unclear image",
  "Document is cut off or incomplete",
  "Wrong document type",
  "Document expired",
  "Name mismatch",
  "Information not readable",
  "Document appears tampered",
  "Poor image quality"
];

export default function DocumentReviewDialog({ open, onClose, employee, onApprove, onReject }) {
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const [approving, setApproving] = useState(false);

  const documents = [
    {
      key: "aadhaar_document",
      label: "Aadhaar Document",
      url: employee?.aadhaar_document,
      status: employee?.document_review_status?.aadhaar_document || "pending",
      rejectionReason: employee?.document_rejection_reasons?.aadhaar_document
    },
    {
      key: "pan_document",
      label: "PAN Document",
      url: employee?.pan_document,
      status: employee?.document_review_status?.pan_document || "pending",
      rejectionReason: employee?.document_rejection_reasons?.pan_document
    },
    {
      key: "education_certificates",
      label: "Education Certificates",
      urls: employee?.education_certificates || [],
      status: employee?.document_review_status?.education_certificates || "pending",
      rejectionReason: employee?.document_rejection_reasons?.education_certificates,
      isMultiple: true
    },
    {
      key: "profile_photo",
      label: "Profile Photo",
      url: employee?.profile_photo,
      status: employee?.document_review_status?.profile_photo || "pending",
      rejectionReason: employee?.document_rejection_reasons?.profile_photo
    }
  ];

  const handleReject = async () => {
    if (!selectedDoc) return;
    const finalReason = rejectionReason === "custom" ? customReason : rejectionReason;
    if (!finalReason) return;

    setRejecting(true);
    await onReject(selectedDoc.key, finalReason);
    setRejecting(false);
    setSelectedDoc(null);
    setRejectionReason("");
    setCustomReason("");
  };

  const handleApprove = async (docKey) => {
    setApproving(true);
    await onApprove(docKey);
    setApproving(false);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-green-100 text-green-700"><CheckCircle className="w-3 h-3 mr-1" /> Approved</Badge>;
      case "rejected":
        return <Badge className="bg-red-100 text-red-700"><XCircle className="w-3 h-3 mr-1" /> Rejected</Badge>;
      default:
        return <Badge className="bg-amber-100 text-amber-700"><AlertCircle className="w-3 h-3 mr-1" /> Pending</Badge>;
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Document Review - {employee?.full_name}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-sm text-blue-700">
                Review each document carefully. You can approve individual documents or reject them with specific reasons.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {documents.map((doc) => (
                <Card key={doc.key} className={`border-2 ${
                  doc.status === 'approved' ? 'border-green-200 bg-green-50' :
                  doc.status === 'rejected' ? 'border-red-200 bg-red-50' :
                  'border-slate-200'
                }`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-semibold text-slate-800">{doc.label}</h4>
                        {doc.rejectionReason && (
                          <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                            <XCircle className="w-3 h-3" />
                            {doc.rejectionReason}
                          </p>
                        )}
                      </div>
                      {getStatusBadge(doc.status)}
                    </div>

                    {doc.isMultiple ? (
                      <div className="space-y-2">
                        {doc.urls.length > 0 ? (
                          doc.urls.map((url, idx) => (
                            <a
                              key={idx}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-sm text-indigo-600 hover:underline"
                            >
                              <Eye className="w-4 h-4" />
                              View Certificate {idx + 1}
                            </a>
                          ))
                        ) : (
                          <p className="text-sm text-slate-400">Not uploaded</p>
                        )}
                      </div>
                    ) : doc.url ? (
                      doc.key === "profile_photo" ? (
                        <img src={doc.url} alt="Profile" className="w-24 h-24 rounded-lg object-cover mb-3" />
                      ) : (
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm text-indigo-600 hover:underline mb-3"
                        >
                          <Eye className="w-4 h-4" />
                          View Document
                        </a>
                      )
                    ) : (
                      <p className="text-sm text-slate-400 mb-3">Not uploaded</p>
                    )}

                    {doc.url || (doc.isMultiple && doc.urls.length > 0) ? (
                      <div className="flex gap-2">
                        {doc.status !== "approved" && (
                          <Button
                            size="sm"
                            onClick={() => handleApprove(doc.key)}
                            disabled={approving}
                            className="flex-1 bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Approve
                          </Button>
                        )}
                        {doc.status !== "rejected" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedDoc(doc)}
                            className="flex-1 border-red-300 text-red-700 hover:bg-red-50"
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Reject
                          </Button>
                        )}
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rejection Dialog */}
      <Dialog open={!!selectedDoc} onOpenChange={() => setSelectedDoc(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-slate-600">
              Please provide a reason for rejecting <strong>{selectedDoc?.label}</strong>
            </p>

            <div className="space-y-2">
              <Label>Rejection Reason *</Label>
              <Select value={rejectionReason} onValueChange={setRejectionReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent>
                  {REJECTION_REASONS.map((reason) => (
                    <SelectItem key={reason} value={reason}>
                      {reason}
                    </SelectItem>
                  ))}
                  <SelectItem value="custom">Custom reason...</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {rejectionReason === "custom" && (
              <div className="space-y-2">
                <Label>Custom Reason *</Label>
                <Textarea
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="Enter detailed reason for rejection"
                  rows={3}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedDoc(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleReject}
              disabled={rejecting || !rejectionReason || (rejectionReason === "custom" && !customReason)}
              className="bg-red-600 hover:bg-red-700"
            >
              {rejecting ? "Rejecting..." : "Reject Document"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}