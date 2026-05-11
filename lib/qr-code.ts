const QR_MODE_NUMERIC = "0001";
const QR_VERSION_ONE_SIZE = 21;
const QR_VERSION_ONE_DATA_CODEWORDS = 19;
const QR_VERSION_ONE_ECC_CODEWORDS = 7;
const QR_PAD_BYTES = [0xec, 0x11];
const QUIET_ZONE = 4;

function appendBits(target: number[], value: number, bitLength: number) {
  for (let shift = bitLength - 1; shift >= 0; shift -= 1) {
    target.push((value >> shift) & 1);
  }
}

function numericPayloadBits(value: string) {
  const bits: number[] = [];
  appendBits(bits, Number(QR_MODE_NUMERIC), 4);
  appendBits(bits, value.length, 10);

  for (let index = 0; index < value.length; index += 3) {
    const chunk = value.slice(index, index + 3);
    appendBits(bits, Number(chunk), chunk.length === 3 ? 10 : chunk.length === 2 ? 7 : 4);
  }

  return bits;
}

function toCodewords(bits: number[]) {
  const capacity = QR_VERSION_ONE_DATA_CODEWORDS * 8;
  const workingBits = [...bits];
  const terminatorLength = Math.min(4, capacity - workingBits.length);
  appendBits(workingBits, 0, terminatorLength);

  while (workingBits.length % 8 !== 0) {
    workingBits.push(0);
  }

  const codewords: number[] = [];
  for (let index = 0; index < workingBits.length; index += 8) {
    let codeword = 0;
    for (let offset = 0; offset < 8; offset += 1) {
      codeword = (codeword << 1) | workingBits[index + offset];
    }
    codewords.push(codeword);
  }

  let padIndex = 0;
  while (codewords.length < QR_VERSION_ONE_DATA_CODEWORDS) {
    codewords.push(QR_PAD_BYTES[padIndex % QR_PAD_BYTES.length]);
    padIndex += 1;
  }

  return codewords;
}

function gfMultiply(left: number, right: number) {
  let result = 0;
  let a = left;
  let b = right;

  while (b > 0) {
    if (b & 1) {
      result ^= a;
    }

    a <<= 1;
    if (a & 0x100) {
      a ^= 0x11d;
    }

    b >>= 1;
  }

  return result;
}

function gfPow(exponent: number) {
  let result = 1;

  for (let index = 0; index < exponent; index += 1) {
    result = gfMultiply(result, 2);
  }

  return result;
}

function polyMultiply(left: number[], right: number[]) {
  const result = new Array(left.length + right.length - 1).fill(0);

  for (let leftIndex = 0; leftIndex < left.length; leftIndex += 1) {
    for (let rightIndex = 0; rightIndex < right.length; rightIndex += 1) {
      result[leftIndex + rightIndex] ^= gfMultiply(left[leftIndex], right[rightIndex]);
    }
  }

  return result;
}

function buildGeneratorPolynomial(degree: number) {
  let polynomial = [1];

  for (let index = 0; index < degree; index += 1) {
    polynomial = polyMultiply(polynomial, [1, gfPow(index)]);
  }

  return polynomial;
}

function buildErrorCorrectionCodewords(dataCodewords: number[]) {
  const generator = buildGeneratorPolynomial(QR_VERSION_ONE_ECC_CODEWORDS);
  const remainder = [...dataCodewords, ...new Array(QR_VERSION_ONE_ECC_CODEWORDS).fill(0)];

  for (let index = 0; index < dataCodewords.length; index += 1) {
    const factor = remainder[index];
    if (factor === 0) {
      continue;
    }

    for (let offset = 0; offset < generator.length; offset += 1) {
      remainder[index + offset] ^= gfMultiply(generator[offset], factor);
    }
  }

  return remainder.slice(-QR_VERSION_ONE_ECC_CODEWORDS);
}

function codewordsToBits(codewords: number[]) {
  const bits: number[] = [];

  for (const codeword of codewords) {
    appendBits(bits, codeword, 8);
  }

  return bits;
}

type QrMatrix = (boolean | null)[][];

function createMatrix() {
  return Array.from({ length: QR_VERSION_ONE_SIZE }, () =>
    Array.from({ length: QR_VERSION_ONE_SIZE }, () => null as boolean | null),
  );
}

function placeFinder(matrix: QrMatrix, startRow: number, startColumn: number) {
  for (let row = -1; row <= 7; row += 1) {
    for (let column = -1; column <= 7; column += 1) {
      const currentRow = startRow + row;
      const currentColumn = startColumn + column;

      if (
        currentRow < 0 ||
        currentRow >= QR_VERSION_ONE_SIZE ||
        currentColumn < 0 ||
        currentColumn >= QR_VERSION_ONE_SIZE
      ) {
        continue;
      }

      const isBorder = row === -1 || row === 7 || column === -1 || column === 7;
      const isOuter = row === 0 || row === 6 || column === 0 || column === 6;
      const isInner = row >= 2 && row <= 4 && column >= 2 && column <= 4;

      matrix[currentRow][currentColumn] = !isBorder && (isOuter || isInner);
    }
  }
}

function reserveFormatAreas(matrix: QrMatrix) {
  for (let index = 0; index < 9; index += 1) {
    if (matrix[8][index] === null) {
      matrix[8][index] = false;
    }
    if (matrix[index][8] === null) {
      matrix[index][8] = false;
    }
  }

  for (let index = 0; index < 8; index += 1) {
    if (matrix[QR_VERSION_ONE_SIZE - 1 - index][8] === null) {
      matrix[QR_VERSION_ONE_SIZE - 1 - index][8] = false;
    }
    if (matrix[8][QR_VERSION_ONE_SIZE - 1 - index] === null) {
      matrix[8][QR_VERSION_ONE_SIZE - 1 - index] = false;
    }
  }
}

