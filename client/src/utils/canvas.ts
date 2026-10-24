/**
 * Canvas utility functions, including floodFill (paint bucket) algorithm.
 */

function hexToRgba(hex: string): [number, number, number, number] {
  let c = hex.replace("#", "").trim();
  if (c.length === 3) {
    c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
  }
  const num = parseInt(c, 16);
  if (isNaN(num)) return [0, 0, 0, 255];
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255, 255];
}

/**
 * Executes a fast, 4-way flood fill on a 2D canvas context.
 */
export function floodFill(
  ctx: CanvasRenderingContext2D,
  startX: number,
  startY: number,
  fillColorHex: string,
  tolerance = 32
): void {
  const width = ctx.canvas.width;
  const height = ctx.canvas.height;
  const x0 = Math.floor(startX);
  const y0 = Math.floor(startY);

  if (x0 < 0 || x0 >= width || y0 < 0 || y0 >= height) return;

  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  const [fillR, fillG, fillB, fillA] = hexToRgba(fillColorHex);

  const startIdx = (y0 * width + x0) * 4;
  const startR = data[startIdx];
  const startG = data[startIdx + 1];
  const startB = data[startIdx + 2];
  const startA = data[startIdx + 3];

  // If starting pixel is already essentially identical to fill color, skip
  if (
    Math.abs(startR - fillR) <= 3 &&
    Math.abs(startG - fillG) <= 3 &&
    Math.abs(startB - fillB) <= 3 &&
    Math.abs(startA - fillA) <= 3
  ) {
    return;
  }

  const matchColor = (idx: number) => {
    return (
      Math.abs(data[idx] - startR) <= tolerance &&
      Math.abs(data[idx + 1] - startG) <= tolerance &&
      Math.abs(data[idx + 2] - startB) <= tolerance &&
      Math.abs(data[idx + 3] - startA) <= tolerance
    );
  };

  const visited = new Uint8Array(width * height);
  const queue = new Int32Array(width * height * 2);
  let head = 0;
  let tail = 0;

  queue[tail++] = x0;
  queue[tail++] = y0;
  visited[y0 * width + x0] = 1;

  while (head < tail) {
    const cx = queue[head++];
    const cy = queue[head++];
    const idx = (cy * width + cx) * 4;

    data[idx] = fillR;
    data[idx + 1] = fillG;
    data[idx + 2] = fillB;
    data[idx + 3] = fillA;

    // Up
    if (cy > 0) {
      const upPos = (cy - 1) * width + cx;
      if (!visited[upPos]) {
        visited[upPos] = 1;
        if (matchColor(upPos * 4)) {
          queue[tail++] = cx;
          queue[tail++] = cy - 1;
        }
      }
    }
    // Down
    if (cy < height - 1) {
      const downPos = (cy + 1) * width + cx;
      if (!visited[downPos]) {
        visited[downPos] = 1;
        if (matchColor(downPos * 4)) {
          queue[tail++] = cx;
          queue[tail++] = cy + 1;
        }
      }
    }
    // Left
    if (cx > 0) {
      const leftPos = cy * width + (cx - 1);
      if (!visited[leftPos]) {
        visited[leftPos] = 1;
        if (matchColor(leftPos * 4)) {
          queue[tail++] = cx - 1;
          queue[tail++] = cy;
        }
      }
    }
    // Right
    if (cx < width - 1) {
      const rightPos = cy * width + (cx + 1);
      if (!visited[rightPos]) {
        visited[rightPos] = 1;
        if (matchColor(rightPos * 4)) {
          queue[tail++] = cx + 1;
          queue[tail++] = cy;
        }
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);
}
