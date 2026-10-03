import { ImageEntity, Point2D } from '../types';

export class RasterImageManager {
  /**
   * Creates a new ImageEntity instance
   */
  public static createImageEntity(data: {
    url: string;
    position: Point2D;
    width: number;
    height: number;
    rotation?: number;
    opacity?: number;
    name?: string;
    layerId?: string;
  }): ImageEntity {
    return {
      id: `img_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
      type: 'image',
      layerId: data.layerId || '0',
      url: data.url,
      position: { ...data.position },
      width: Math.max(1, data.width),
      height: Math.max(1, data.height),
      rotation: data.rotation || 0,
      opacity: data.opacity !== undefined ? data.opacity : 1.0,
      name: data.name || 'Raster Image',
      visible: true,
    };
  }

  /**
   * Calibrates scale of a raster image given two picked reference points
   * and the known real-world distance between them.
   *
   * @param image Existing ImageEntity
   * @param p1 First point picked on drawing/image
   * @param p2 Second point picked on drawing/image
   * @param realDistance Known real-world distance in drawing units
   */
  public static calibrateScale(
    image: ImageEntity,
    p1: Point2D,
    p2: Point2D,
    realDistance: number
  ): ImageEntity {
    const currentDist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    if (currentDist < 1e-4 || realDistance <= 0) return { ...image };

    const factor = realDistance / currentDist;

    // Scale image dimensions
    const newWidth = image.width * factor;
    const newHeight = image.height * factor;

    // Keep point p1 stationary relative to world
    const offsetX = p1.x - image.position.x;
    const offsetY = p1.y - image.position.y;

    const newPosX = p1.x - offsetX * factor;
    const newPosY = p1.y - offsetY * factor;

    return {
      ...image,
      width: newWidth,
      height: newHeight,
      position: { x: newPosX, y: newPosY },
    };
  }
}
