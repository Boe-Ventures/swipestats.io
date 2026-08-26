import type { FaceDetector } from "@tensorflow-models/face-detection";
import type { Tensor3D } from "@tensorflow/tfjs-core";
import sharp from "sharp";

const MAX_INPUT_BYTES = 20_000_000;
const MAX_INPUT_PIXELS = 40_000_000;
const MAX_OUTPUT_DIMENSION = 2048;
const MAX_FACES = 20;

export interface ImageFaceBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ImageAnonymizationResult {
  buffer: Buffer;
  contentType: "image/jpeg";
  width: number;
  height: number;
  sourceBytes: number;
  outputBytes: number;
  faces: ImageFaceBox[];
}

export type DetectImageFaces = (
  rgb: Uint8Array,
  width: number,
  height: number,
) => Promise<ImageFaceBox[]>;

interface ImageAnonymizationOptions {
  detectFaces?: DetectImageFaces;
  maxDimension?: number;
}

let detectorPromise: Map<"short" | "full", Promise<FaceDetector>> | undefined;

async function faceDetector(modelType: "short" | "full") {
  detectorPromise ??= new Map();
  let promise = detectorPromise.get(modelType);
  if (!promise) {
    promise = (async () => {
      const tf = await import("@tensorflow/tfjs-core");
      await import("@tensorflow/tfjs-backend-cpu");
      const faceDetection = await import("@tensorflow-models/face-detection");

      await tf.setBackend("cpu");
      await tf.ready();

      return faceDetection.createDetector(
        faceDetection.SupportedModels.MediaPipeFaceDetector,
        {
          runtime: "tfjs",
          modelType,
          maxFaces: MAX_FACES,
        },
      );
    })();
    detectorPromise.set(modelType, promise);
  }

  return promise;
}

async function detectImageFacesWithModel(
  rgb: Uint8Array,
  width: number,
  height: number,
  modelType: "short" | "full",
): Promise<ImageFaceBox[]> {
  const tf = await import("@tensorflow/tfjs-core");
  const detector = await faceDetector(modelType);
  const input = tf.tensor(rgb, [height, width, 3], "int32") as Tensor3D;

  try {
    const faces = await detector.estimateFaces(input, {
      flipHorizontal: false,
    });

    return faces.map(({ box }) => ({
      x: box.xMin,
      y: box.yMin,
      width: box.width,
      height: box.height,
    }));
  } finally {
    input.dispose();
  }
}

function intersectionOverUnion(a: ImageFaceBox, b: ImageFaceBox) {
  const intersectionWidth = Math.max(
    0,
    Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x),
  );
  const intersectionHeight = Math.max(
    0,
    Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y),
  );
  const intersection = intersectionWidth * intersectionHeight;
  const union = a.width * a.height + b.width * b.height - intersection;
  return union > 0 ? intersection / union : 0;
}

function distinctFaces(faces: ImageFaceBox[]) {
  return faces.reduce<ImageFaceBox[]>((result, face) => {
    if (
      result.some((candidate) => intersectionOverUnion(candidate, face) > 0.35)
    ) {
      return result;
    }
    result.push(face);
    return result;
  }, []);
}

function mapRotatedFace(
  face: ImageFaceBox,
  angle: 90 | 180 | 270,
  originalWidth: number,
  originalHeight: number,
): ImageFaceBox {
  if (angle === 90) {
    return {
      x: face.y,
      y: originalHeight - face.x - face.width,
      width: face.height,
      height: face.width,
    };
  }
  if (angle === 180) {
    return {
      x: originalWidth - face.x - face.width,
      y: originalHeight - face.y - face.height,
      width: face.width,
      height: face.height,
    };
  }
  return {
    x: originalWidth - face.y - face.height,
    y: face.x,
    width: face.height,
    height: face.width,
  };
}

async function rotatedRgb(
  rgb: Uint8Array,
  width: number,
  height: number,
  angle: 90 | 180 | 270,
) {
  return sharp(rgb, { raw: { width, height, channels: 3 } })
    .rotate(angle)
    .raw()
    .toBuffer({ resolveWithObject: true });
}

