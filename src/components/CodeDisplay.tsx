import { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import Barcode from "react-barcode";
import type { CodeType } from "../types/card";

interface CodeDisplayProps {
  value: string;
  codeType?: CodeType;
  onCodeTypeChange?: (codeType: CodeType) => void;
  showSelector?: boolean;
  standalone?: boolean;
  fullWidth?: boolean;
}

type BarcodeFormat = "CODE128" | "CODE39" | "EAN13" | "EAN8" | "UPC" | "ITF14";

const CODE_OPTIONS: { value: CodeType; label: string }[] = [
  { value: "qr", label: "QR Code" },
  { value: "code128", label: "Code 128" },
  { value: "code39", label: "Code 39" },
  { value: "ean13", label: "EAN-13" },
  { value: "ean8", label: "EAN-8" },
  { value: "upc", label: "UPC" },
  { value: "itf14", label: "ITF-14" },
];

const FORMAT_MAP: Record<Exclude<CodeType, "qr">, BarcodeFormat> = {
  code128: "CODE128",
  code39: "CODE39",
  ean13: "EAN13",
  ean8: "EAN8",
  upc: "UPC",
  itf14: "ITF14",
};

export default function CodeDisplay({ value, codeType, onCodeTypeChange, showSelector = true, standalone = false, fullWidth = false }: CodeDisplayProps) {
  const [selectedType, setSelectedType] = useState<CodeType>(codeType || "qr");

  useEffect(() => {
    if (codeType) {
      setSelectedType(codeType);
    }
  }, [codeType]);

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newType = e.target.value as CodeType;
    setSelectedType(newType);
    if (onCodeTypeChange) {
      onCodeTypeChange(newType);
    }
  };

  const isQR = selectedType === "qr";
  const qrSize = fullWidth ? 300 : 180;
  const barcodeWidth = fullWidth ? 3 : 1.5;
  const barcodeHeight = fullWidth ? 100 : 50;

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
        {isQR ? (
          <QRCodeSVG value={value} size={qrSize} level="M" />
        ) : (
          <div className="barcode-wrapper">
            <Barcode
              value={value}
              format={FORMAT_MAP[selectedType as Exclude<CodeType, "qr">]}
              width={barcodeWidth}
              height={barcodeHeight}
              displayValue={true}
              fontSize={fullWidth ? 14 : 12}
            />
          </div>
        )}
      </div>
    </div>
  );
}
