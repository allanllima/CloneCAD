import { CADCommand } from './types';

export class HistoryManager {
  private undoStack: CADCommand[] = [];
  private redoStack: CADCommand[] = [];
  private maxHistory = 100;
  private onChangeCallback?: () => void;

  constructor(onChange?: () => void) {
    this.onChangeCallback = onChange;
  }

  public setOnChange(cb: () => void): void {
    this.onChangeCallback = cb;
  }

  public execute(command: CADCommand): void {
    try {
      command.execute();
      this.undoStack.push(command);
      if (this.undoStack.length > this.maxHistory) {
        this.undoStack.shift();
      }
      this.redoStack = [];
      this.onChangeCallback?.();
    } catch (err) {
      console.error(`Failed to execute command ${command.id}:`, err);
      throw err;
    }
  }

  public undo(): boolean {
    if (this.undoStack.length === 0) return false;
    const command = this.undoStack.pop()!;
    try {
      command.undo();
      this.redoStack.push(command);
      this.onChangeCallback?.();
      return true;
    } catch (err) {
      console.error(`Failed to undo command ${command.id}:`, err);
      return false;
    }
  }

  public redo(): boolean {
    if (this.redoStack.length === 0) return false;
    const command = this.redoStack.pop()!;
    try {
      command.execute();
      this.undoStack.push(command);
      this.onChangeCallback?.();
      return true;
    } catch (err) {
      console.error(`Failed to redo command ${command.id}:`, err);
      return false;
    }
  }

  public canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  public canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  public getHistory(): { undoStack: string[]; redoStack: string[] } {
    return {
      undoStack: this.undoStack.map((c) => c.name || c.id),
      redoStack: this.redoStack.map((c) => c.name || c.id),
    };
  }

  public clear(): void {
    this.undoStack = [];
    this.redoStack = [];
    this.onChangeCallback?.();
  }
}
