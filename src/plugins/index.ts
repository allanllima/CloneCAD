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
import { ErasePlugin } from './modify/ErasePlugin';
import { MovePlugin } from './modify/MovePlugin';
import { CopyPlugin } from './modify/CopyPlugin';
import { RotatePlugin } from './modify/RotatePlugin';

export * from './utility/SelectPlugin';
export * from './utility/PanPlugin';
export * from './utility/MeasurePlugin';
export * from './draw/LinePlugin';
export * from './draw/CirclePlugin';
export * from './draw/RectanglePlugin';
export * from './draw/PolylinePlugin';
export * from './draw/ArcPlugin';
export * from './annotation/TextPlugin';
export * from './modify/ErasePlugin';
export * from './modify/MovePlugin';
export * from './modify/CopyPlugin';
export * from './modify/RotatePlugin';

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

  // Modify
  core.registerPlugin(new ErasePlugin());
  core.registerPlugin(new MovePlugin());
  core.registerPlugin(new CopyPlugin());
  core.registerPlugin(new RotatePlugin());
}
