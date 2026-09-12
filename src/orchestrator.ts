/**
 * orchestrator.ts — spawn real subagents for the worker→critic loop.
 *
 * The /analyze command spawns a `coder` subagent (creator, full tool access),
 * collects its output from the `subagent/end` event, then spawns a
 * `coder-critic` subagent (read-only via toolFilter.deny). If the critic scores
 * below 80 and we are under the strike limit, the critic's issues are fed back
 * to the coder for another round (three-strikes).
 *
 * Everything is defensive: if the subagents service is unavailable or a spawn
 * throws, the command degrades to role-play guidance (the SKILL.md path).
 */

import type { Context } from '@deepseek-ai/cordis';
import { join } from 'node:path';
import { loadRole, type Role } from './roles.js';
import {
  buildWorkerPrompt,
  buildCriticPrompt,
  parseJsonReply,
} from './prompt.js';

// --- minimal structural types (the official .d.ts is compiled into the dsh
// binary; these mirror the shapes used by dsh-vibe-math, the working reference)
// ---------------------------------------------------------------------------
interface TextBlock { type: 'text'; text: string; }

interface SubagentAgent {
  readonly id: string;
  readonly session?: { header?: { cwd?: string; parentSession?: unknown } };
}

interface SubagentStartSpec {
  provider?: string;
  label?: string;
  request: {
    prompt: TextBlock[];
    parent: SubagentAgent;
    agentOptions?: { provider?: string; model?: string };
    toolFilter?: { allow?: string[]; deny?: string[] };
  };
  signal?: AbortSignal;
}

interface SubagentEndInfo {
  readonly id?: string;
  readonly stopReason?: string;
  readonly lastAssistantMessage?: unknown;
}

interface SubagentsService {
  list?: () => string[];
  startContinuable: (spec: SubagentStartSpec) => Promise<{ childId: string }>;
  sendMessage?: (
    sender: SubagentAgent,
    childId: string,
    content: TextBlock[],
    opts: { signal?: AbortSignal },
  ) => Promise<unknown>;
  interrupt?: (childId: string, opts: { kind: string; agent: SubagentAgent }) => void;
}

interface CommandsService {
  register: (cmd: {
    name: string;
    description: string;
    input?: { hint?: string };
    handler: (inv: { agent?: SubagentAgent; rawInput?: string }) => Promise<{ kind: string; text: string }>;
  }) => void;
}

interface OrchestratorConfig {
  /** Command name, e.g. "analyze". */
  commandName: string;
  /** Command description shown in /help. */
  commandDescription: string;
  /** Role file names (no .md) for worker then critic. */
  workerRole: string;
  criticRole: string;
  /** Absolute path to the plugin's references/agents directory. */
  referencesDir: string;
  /** Score below which the critic's issues are fed back to the worker. */
  passThreshold?: number;
  /** Max worker→critic iterations. */
  maxStrikes?: number;
}

interface WorkerReply {
  summary?: string;
  files?: string[];
  done?: boolean;
}

interface CriticReply {
  score?: number;
  verdict?: string;
  issues?: Array<{ severity?: string; detail?: string }>;
  done?: boolean;
}

/**
 * Mount the /analyze orchestrator command. Returns a disposer if the caller
 * needs one; registration itself never throws.
 */
export function setupOrchestrator(ctx: Context, config: OrchestratorConfig): void {
  // Probe optional host services via ctx.get() — never assume they exist, and
  // never declare them in `inject` (a missing service would then fail the whole
  // plugin tree). When absent, we degrade to role-play.
  const get = (ctx as unknown as { get?: (name: string) => unknown }).get?.bind(ctx);
  const subagents = get?.('subagents') as SubagentsService | undefined;
  const commands = get?.('commands') as CommandsService | undefined;

  if (!commands || typeof commands.register !== 'function') {
    // No commands service — nothing to mount (a host without it can't run /analyze).
    return;
  }

  const threshold = config.passThreshold ?? 80;
  const maxStrikes = config.maxStrikes ?? 3;

  commands.register({
    name: config.commandName,
    description: config.commandDescription,
    input: { hint: '[dataset path or analysis goal]' },
    handler: async (inv) => {
      const rootAgent = inv.agent;
      const task = (inv.rawInput ?? '').trim();

      // --- degrade path: no subagents service, no root agent, or empty task ---
      if (!subagents || typeof subagents.startContinuable !== 'function' || !rootAgent) {
        return degradeReply(config, task);
      }
      if (!task) {
        return { kind: 'success', text: `${config.commandDescription}\n\n用法: /${config.commandName} [dataset 或分析目标]\n` };
      }

      try {
        return await runWorkerCriticLoop(ctx, config, subagents, rootAgent, task, threshold, maxStrikes);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        ctx.logger?.warn?.(`[${config.commandName}] orchestration failed, degrading: ${msg}`);
        return degradeReply(config, task);
      }
    },
  });
}

