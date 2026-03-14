import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import Barcode from "react-barcode";
import type { CardType } from "../types/card";

interface CodeDisplayProps {
  value: string;
  cardType: CardType;
}

type CodeFormat = "qr" | "barcode";

type BarcodeFormat = "CODE128" | "CODE39" | "EAN13" | "EAN8" | "UPC" | "ITF14" | "MSI";

const BARCODE_FORMAT: Record<CardType, BarcodeFormat> = {
  loyalty: "CODE128",
  passport: "CODE128",
  id: "CODE128",
  boarding: "CODE128",
};

export default function CodeDisplay({ value, cardType }: CodeDisplayProps) {
  const [format, setFormat] = useState<CodeFormat>("qr");

  return (
    <div className="code-display">
      <div className="code-tabs">
        <button
          className={`tab ${format === "qr" ? "active" : ""}`}
          onClick={() => setFormat("qr")}
        >
          QR Code
        </button>
        <button
          className={`tab ${format === "barcode" ? "active" : ""}`}
          onClick={() => setFormat("barcode")}
        >
          Barcode
        </button>
      </div>

      <div className="code-content">
        {format === "qr" ? (
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
              format={BARCODE_FORMAT[cardType]}
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
