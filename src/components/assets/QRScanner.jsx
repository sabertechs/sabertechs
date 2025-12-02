import React, { useState, useRef, useEffect } from "react";
import { Camera, X, QrCode, Flashlight } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  const streamRef = useRef(null);

  useEffect(() => {
    if (open) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [open]);

  const startCamera = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setScanning(true);
        requestAnimationFrame(scanQRCode);
      }
    } catch (err) {
      setError("Camera access denied. Please allow camera permissions.");
    }
  };

  const stopCamera = () => {
    setScanning(false);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const scanQRCode = async () => {
    if (!scanning || !videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Use BarcodeDetector API if available
      if ("BarcodeDetector" in window) {
        try {
          const barcodeDetector = new BarcodeDetector({ formats: ["qr_code"] });
          const barcodes = await barcodeDetector.detect(canvas);
          if (barcodes.length > 0) {
            const qrData = barcodes[0].rawValue;
            stopCamera();
            onScan(qrData);
            onClose();
            return;
          }
        } catch (e) {
          // Continue scanning
        }
      }
    }

    if (scanning) {
      requestAnimationFrame(scanQRCode);
    }
  };

  const handleManualInput = () => {
    const assetId = prompt("Enter Asset ID manually:");
    if (assetId) {
      onScan(assetId);
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-indigo-600" />
            Scan Asset QR Code
          </DialogTitle>
        </DialogHeader>
        
        <div className="relative">
          {error ? (
            <div className="p-8 text-center">
              <Camera className="w-12 h-12 mx-auto text-slate-300 mb-4" />
              <p className="text-red-500 mb-4">{error}</p>
              <Button onClick={startCamera} variant="outline">
                Try Again
              </Button>
            </div>
          ) : (
            <div className="relative aspect-square bg-black">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                playsInline
                muted
              />
              <canvas ref={canvasRef} className="hidden" />
              
              {/* Scanning overlay */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-64 h-64 border-2 border-white/50 rounded-2xl relative">
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-indigo-500 rounded-tl-lg" />
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-indigo-500 rounded-tr-lg" />
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-indigo-500 rounded-bl-lg" />
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-indigo-500 rounded-br-lg" />
                  
                  {/* Scanning line animation */}
                  <div className="absolute inset-x-4 h-0.5 bg-indigo-500 animate-pulse top-1/2" />
                </div>
              </div>
              
              <p className="absolute bottom-4 left-0 right-0 text-center text-white text-sm">
                Point camera at QR code
              </p>
            </div>
          )}
        </div>

        <div className="p-4 flex gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleManualInput} className="flex-1">
            Enter Manually
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}