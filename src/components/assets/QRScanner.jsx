import React, { useState, useRef, useEffect } from "react";
import { Camera, QrCode, Keyboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function QRScanner({ open, onClose, onScan }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [error, setError] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [manualInput, setManualInput] = useState("");
  const streamRef = useRef(null);
  const scanIntervalRef = useRef(null);

  useEffect(() => {
    if (open && !manualMode) {
      startCamera();
    }
    return () => {
      stopCamera();
    };
  }, [open, manualMode]);

  const startCamera = async () => {
    try {
      setError(null);
      
      // Check if we're on HTTPS or localhost
      if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
        setError("Camera requires HTTPS connection. Please use manual entry.");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setScanning(true);
        
        // Start scanning interval
        scanIntervalRef.current = setInterval(scanFrame, 500);
      }
    } catch (err) {
      console.error("Camera error:", err);
      if (err.name === 'NotAllowedError') {
        setError("Camera access denied. Please allow camera permissions or use manual entry.");
      } else if (err.name === 'NotFoundError') {
        setError("No camera found. Please use manual entry.");
      } else {
        setError("Could not access camera. Please use manual entry.");
      }
    }
  };

  const stopCamera = () => {
    setScanning(false);
    
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const scanFrame = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    if (video.readyState !== video.HAVE_ENOUGH_DATA) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Try BarcodeDetector API (Chrome, Edge, Opera)
    if ("BarcodeDetector" in window) {
      try {
        const barcodeDetector = new BarcodeDetector({ formats: ["qr_code"] });
        const barcodes = await barcodeDetector.detect(canvas);
        if (barcodes.length > 0) {
          const qrData = barcodes[0].rawValue;
          handleScanSuccess(qrData);
          return;
        }
      } catch (e) {
        // BarcodeDetector failed, continue
      }
    }
  };

  const handleScanSuccess = (data) => {
    stopCamera();
    onScan(data);
    onClose();
  };

  const handleManualSubmit = () => {
    if (manualInput.trim()) {
      onScan(manualInput.trim());
      onClose();
    }
  };

  const handleClose = () => {
    stopCamera();
    setManualMode(false);
    setManualInput("");
    setError(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-indigo-600" />
            {manualMode ? "Enter Asset ID" : "Scan Asset QR Code"}
          </DialogTitle>
        </DialogHeader>
        
        {manualMode ? (
          <div className="p-4 pt-0 space-y-4">
            <Input
              placeholder="Enter Asset ID (e.g., LAP-123456)"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()}
              autoFocus
            />
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setManualMode(false)} className="flex-1">
                <Camera className="w-4 h-4 mr-2" /> Use Camera
              </Button>
              <Button onClick={handleManualSubmit} disabled={!manualInput.trim()} className="flex-1 bg-indigo-600 hover:bg-indigo-700">
                Find Asset
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="relative">
              {error ? (
                <div className="p-8 text-center">
                  <Camera className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                  <p className="text-red-500 mb-4 text-sm">{error}</p>
                  <div className="flex gap-2 justify-center">
                    <Button onClick={startCamera} variant="outline" size="sm">
                      Try Again
                    </Button>
                    <Button onClick={() => setManualMode(true)} size="sm">
                      Enter Manually
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="relative aspect-square bg-black">
                  <video
                    ref={videoRef}
                    className="w-full h-full object-cover"
                    playsInline
                    muted
                    autoPlay
                  />
                  <canvas ref={canvasRef} className="hidden" />
                  
                  {/* Scanning overlay */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-56 h-56 relative">
                      <div className="absolute top-0 left-0 w-10 h-10 border-t-4 border-l-4 border-indigo-500 rounded-tl-xl" />
                      <div className="absolute top-0 right-0 w-10 h-10 border-t-4 border-r-4 border-indigo-500 rounded-tr-xl" />
                      <div className="absolute bottom-0 left-0 w-10 h-10 border-b-4 border-l-4 border-indigo-500 rounded-bl-xl" />
                      <div className="absolute bottom-0 right-0 w-10 h-10 border-b-4 border-r-4 border-indigo-500 rounded-br-xl" />
                      
                      {/* Scanning animation */}
                      <div className="absolute inset-x-2 h-0.5 bg-gradient-to-r from-transparent via-indigo-500 to-transparent animate-pulse top-1/2" />
                    </div>
                  </div>
                  
                  {scanning && (
                    <div className="absolute bottom-4 left-0 right-0 text-center">
                      <span className="bg-black/60 text-white text-sm px-3 py-1 rounded-full">
                        Point at QR code
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="p-4 pt-2 flex gap-2">
              <Button variant="outline" onClick={handleClose} className="flex-1">
                Cancel
              </Button>
              <Button onClick={() => setManualMode(true)} variant="outline" className="flex-1">
                <Keyboard className="w-4 h-4 mr-2" /> Enter Manually
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}