import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { ScanLine, CheckCircle2, AlertCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { findAssetByCode } from "@/lib/assetBarcode";

const BarcodeScanPanel = forwardRef(function BarcodeScanPanel({ assets = [], onFound, onCreateNew, onClose }, ref) {
  const inputRef = useRef(null);
  const [code, setCode] = useState("");
  const [status, setStatus] = useState(null);

  const focusInput = () => {
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  // Lets the parent hand focus back to the field after a dialog closes,
  // so the next scan lands in the right place.
  useImperativeHandle(ref, () => ({ focusInput }));

  useEffect(() => {
    focusInput();
  }, []);

  const submit = () => {
    const value = code.trim();
    if (!value) return;

    const asset = findAssetByCode(assets, value);
    setCode("");

    if (asset) {
      setStatus({ type: "found", text: `${asset.name} · ${asset.asset_id}` });
      onFound(asset);
    } else {
      setStatus({ type: "not_found", text: value });
    }
    focusInput();
  };

  return (
    <Card className="border-0 shadow-sm border-l-4 border-l-indigo-500">
      <CardContent className="pt-5 pb-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
              <ScanLine className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p className="font-semibold text-slate-800">Scan Asset Barcode</p>
              <p className="text-xs text-slate-500">
                Point the scanner at the asset label — the code is entered and the asset opens automatically
              </p>
            </div>
          </div>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose} title="Close scanner">
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-2 mt-4">
          <div className="relative flex-1">
            <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              ref={inputRef}
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                if (status) setStatus(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  submit();
                }
              }}
              placeholder="Waiting for scan… or type a barcode / serial number"
              autoComplete="off"
              className="pl-10 font-mono tracking-wide"
            />
          </div>
          <Button
            onClick={submit}
            disabled={!code.trim()}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            Find Asset
          </Button>
        </div>

        {status?.type === "found" && (
          <p className="mt-3 text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            Opening {status.text}
          </p>
        )}

        {status?.type === "not_found" && (
          <div className="mt-3 text-sm bg-amber-50 rounded-lg px-3 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-amber-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              No asset found for “{status.text}”
            </span>
            {onCreateNew && (
              <Button size="sm" variant="outline" onClick={() => onCreateNew(status.text)}>
                Add this asset
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
});

export default BarcodeScanPanel;