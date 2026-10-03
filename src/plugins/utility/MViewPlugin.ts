import {
  CADPlugin,
  CADCoreAPI,
  CADPointerEvent,
  Point2D,
  RectangleEntity,
} from '../../core/types';

export class MViewPlugin implements CADPlugin {
  public id = 'utility-mview';
  public name = 'MView (Make Viewport)';
  public version = '1.0.0';
  public category: 'utility' = 'utility';

  private core: any = null;
  private firstCorner: Point2D | null = null;

  public init(core: CADCoreAPI): void {
    this.core = core;

    // Register MVIEW tool
    this.core.registerTool({
      id: 'mview',
      name: 'MVIEW',
      cursor: 'crosshair',
      onActivate: () => {
        const isModel = this.core.isModelSpace ? this.core.isModelSpace() : true;
        if (isModel) {
          this.core.logCommandMessage('** MVIEW: Mude para uma aba de Layout (Paper Space) para criar viewports. **');
          this.core.setActiveTool('select');
          return;
        }
        this.firstCorner = null;
        this.core.setPrompt('MVIEW Especifique o primeiro canto da viewport:');
      },
      onDeactivate: () => {
        this.firstCorner = null;
        this.core.setPreviewEntity(null);
      },
      onPointerDown: (e: CADPointerEvent) => this.onPointerDown(e),
      onPointerMove: (e: CADPointerEvent) => this.onPointerMove(e),
      onPointerUp: () => {},
      onKeyDown: (e: KeyboardEvent) => this.onKeyDown(e),
    });
  }

  private onPointerDown(e: CADPointerEvent): void {
    if (e.button !== 0) return;

    if (!this.firstCorner) {
      this.firstCorner = { ...e.world };
      this.core.setPrompt('MVIEW Especifique o canto oposto:');
    } else {
      const p1 = this.firstCorner;
      const p2 = e.world;
      const x = Math.min(p1.x, p2.x);
      const y = Math.min(p1.y, p2.y);
      const width = Math.abs(p2.x - p1.x);
      const height = Math.abs(p2.y - p1.y);

      if (width > 10 && height > 10) {
        const activeLayout = this.core.getActiveLayout?.();
        if (activeLayout && this.core.addLayoutViewport) {
          this.core.addLayoutViewport(activeLayout.id, {
            x,
            y,
            width,
            height,
            viewCenter: { x: 0, y: 0 },
            scale: 0.02,
            scaleName: '1:50',
            rotation: 0,
            frozenLayers: [],
            locked: false,
            title: 'NOVA VISTA - 1:50',
          });
          this.core.logCommandMessage(`Viewport criada: ${width.toFixed(0)}x${height.toFixed(0)}mm (Escala 1:50)`);
        }
      }

      this.firstCorner = null;
      this.core.setPreviewEntity(null);
      this.core.setPrompt('Command:');
      this.core.setActiveTool('select');
    }
  }

  private onPointerMove(e: CADPointerEvent): void {
    if (!this.firstCorner) return;

    const p1 = this.firstCorner;
    const p2 = e.world;
    const x = Math.min(p1.x, p2.x);
    const y = Math.min(p1.y, p2.y);
    const width = Math.abs(p2.x - p1.x);
    const height = Math.abs(p2.y - p1.y);

    const preview: RectangleEntity = {
      id: '__preview_mview__',
      type: 'rectangle',
      layerId: '0',
      color: '#00e5ff',
      origin: { x, y },
      width,
      height,
      visible: true,
    };
    this.core.setPreviewEntity(preview);
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      this.firstCorner = null;
      this.core.setPreviewEntity(null);
      this.core.setPrompt('Command:');
      this.core.setActiveTool('select');
    }
  }
}
