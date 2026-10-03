import { CADCommand } from '../core/types';

export class CompositeCommand implements CADCommand {
  public id: string;
  public name: string;
  private commands: CADCommand[];

  constructor(commands: CADCommand[], name = 'BATCH OPERATION') {
    this.commands = commands;
    this.id = `composite_${Date.now()}`;
    this.name = name;
  }

  public execute(): void {
    for (const cmd of this.commands) {
      cmd.execute();
    }
  }

  public undo(): void {
    // Undo in reverse order
    for (let i = this.commands.length - 1; i >= 0; i--) {
      this.commands[i].undo();
    }
  }
}
