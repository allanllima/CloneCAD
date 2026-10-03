import {
  CADCoreAPI,
  CADPlugin,
  CADPointerEvent,
  CADTool,
  MultileaderEntity,
  Point2D,
} from '../../core/types';
import { AddEntityCommand } from '../../commands/AddEntityCommand';

export class MultileaderTool implements CADTool {
  public id = 'mleader';
  public name = 'Multileader';
  public category: 'annotation' = 'annotation';
  public cursor = 'crosshair';
  public shortcut = 'ML';

  private core: CADCoreAPI | null = null;
  private arrowPoint: Point2D | null = null;
  private contentStyle: 'text' | 'balloon' = 'text';

  public onActivate(core: CADCoreAPI): void {
    this.core = core;
    this.arrowPoint = null;
    this.contentStyle = 'text';
    this.core.setPrompt('MLEADER: Specify leader arrowhead location [or type B for balloon]:');
  }

  public onDeactivate(core: CADCoreAPI): void {
    this.cancel();
  }

  public onPointerDown(e: CADPointerEvent): void {
    if (!this.core || e.button !== 0) return;
    const pt = e.world;

    if (!this.arrowPoint) {
      this.arrowPoint = { ...pt };
      this.core.setPrompt('MLEADER: Specify leader landing location:');
    } else {
      const pArrow = this.arrowPoint;
      const pLanding = pt;
      const dir: 1 | -1 = pLanding.x >= pArrow.x ? 1 : -1;

      // Ask for note text
      const defaultText = this.contentStyle === 'balloon' ? '1' : 'DET. 01';
      const promptTitle = this.contentStyle === 'balloon'
        ? 'Enter Balloon Item Number:'
        : 'Enter Multileader Annotation Text:';

      const userInput = window.prompt(promptTitle, defaultText);
      const textVal = userInput !== null ? userInput.trim() : defaultText;

      const mleaderEnt: MultileaderEntity = {
        id: `ml_${Date.now()}`,
        type: 'multileader',
        layerId: this.core.getActiveLayer().id,
        arrowPoint: { ...pArrow },
        landingPoint: { ...pLanding },
        doglegLength: 8,
        landingDirection: dir,
        text: this.contentStyle === 'text' ? textVal : '',
        contentStyle: this.contentStyle,
        balloonNumber: this.contentStyle === 'balloon' ? textVal : undefined,
        arrowType: 'arrow',
        textHeight: 3,
        visible: true,
      };

      this.core.executeCommand(new AddEntityCommand(this.core, mleaderEnt));
      this.core.logCommandMessage(`MLEADER: Annotation "${textVal}" placed.`);
      this.cancel();
      this.core.setActiveTool('select');
    }
  }

  public onPointerMove(e: CADPointerEvent): void {
    if (!this.core || !this.arrowPoint) return;
    const pArrow = this.arrowPoint;
    const pLanding = e.world;
    const dir: 1 | -1 = pLanding.x >= pArrow.x ? 1 : -1;

    this.core.setPreviewEntity({
      id: 'preview_ml',
      type: 'multileader',
      layerId: this.core.getActiveLayer().id,
      arrowPoint: { ...pArrow },
      landingPoint: { ...pLanding },
      doglegLength: 8,
      landingDirection: dir,
      text: this.contentStyle === 'text' ? 'NOTE' : '',
      contentStyle: this.contentStyle,
      balloonNumber: this.contentStyle === 'balloon' ? '1' : undefined,
      arrowType: 'arrow',
      textHeight: 3,
      visible: true,
    });
  }

  public onPointerUp(_e: CADPointerEvent): void {}

  public onKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      this.cancel();
      this.core?.setActiveTool('select');
    } else if (e.key === 'b' || e.key === 'B') {
      this.contentStyle = this.contentStyle === 'text' ? 'balloon' : 'text';
      this.core?.logCommandMessage(`MLEADER Content Style toggled to: ${this.contentStyle.toUpperCase()}`);
    }
  }

  public cancel(): void {
    this.arrowPoint = null;
    this.core?.setPreviewEntity(null);
    this.core?.setPrompt('Command:');
  }
}

export class MultileaderPlugin implements CADPlugin {
  public id = 'multileader-tool';
  public name = 'Multileader Annotation Tool';
  public version = '1.0.0';
  public category: 'annotation' = 'annotation';

  public init(core: CADCoreAPI): void {
    core.registerTool(new MultileaderTool());
  }
}