/** Run the real worker→critic loop. */
async function runWorkerCriticLoop(
  ctx: Context,
  config: OrchestratorConfig,
  subagents: SubagentsService,
  rootAgent: SubagentAgent,
  task: string,
  threshold: number,
  maxStrikes: number,
): Promise<{ kind: string; text: string }> {
  // Load both roles once.
  const workerRole = await loadRole(config.referencesDir, config.workerRole);
  const criticRole = await loadRole(config.referencesDir, config.criticRole);

  const provider = pickProvider(subagents);

  let round = 0;
  let lastFiles: string[] = [];
  let lastSummary = task;
  let feedback = '';

  while (round < maxStrikes) {
    round++;

    // --- spawn worker ---
    const workerPromptText = buildWorkerPrompt(workerRole, round === 1 ? task : buildFixTask(task, feedback));
    const workerChild = await spawnAndWait(ctx, subagents, {
      provider,
      label: `${config.workerRole}-${round}`,
      rootAgent,
      prompt: workerPromptText,
      toolFilter: workerToolFilter(workerRole),
      roleName: config.workerRole,
    });

    const workerReply = parseJsonReply<WorkerReply>(workerChild.text);
    lastFiles = Array.isArray(workerReply?.files) ? workerReply.files.filter((f): f is string => typeof f === 'string') : [];
    lastSummary = workerReply?.summary ?? workerChild.text.slice(0, 500);

    // --- spawn critic (read-only) ---
    const criticPromptText = buildCriticPrompt(criticRole, { files: lastFiles, summary: lastSummary });
    const criticChild = await spawnAndWait(ctx, subagents, {
      provider,
      label: `${config.criticRole}-${round}`,
      rootAgent,
      prompt: criticPromptText,
      toolFilter: criticToolFilter(criticRole),
      roleName: config.criticRole,
    });

    const criticReply = parseJsonReply<CriticReply>(criticChild.text);
    const score = typeof criticReply?.score === 'number' ? criticReply.score : NaN;

    if (Number.isFinite(score) && score >= threshold) {
      return { kind: 'success', text: buildFinalReport(config, round, score, criticReply, lastFiles) };
    }

    // Below threshold: build feedback for the next round.
    const issues = Array.isArray(criticReply?.issues) ? criticReply.issues : [];
    feedback = issues
      .filter((i) => i && (i.severity === 'critical' || i.severity === 'major'))
      .map((i) => `- [${i.severity}] ${i.detail}`)
      .join('\n') || (criticReply?.verdict ?? 'fix the critical and major issues');

    if (round >= maxStrikes) {
      return {
        kind: 'success',
        text: buildFinalReport(config, round, score, criticReply, lastFiles, /*struckOut=*/ true),
      };
    }
  }

  // Unreachable, but keep the return type happy.
  return { kind: 'success', text: `${config.commandName} finished after ${maxStrikes} rounds.` };
}

interface SpawnAndWaitOpts {
  provider: string;
  label: string;
  rootAgent: SubagentAgent;
  prompt: string;
  toolFilter?: { allow?: string[]; deny?: string[] };
  roleName: string;
}

/** Spawn one subagent and wait for its `subagent/end` event. */
function spawnAndWait(
  ctx: Context,
  subagents: SubagentsService,
  opts: SpawnAndWaitOpts,
): Promise<{ text: string }> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new Error(`${opts.roleName} timed out`));
    }, 600_000); // 10 min ceiling; the subagent normally ends far sooner.

    const endHandler = (info: SubagentEndInfo) => {
      if (settled) return;
      if (info.id !== undefined && info.id !== '' ) {
        // We don't know the childId ahead of the event in every host; accept the
        // first end event matching our label is unreliable. Instead, resolve on
        // the first end after spawn — the orchestrator runs one subagent at a
        // time, so this is safe.
      }
      settled = true;
      clearTimeout(timeout);
      const text = blocksToText(info.lastAssistantMessage);
      resolve({ text });
    };

    const looseCtx = ctx as unknown as {
      on: (event: string, handler: (info: SubagentEndInfo) => void) => void;
      off?: (event: string, handler: (info: SubagentEndInfo) => void) => void;
    };
    looseCtx.on('subagent/end', endHandler);

    const signal = AbortSignal.timeout(600_000);

    subagents.startContinuable({
      provider: opts.provider,
      label: opts.label,
      request: {
        prompt: [{ type: 'text', text: opts.prompt }],
        parent: opts.rootAgent,
        ...(opts.toolFilter ? { toolFilter: opts.toolFilter } : {}),
      },
      signal,
    }).then((started) => {
      // childId is captured for potential interrupt; not strictly needed here.
      void started;
    }).catch((err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      looseCtx.off?.('subagent/end', endHandler);
      reject(err);
    });
  });
}

