import { CADCommand, CADCoreAPI, CADEntity } from '../core/types';

export class AddEntityCommand implements CADCommand {
  public id: string;
  public name: string;
  private core: CADCoreAPI;
  private entity: CADEntity;

  constructor(core: CADCoreAPI, entity: CADEntity, name?: string) {
    this.core = core;
    this.entity = { ...entity };
    this.id = `add_${entity.id}_${Date.now()}`;
    this.name = name || `Add ${entity.type.toUpperCase()}`;
  }

  public execute(): void {
    this.core.addEntity(this.entity, false);
  }

  public undo(): void {
    this.core.removeEntity(this.entity.id);
  }
}
