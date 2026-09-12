/**
 * prompt.ts — compose subagent prompts from a role persona + task.
 *
 * A subagent (coder or coder-critic) is spawned with an initial prompt that is
 * its full role persona followed by the concrete task and a fixed output
 * contract. The orchestrator parses the JSON in the subagent's final message
 * to drive the worker→critic→iterate loop.
 */
import type { Role } from './roles.js';

/** The output contract we ask every role to answer in its final message. */
export interface OutputContract {
  /** Field that must be a JSON string/object; leave undefined for free text. */
  readonly jsonField?: string;
  readonly instruction: string;
}

/** Build the initial prompt for a worker (creator) subagent. */
export function buildWorkerPrompt(role: Role, task: string): string {
  return [
    role.systemPrompt,
    '',
    '---',
    '',
    '## Your assignment',
    task,
    '',
    'When you are done, reply with a JSON object and nothing else:',
    '```json',
    '{"summary": "<what you produced, 2-4 sentences>", "files": ["<path to each file you created or modified>"], "done": true}',
    '```',
    'The "files" array lets the orchestrator hand your exact output paths to the reviewer.',
  ].join('\n');
}

/** Build the initial prompt for a critic (reviewer) subagent. */
export function buildCriticPrompt(
  role: Role,
  target: { files: readonly string[]; summary: string },
): string {
  const fileList = target.files.length > 0
    ? target.files.map((f) => `- ${f}`).join('\n')
    : '(no files listed)';

  return [
    role.systemPrompt,
    '',
    '---',
    '',
    '## Your assignment',
    'Review the work below. Read the listed files, check them against your rubric,',
    'and produce a scored report. Do NOT edit or create any files.',
    '',
    '### Files to review',
    fileList,
    '',
    '### Producer summary',
    target.summary,
    '',
    'When you are done, reply with a JSON object and nothing else:',
    '```json',
    '{"score": <0-100>, "verdict": "<summary of the score, 1-2 sentences>", "issues": [{"severity": "critical|major|minor", "detail": "<specific issue with file/line>"}], "done": true}',
    '```',
    '"score" drives the iteration: below 80 the producer will be asked to fix the "critical" and "major" issues.',
  ].join('\n');
}

/** Parse the JSON contract out of a subagent's final message text. */
export function parseJsonReply<T>(text: string): T | undefined {
  // The model may wrap the JSON in a ```json fence or stray prose.
  const fence = text.match(/```json\s*([\s\S]*?)```/);
  const candidate: string = fence?.[1] ?? text;
  // Find the first balanced JSON object.
  const start = candidate.indexOf('{');
  if (start < 0) return undefined;
  let depth = 0;
  let inString = false;
  let esc = false;
  for (let i = start; i < candidate.length; i++) {
    const ch = candidate[i];
    if (inString) {
      if (esc) esc = false;
      else if (ch === '\\') esc = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) {
        try {
          return JSON.parse(candidate.slice(start, i + 1)) as T;
        } catch {
          return undefined;
        }
      }
    }
  }
  return undefined;
}
