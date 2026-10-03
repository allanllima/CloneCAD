import { CADCoreAPI } from '../core/types';
import { SelectPlugin } from './utility/SelectPlugin';
import { PanPlugin } from './utility/PanPlugin';
import { MeasurePlugin } from './utility/MeasurePlugin';
import { LinePlugin } from './draw/LinePlugin';
import { CirclePlugin } from './draw/CirclePlugin';
import { RectanglePlugin } from './draw/RectanglePlugin';
import { PolylinePlugin } from './draw/PolylinePlugin';
import { ArcPlugin } from './draw/ArcPlugin';
import { TextPlugin } from './annotation/TextPlugin';
import { SplinePlugin } from './draw/SplinePlugin';
import { EllipsePlugin } from './draw/EllipsePlugin';
import { HatchPlugin } from './draw/HatchPlugin';
import { ErasePlugin } from './modify/ErasePlugin';
import { MovePlugin } from './modify/MovePlugin';
import { CopyPlugin } from './modify/CopyPlugin';
import { RotatePlugin } from './modify/RotatePlugin';
import { MirrorPlugin } from './modify/MirrorPlugin';
import { OffsetPlugin } from './modify/OffsetPlugin';
import { FilletChamferPlugin } from './modify/FilletChamferPlugin';
import { TrimExtendPlugin } from './modify/TrimExtendPlugin';
import { StretchPlugin } from './modify/StretchPlugin';
import { ArrayPlugin } from './modify/ArrayPlugin';

export * from './utility/SelectPlugin';
export * from './utility/PanPlugin';
export * from './utility/MeasurePlugin';
export * from './draw/LinePlugin';
export * from './draw/CirclePlugin';
export * from './draw/RectanglePlugin';
export * from './draw/PolylinePlugin';
export * from './draw/ArcPlugin';
export * from './draw/SplinePlugin';
export * from './draw/EllipsePlugin';
export * from './draw/HatchPlugin';
export * from './annotation/TextPlugin';
export * from './modify/ErasePlugin';
export * from './modify/MovePlugin';
export * from './modify/CopyPlugin';
export * from './modify/RotatePlugin';
export * from './modify/MirrorPlugin';
export * from './modify/OffsetPlugin';
export * from './modify/FilletChamferPlugin';
export * from './modify/TrimExtendPlugin';
export * from './modify/StretchPlugin';
export * from './modify/ArrayPlugin';

/**
 * Initializes and registers the standard AutoCAD plugin suite onto the core
 */
export function registerDefaultPlugins(core: CADCoreAPI): void {
  // Utility
  core.registerPlugin(new SelectPlugin());
  core.registerPlugin(new PanPlugin());
  core.registerPlugin(new MeasurePlugin());

  // Draw
  core.registerPlugin(new LinePlugin());
  core.registerPlugin(new PolylinePlugin());
  core.registerPlugin(new CirclePlugin());
  core.registerPlugin(new ArcPlugin());
  core.registerPlugin(new RectanglePlugin());
  core.registerPlugin(new TextPlugin());
  core.registerPlugin(new SplinePlugin());
  core.registerPlugin(new EllipsePlugin());
  core.registerPlugin(new HatchPlugin());

  // Modify (Phase 1 & Phase 2)
  core.registerPlugin(new ErasePlugin());
  core.registerPlugin(new MovePlugin());
  core.registerPlugin(new CopyPlugin());
  core.registerPlugin(new RotatePlugin());
  core.registerPlugin(new MirrorPlugin());
  core.registerPlugin(new OffsetPlugin());
  core.registerPlugin(new FilletChamferPlugin());
  core.registerPlugin(new TrimExtendPlugin());
  core.registerPlugin(new StretchPlugin());
  core.registerPlugin(new ArrayPlugin());
}
