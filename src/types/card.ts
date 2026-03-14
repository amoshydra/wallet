export type CardType = "loyalty" | "passport" | "id" | "boarding";

export interface Card {
  id: string;
  type: CardType;
  name: string;
  number?: string;
  imageData?: string;
  createdAt: number;
}

export interface AppData {
  cards: Card[];
}
