declare module 'pdf417-generator' {
  export const ROWHEIGHT: number;
  export const QUIETH: number;
  export const QUIETV: number;
  export let barcode_array: Record<string, unknown>;
  export const start_pattern: string;
  export const stop_pattern: string;

  export function draw(
    code: string,
    canvas: HTMLCanvasElement,
    aspectratio?: number,
    ecl?: number,
    devicePixelRatio?: number,
    lineColor?: string,
  ): void;

  function getInputSequences(code: string): unknown[];
  function getCompaction(mode: number, code: string, addmode?: boolean): unknown[];
  function getErrorCorrectionLevel(ecl: number, numcw: number): number;
  function getBarcodeArray(): Record<string, unknown>;
  function getHighLevelEncoding(code: string): string;
  function setBarcode(code: string, aspectratio?: number, ecl?: number): boolean;

  export const textsubmodes: number[][];
  export const textlatch: Record<string, number[]>;
  export const clusters: string[];
  export const errorcorrection: number[][];
}
