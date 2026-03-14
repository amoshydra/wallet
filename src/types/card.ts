export type CardType = "loyalty" | "passport" | "id" | "boarding";

export type CodeType = "qr" | "code128" | "code39" | "ean13" | "ean8" | "upc" | "itf14";

export interface Card {
  id: string;
  type: CardType;
  name: string;
  number?: string;
  imageData?: string;
  codeType?: CodeType;
  createdAt: number;
}

export interface AppData {
  cards: Card[];
}
