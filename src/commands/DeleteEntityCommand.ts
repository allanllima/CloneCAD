import { CADCommand, CADCoreAPI, CADEntity } from '../core/types';

export class DeleteEntityCommand implements CADCommand {
  public id: string;
  public name: string;
  private core: CADCoreAPI;
  private entities: CADEntity[];

  constructor(core: CADCoreAPI, entities: CADEntity[], name = 'ERASE') {
    this.core = core;
    this.entities = entities.map((e) => JSON.parse(JSON.stringify(e)));
    this.id = `delete_${Date.now()}`;
    this.name = name;
  }

  public execute(): void {
    for (const ent of this.entities) {
      this.core.removeEntity(ent.id);
    }
  }

  public undo(): void {
    for (const ent of this.entities) {
      this.core.addEntity(ent, false);
    }
  }
}