function placeTimingPatterns(matrix: QrMatrix) {
  for (let index = 8; index < QR_VERSION_ONE_SIZE - 8; index += 1) {
    const isDark = index % 2 === 0;
    matrix[6][index] = isDark;
    matrix[index][6] = isDark;
  }
}

function placeDarkModule(matrix: QrMatrix) {
  matrix[13][8] = true;
}

function buildBaseMatrix() {
  const matrix = createMatrix();
  placeFinder(matrix, 0, 0);
  placeFinder(matrix, 0, QR_VERSION_ONE_SIZE - 7);
  placeFinder(matrix, QR_VERSION_ONE_SIZE - 7, 0);
  reserveFormatAreas(matrix);
  placeTimingPatterns(matrix);
  placeDarkModule(matrix);
  return matrix;
}

function shouldMask(row: number, column: number) {
  return (row + column) % 2 === 0;
}

function placeDataBits(matrix: QrMatrix, bits: number[]) {
  let bitIndex = 0;
  let upward = true;

  for (let column = QR_VERSION_ONE_SIZE - 1; column > 0; column -= 2) {
    if (column === 6) {
      column -= 1;
    }

    for (let rowOffset = 0; rowOffset < QR_VERSION_ONE_SIZE; rowOffset += 1) {
      const row = upward ? QR_VERSION_ONE_SIZE - 1 - rowOffset : rowOffset;

      for (let innerColumn = 0; innerColumn < 2; innerColumn += 1) {
        const currentColumn = column - innerColumn;

        if (matrix[row][currentColumn] !== null) {
          continue;
        }

        const dataBit = bitIndex < bits.length ? bits[bitIndex] === 1 : false;
        bitIndex += 1;
        matrix[row][currentColumn] = shouldMask(row, currentColumn) ? !dataBit : dataBit;
      }
    }

    upward = !upward;
  }
}

function placeFormatInfo(matrix: QrMatrix) {
  const formatBits = "111011111000100";
  const primaryCoordinates: Array<[number, number]> = [
    [8, 0],
    [8, 1],
    [8, 2],
    [8, 3],
    [8, 4],
    [8, 5],
    [8, 7],
    [8, 8],
    [7, 8],
    [5, 8],
    [4, 8],
    [3, 8],
    [2, 8],
    [1, 8],
    [0, 8],
  ];
  const secondaryCoordinates: Array<[number, number]> = [
    [20, 8],
    [19, 8],
    [18, 8],
    [17, 8],
    [16, 8],
    [15, 8],
    [14, 8],
    [8, 13],
    [8, 14],
    [8, 15],
    [8, 16],
    [8, 17],
    [8, 18],
    [8, 19],
    [8, 20],
  ];

  for (let index = 0; index < formatBits.length; index += 1) {
    const value = formatBits[index] === "1";
    const [primaryRow, primaryColumn] = primaryCoordinates[index];
    const [secondaryRow, secondaryColumn] = secondaryCoordinates[index];
    matrix[primaryRow][primaryColumn] = value;
    matrix[secondaryRow][secondaryColumn] = value;
  }
}

function renderSvg(matrix: QrMatrix, options?: { moduleSize?: number; foreground?: string; background?: string }) {
  const moduleSize = options?.moduleSize ?? 8;
  const foreground = options?.foreground ?? "#0f172a";
  const background = options?.background ?? "#ffffff";
  const fullSize = QR_VERSION_ONE_SIZE + QUIET_ZONE * 2;
  const dimension = fullSize * moduleSize;
  const rects: string[] = [];

  for (let row = 0; row < QR_VERSION_ONE_SIZE; row += 1) {
    for (let column = 0; column < QR_VERSION_ONE_SIZE; column += 1) {
      if (!matrix[row][column]) {
        continue;
      }

      rects.push(
        `<rect x="${(column + QUIET_ZONE) * moduleSize}" y="${(row + QUIET_ZONE) * moduleSize}" width="${moduleSize}" height="${moduleSize}" />`,
      );
    }
  }

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${dimension} ${dimension}" width="${dimension}" height="${dimension}" shape-rendering="crispEdges">`,
    `<rect width="${dimension}" height="${dimension}" fill="${background}" />`,
    `<g fill="${foreground}">`,
    ...rects,
    "</g>",
    "</svg>",
  ].join("");
}

export function createPassQrSvg(passId: string, options?: { moduleSize?: number; foreground?: string; background?: string }) {
  const normalizedPassId = passId.trim();

  if (!/^\d+$/.test(normalizedPassId)) {
    throw new Error("QR generation only supports numeric pass IDs.");
  }

  const payloadBits = numericPayloadBits(normalizedPassId);
  const dataCodewords = toCodewords(payloadBits);
  const errorCorrectionCodewords = buildErrorCorrectionCodewords(dataCodewords);
  const matrix = buildBaseMatrix();
  placeDataBits(matrix, codewordsToBits([...dataCodewords, ...errorCorrectionCodewords]));
  placeFormatInfo(matrix);
  return renderSvg(matrix, options);
}

export function createPassQrDataUrl(passId: string, options?: { moduleSize?: number; foreground?: string; background?: string }) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(createPassQrSvg(passId, options))}`;
}
