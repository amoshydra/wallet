export type CodeType =
  | 'qr'
  | 'code128'
  | 'code39'
  | 'ean13'
  | 'ean8'
  | 'upc'
  | 'itf14'
  | 'codabar'
  | 'code93'
  | 'itf'
  | 'upca'
  | 'upce'
  | 'pdf417';

export interface Card {
  id: string;
  name: string;
  number?: string;
  imageData?: string;
  codeType?: CodeType;
  createdAt: number;
  lastViewedAt?: number;
  colorIndex?: number;
  customColor?: string;
}

export interface AppData {
  cards: Card[];
}
