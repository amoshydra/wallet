declare module 'pdf417-generator' {
  export function draw(data: string, canvas: HTMLCanvasElement, options?: { scale?: number }): void;
  export function barcode_array(data: string): {
    num_cols: number;
    num_rows: number;
    bcode: number[][];
  };
}