export async function detectImageFaces(
  rgb: Uint8Array,
  width: number,
  height: number,
): Promise<ImageFaceBox[]> {
  const primaryFaces = distinctFaces([
    ...(await detectImageFacesWithModel(rgb, width, height, "full")),
    ...(await detectImageFacesWithModel(rgb, width, height, "short")),
  ]);
  if (primaryFaces.length > 0) return primaryFaces;

  const rotatedFaces: ImageFaceBox[] = [];
  for (const angle of [90, 180, 270] as const) {
    const rotated = await rotatedRgb(rgb, width, height, angle);
    const faces = [
      ...(await detectImageFacesWithModel(
        rotated.data,
        rotated.info.width,
        rotated.info.height,
        "full",
      )),
      ...(await detectImageFacesWithModel(
        rotated.data,
        rotated.info.width,
        rotated.info.height,
        "short",
      )),
    ];
    rotatedFaces.push(
      ...faces.map((face) => mapRotatedFace(face, angle, width, height)),
    );
    if (rotatedFaces.length > 0) break;
  }

  return distinctFaces(rotatedFaces);
}

function expandedFaceBox(
  face: ImageFaceBox,
  imageWidth: number,
  imageHeight: number,
) {
  const horizontalMargin = face.width * 0.4;
  const verticalMargin = face.height * 0.5;
  const left = Math.max(0, Math.floor(face.x - horizontalMargin));
  const top = Math.max(0, Math.floor(face.y - verticalMargin));
  const right = Math.min(
    imageWidth,
    Math.ceil(face.x + face.width + horizontalMargin),
  );
  const bottom = Math.min(
    imageHeight,
    Math.ceil(face.y + face.height + verticalMargin),
  );

  return {
    left,
    top,
    width: Math.max(1, right - left),
    height: Math.max(1, bottom - top),
  };
}

function normalizedFaceBox(
  face: ImageFaceBox,
  imageWidth: number,
  imageHeight: number,
) {
  const x = Math.max(0, Math.min(imageWidth - 1, face.x));
  const y = Math.max(0, Math.min(imageHeight - 1, face.y));
  const width = Math.max(1, Math.min(imageWidth - x, face.width));
  const height = Math.max(1, Math.min(imageHeight - y, face.height));

  return { x, y, width, height };
}

export async function anonymizeImageBuffer(
  input: Uint8Array,
  options: ImageAnonymizationOptions = {},
): Promise<ImageAnonymizationResult> {
  if (input.byteLength === 0 || input.byteLength > MAX_INPUT_BYTES) {
    throw new Error(
      `Image must contain between 1 and ${MAX_INPUT_BYTES} bytes.`,
    );
  }

  const maxDimension = options.maxDimension ?? MAX_OUTPUT_DIMENSION;
  if (
    !Number.isInteger(maxDimension) ||
    maxDimension < 256 ||
    maxDimension > 4096
  ) {
    throw new Error("maxDimension must be an integer between 256 and 4096.");
  }

  const normalized = await sharp(input, {
    failOn: "warning",
    limitInputPixels: MAX_INPUT_PIXELS,
  })
    .rotate()
    .resize({
      width: maxDimension,
      height: maxDimension,
      fit: "inside",
      withoutEnlargement: true,
    })
    .removeAlpha()
    .toColourspace("srgb")
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = normalized.info;
  if (channels !== 3) {
    throw new Error(
      `Expected normalized RGB image, received ${channels} channels.`,
    );
  }

  const detectFaces = options.detectFaces ?? detectImageFaces;
  const faces = (await detectFaces(normalized.data, width, height)).map(
    (face) => normalizedFaceBox(face, width, height),
  );
  const baseImage = sharp(normalized.data, {
    raw: { width, height, channels },
  });

  const overlays = await Promise.all(
    faces.map(async (face) => {
      const region = expandedFaceBox(face, width, height);
      const sigma = Math.max(
        18,
        Math.min(100, Math.min(region.width, region.height) * 0.22),
      );
      const input = await baseImage
        .clone()
        .extract(region)
        .blur(sigma)
        .png()
        .toBuffer();

      return { input, left: region.left, top: region.top };
    }),
  );

  const buffer = await baseImage
    .clone()
    .composite(overlays)
    .jpeg({ quality: 88, chromaSubsampling: "4:4:4" })
    .toBuffer();

  return {
    buffer,
    contentType: "image/jpeg",
    width,
    height,
    sourceBytes: input.byteLength,
    outputBytes: buffer.byteLength,
    faces,
  };
}
