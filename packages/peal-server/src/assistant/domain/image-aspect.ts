import { Schema } from "effect";

/**
 * The aspects the assistant makes images in: square, wider than tall, or
 * taller than wide. Each is the size the provider is asked for.
 */
export const ImageAspectSchema = Schema.Literals([
  "square",
  "landscape",
  "portrait",
]);

export type ImageAspect = typeof ImageAspectSchema.Type;
