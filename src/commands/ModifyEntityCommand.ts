import { CADCommand, CADCoreAPI, CADEntity } from '../core/types';

export class ModifyEntityCommand implements CADCommand {
  public id: string;
  public name: string;
  private core: CADCoreAPI;
  private beforeState: CADEntity;
  private afterState: CADEntity;

  constructor(core: CADCoreAPI, before: CADEntity, after: CADEntity, name = 'MODIFY PROPERTIES') {
    this.core = core;
    this.beforeState = JSON.parse(JSON.stringify(before));
    this.afterState = JSON.parse(JSON.stringify(after));
    this.id = `modify_${before.id}_${Date.now()}`;
    this.name = name;
  }

  public execute(): void {
    this.core.updateEntity(this.afterState);
  }

  public undo(): void {
    this.core.updateEntity(this.beforeState);
  }
}
