import { CADCommand, CADCoreAPI, CADEntity } from '../core/types';

export class TransformEntityCommand implements CADCommand {
  public id: string;
  public name: string;
  private core: CADCoreAPI;
  private beforeStates: CADEntity[];
  private afterStates: CADEntity[];

  constructor(
    core: CADCoreAPI,
    before: CADEntity[],
    after: CADEntity[],
    name = 'TRANSFORM'
  ) {
    this.core = core;
    this.beforeStates = JSON.parse(JSON.stringify(before));
    this.afterStates = JSON.parse(JSON.stringify(after));
    this.id = `transform_${Date.now()}`;
    this.name = name;
  }

  public execute(): void {
    for (const ent of this.afterStates) {
      this.core.updateEntity(ent);
    }
  }

  public undo(): void {
    for (const ent of this.beforeStates) {
      this.core.updateEntity(ent);
    }
  }
}
