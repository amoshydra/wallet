import { useEffect } from "react";
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
  const selectedType = codeType || DEFAULT_CODE_TYPE[cardType];

  useEffect(() => {
    if (codeType && onCodeTypeChange) {
      onCodeTypeChange(codeType);
    }
  }, [codeType, onCodeTypeChange]);

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (onCodeTypeChange) {
      onCodeTypeChange(e.target.value as CodeType);
    }
  };

  const isQR = selectedType === "qr";

  return (
    <div className={`code-display ${standalone ? "standalone" : ""}`}>
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
          <QRCodeSVG value={value} size={200} level="M" />
        ) : (
          <Barcode
            value={value}
            format={FORMAT_MAP[selectedType as Exclude<CodeType, "qr">]}
            width={2}
            height={60}
            displayValue={true}
          />
        )}
      </div>
    </div>
  );
}
