import { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import Barcode from "react-barcode";
import type { CardType, CodeType } from "../types/card";

interface CodeDisplayProps {
  value: string;
  cardType: CardType;
  codeType?: CodeType;
  onCodeTypeChange?: (codeType: CodeType) => void;
  showSelector?: boolean;
  standalone?: boolean;
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

const DEFAULT_CODE_TYPE: Record<CardType, CodeType> = {
  loyalty: "qr",
  passport: "qr",
  id: "qr",
  boarding: "qr",
};

const FORMAT_MAP: Record<Exclude<CodeType, "qr">, BarcodeFormat> = {
  code128: "CODE128",
  code39: "CODE39",
  ean13: "EAN13",
  ean8: "EAN8",
  upc: "UPC",
  itf14: "ITF14",
};

export default function CodeDisplay({ value, cardType, codeType, onCodeTypeChange, showSelector = true, standalone = false }: CodeDisplayProps) {
  const [selectedType, setSelectedType] = useState<CodeType>(codeType || DEFAULT_CODE_TYPE[cardType]);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    if (codeType) {
      setSelectedType(codeType);
    }
  }, [codeType]);

  const handleTypeChange = (newType: CodeType) => {
    setSelectedType(newType);
    if (onCodeTypeChange) {
      onCodeTypeChange(newType);
    }
    setShowDropdown(false);
  };

  const isQR = selectedType === "qr";

  return (
    <div className={`code-display ${standalone ? "min-height-auto" : ""}`}>
      {showSelector && (
        <div className="code-type-selector">
          <button 
            className="code-type-btn"
            onClick={() => setShowDropdown(!showDropdown)}
          >
            {CODE_OPTIONS.find(o => o.value === selectedType)?.label || "Select Type"} ▼
          </button>
          
          {showDropdown && (
            <div className="code-type-dropdown">
              {CODE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  className={`code-type-option ${selectedType === opt.value ? "active" : ""}`}
                  onClick={() => handleTypeChange(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="code-content">
        {isQR ? (
          <div className="qr-container">
            <QRCodeSVG
              value={value}
              size={250}
              level="M"
            />
          </div>
        ) : (
          <div className="barcode-container">
            <Barcode
              value={value}
              format={FORMAT_MAP[selectedType as Exclude<CodeType, "qr">]}
              width={2}
              height={80}
              displayValue={true}
            />
          </div>
        )}
      </div>

      <p className="code-value">{value}</p>
    </div>
  );
}
