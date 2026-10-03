import { CADCommand, CADCoreAPI, CADEntity } from '../core/types';

export class DeleteEntityCommand implements CADCommand {
  public id: string;
  public name: string;
  private core: CADCoreAPI;
  private entities: CADEntity[];

  constructor(core: CADCoreAPI, entities: CADEntity | CADEntity[], name = 'ERASE') {
    this.core = core;
    const list = Array.isArray(entities) ? entities : [entities];
    this.entities = list.map((e) => JSON.parse(JSON.stringify(e)));
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