function pickProvider(subagents: SubagentsService): string {
  try {
    const list = subagents.list?.() ?? [];
    if (list.includes('spawn')) return 'spawn';
    if (list.includes('fork')) return 'fork';
  } catch {
    /* ignore */
  }
  return 'spawn';
}

/** Worker gets full write access (mirrors the coder role's declared tools). */
function workerToolFilter(role: Role): { allow?: string[]; deny?: string[] } | undefined {
  const deny = role.tools.length > 0 ? [] : undefined;
  // By default allow everything (no filter). We only add a deny list when the
  // role explicitly declares a read-only tool set — but workers are creators.
  return undefined;
}

/** Critic is strictly read-only. */
function criticToolFilter(_role: Role): { allow?: string[]; deny?: string[] } {
  // Deny all mutating tools. Read/Grep/Glob stay available. Always use `deny`
  // (never a positive `allow`) because the host's tool names are not guaranteed
  // to match the role file's "Read/Grep/Glob" spelling; a mismatched allow
  // would strip every tool from the critic.
  const deny = [
    'Write', 'Edit', 'MultiEdit', 'Bash', 'NotebookEdit',
    'write_file', 'edit_file', 'apply_patch', 'bash', 'pwsh',
  ];
  return { deny };
}

function blocksToText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    return value
      .map((b) => (b && typeof b === 'object' && 'text' in (b as object) ? String((b as TextBlock).text) : ''))
      .join('\n');
  }
  return '';
}

function buildFixTask(task: string, feedback: string): string {
  return [
    'Revise your previous work to fix the reviewer\'s critical and major issues.',
    '',
    'Original task:',
    task,
    '',
    'Reviewer feedback:',
    feedback,
  ].join('\n');
}

function buildFinalReport(
  config: OrchestratorConfig,
  round: number,
  score: number,
  critic: CriticReply | undefined,
  files: string[],
  struckOut = false,
): string {
  const lines: string[] = [];
  lines.push(`${config.commandName} — worker/critic 编排完成（${round} 轮）`);
  if (Number.isFinite(score)) {
    lines.push(`最终评分: ${score}/100${struckOut ? '（已达 ${config.maxStrikes} 轮上限）'.replace('${config.maxStrikes}', String(config.maxStrikes)) : ''}`);
  }
  if (critic?.verdict) lines.push(`评审结论: ${critic.verdict}`);
  if (files.length > 0) {
    lines.push('产出文件:');
    files.forEach((f) => lines.push(`  - ${f}`));
  }
  if (Array.isArray(critic?.issues) && critic.issues.length > 0) {
    lines.push('遗留问题:');
    critic.issues.forEach((i) => lines.push(`  - [${i.severity ?? 'minor'}] ${i.detail ?? ''}`));
  }
  return lines.join('\n');
}

/** Fallback reply when subagents are unavailable: point at role-play. */
function degradeReply(config: OrchestratorConfig, task: string): { kind: string; text: string } {
  return {
    kind: 'success',
    text: [
      `${config.commandName} 进入角色扮演模式（本环境无 subagent 服务，已自动降级）。`,
      '',
      `任务: ${task || '(未提供)'}`,
      '',
      '请按 SKILL.md 流程执行：先读角色定义，再以对应角色身份完成工作与评审。',
      `角色文件: skills/${config.commandName}/references/agents/${config.workerRole}.md 与 ${config.criticRole}.md`,
    ].join('\n'),
  };
}

export const __orchestratorInternals = {
  // Exposed for the node-side verification harness (not part of the runtime API).
  pickProvider,
  workerToolFilter,
  criticToolFilter,
  blocksToText,
};
