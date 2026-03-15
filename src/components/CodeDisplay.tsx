import { useState, useEffect, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import Barcode from "react-barcode";
import * as PDF417 from "pdf417-generator";
import type { CodeType } from "../types/card";

interface CodeDisplayProps {
  value: string;
  codeType?: CodeType;
  onCodeTypeChange?: (codeType: CodeType) => void;
  showSelector?: boolean;
  standalone?: boolean;
  fullWidth?: boolean;
}

type BarcodeFormat = "CODE128" | "CODE39" | "EAN13" | "EAN8" | "UPC" | "ITF14" | "ITF";

const CODE_OPTIONS: { value: CodeType; label: string }[] = [
  { value: "qr", label: "QR Code" },
  { value: "code128", label: "Code 128" },
  { value: "code39", label: "Code 39" },
  { value: "ean13", label: "EAN-13" },
  { value: "ean8", label: "EAN-8" },
  { value: "upc", label: "UPC" },
  { value: "itf14", label: "ITF-14" },
  { value: "itf", label: "ITF" },
  { value: "pdf417", label: "PDF417" },
];

const FORMAT_MAP: Record<Exclude<CodeType, "qr" | "pdf417" | "codabar" | "code93" | "upca" | "upce">, BarcodeFormat> = {
  code128: "CODE128",
  code39: "CODE39",
  ean13: "EAN13",
  ean8: "EAN8",
  upc: "UPC",
  itf14: "ITF14",
  itf: "ITF",
};

function PDF417Canvas({ value, scale = 2 }: { value: string; scale?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      PDF417.draw(value, canvas, { scale });
      setError(null);
    } catch (e) {
      setError("Failed to generate PDF417");
      console.error("PDF417 error:", e);
    }
  }, [value, scale]);

  if (error) {
    return <p>{error}</p>;
  }

  return <canvas ref={canvasRef} />;
}

export default function CodeDisplay({ value, codeType, onCodeTypeChange, showSelector = true, standalone = false, fullWidth = false }: CodeDisplayProps) {
  const [selectedType, setSelectedType] = useState<CodeType>(codeType || "qr");
  const [renderError, setRenderError] = useState<string | null>(null);

  useEffect(() => {
    if (codeType) {
      setSelectedType(codeType);
    }
  }, [codeType]);

  useEffect(() => {
    setRenderError(null);
  }, [value, selectedType]);

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newType = e.target.value as CodeType;
    setSelectedType(newType);
    setRenderError(null);
    if (onCodeTypeChange) {
      onCodeTypeChange(newType);
    }
  };

  const isQR = selectedType === "qr";
  const isPDF417 = selectedType === "pdf417";
  const isStandardBarcode = selectedType in FORMAT_MAP;
  const qrSize = fullWidth ? 300 : 180;
  const barcodeWidth = fullWidth ? 3 : 1.5;
  const barcodeHeight = fullWidth ? 100 : 50;

  const renderCode = () => {
    if (renderError) {
      return (
        <div className="barcode-wrapper unsupported">
          <p>{renderError}</p>
        </div>
      );
    }

    if (isQR) {
      return <QRCodeSVG value={value} size={qrSize} level="M" />;
    }

    if (isPDF417) {
      return (
        <div className="barcode-wrapper pdf417-wrapper">
          <PDF417Canvas value={value} scale={fullWidth ? 3 : 2} />
        </div>
      );
    }

    if (isStandardBarcode) {
      return (
        <div className="barcode-wrapper">
          <Barcode
            value={value}
            format={FORMAT_MAP[selectedType as keyof typeof FORMAT_MAP]}
            width={barcodeWidth}
            height={barcodeHeight}
            displayValue={true}
            fontSize={fullWidth ? 14 : 12}
          />
        </div>
      );
    }

    return (
      <div className="barcode-wrapper unsupported">
        <p>Code type "{CODE_OPTIONS.find(o => o.value === selectedType)?.label || selectedType}" is not supported for display</p>
      </div>
    );
  };

  return (
    <div className={`code-display ${standalone ? "standalone" : ""} ${fullWidth ? "full-width" : ""}`}>
      {showSelector && (
        <div className="code-type-field">
          <label>Code Type</label>
          <select value={selectedType} onChange={handleTypeChange}>
            {CODE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="code-content">
        {renderCode()}
      </div>
    </div>
  );
}
