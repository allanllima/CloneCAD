import {
  CADCoreAPI,
  CADCommit,
  CADBranch,
  CADDiffResult,
} from '../types';
import { CADDiffEngine } from './CADDiffEngine';

export class VersionControlManager {
  private commits: Map<string, CADCommit> = new Map();
  private commitOrder: Map<string, number> = new Map();
  private commitSeq = 0;
  private branches: Map<string, CADBranch> = new Map();
  private currentBranchName = 'main';

  constructor(private core: CADCoreAPI) {
    this.branches.set('main', { name: 'main', headCommitId: '' });
  }

  public getCurrentBranch(): string {
    return this.currentBranchName;
  }

  public getBranches(): string[] {
    return Array.from(this.branches.keys());
  }

  public getCommits(branchName?: string): CADCommit[] {
    const targetBranch = branchName || this.currentBranchName;
    return Array.from(this.commits.values())
      .filter((c) => c.branch === targetBranch)
      .sort((a, b) => {
        const orderDiff = (this.commitOrder.get(b.id) || 0) - (this.commitOrder.get(a.id) || 0);
        if (orderDiff !== 0) return orderDiff;
        return b.timestamp - a.timestamp;
      });
  }

  public getCommit(id: string): CADCommit | undefined {
    return this.commits.get(id);
  }

  public commit(message: string, author = 'Arquiteto'): CADCommit {
    const branch = this.branches.get(this.currentBranchName);
    const parentId = branch?.headCommitId || undefined;

    // Snapshot entities and layers
    const entities = JSON.parse(JSON.stringify(this.core.getEntities()));
    const layers = JSON.parse(JSON.stringify(this.core.getLayers()));

    const commitId = Math.random().toString(16).substring(2, 9);
    const newCommit: CADCommit = {
      id: commitId,
      message,
      author,
      timestamp: Date.now(),
      branch: this.currentBranchName,
      entities,
      layers,
      parentId,
    };

    this.commits.set(commitId, newCommit);
    this.commitOrder.set(commitId, ++this.commitSeq);
    if (branch) {
      branch.headCommitId = commitId;
    }

    this.core.logCommandMessage(`[VCS] Commit criado [${commitId}]: "${message}" (${entities.length} entidades)`);
    this.core.emit('vcs:commit_created', newCommit);
    return newCommit;
  }

  public createBranch(name: string): boolean {
    const clean = name.trim();
    if (!clean || this.branches.has(clean)) return false;

    const currentHead = this.branches.get(this.currentBranchName)?.headCommitId || '';
    this.branches.set(clean, { name: clean, headCommitId: currentHead });
    this.core.logCommandMessage(`[VCS] Novo branch criado: "${clean}" a partir de "${this.currentBranchName}"`);
    return true;
  }

  public checkoutBranch(name: string): boolean {
    const target = this.branches.get(name);
    if (!target) return false;

    this.currentBranchName = name;
    if (target.headCommitId) {
      this.checkoutCommit(target.headCommitId);
    }
    this.core.logCommandMessage(`[VCS] Mudou para branch: "${name}"`);
    this.core.emit('vcs:branch_changed', name);
    return true;
  }

  public checkoutCommit(commitId: string): boolean {
    const target = this.commits.get(commitId);
    if (!target) return false;

    // Replace entities in CADCore
    (this.core as any).clearEntities?.();
    for (const ent of target.entities) {
      this.core.addEntity(ent);
    }

    // Merge or restore layers
    for (const ly of target.layers) {
      if (!this.core.getLayers().some((l) => l.id === ly.id)) {
        this.core.addLayer(ly);
      }
    }

    this.core.zoomExtents();
    this.core.requestRender();
    this.core.logCommandMessage(`[VCS] Revertido para commit [${commitId}]: "${target.message}"`);
    return true;
  }

  public diffCommits(commitIdA: string, commitIdB: string): CADDiffResult {
    const a = this.commits.get(commitIdA);
    const b = this.commits.get(commitIdB);
    const entsA = a ? a.entities : [];
    const entsB = b ? b.entities : [];
    return CADDiffEngine.diff(entsA, entsB);
  }

  public diffCurrentWithCommit(commitId: string): CADDiffResult {
    const target = this.commits.get(commitId);
    const entsBefore = target ? target.entities : [];
    const entsCurrent = this.core.getEntities();
    return CADDiffEngine.diff(entsBefore, entsCurrent);
  }
}
