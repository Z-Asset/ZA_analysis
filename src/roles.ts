/**
 * roles.ts — load worker/critic role definitions from references/agents/*.md.
 *
 * Each role file has YAML frontmatter (name, description, tools, model) plus a
 * markdown body that is the full role persona. We strip the frontmatter and
 * return the body as the subagent's system prompt, plus the declared tool list
 * (used to build the toolFilter that keeps critics read-only).
 */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';

/** A loaded role: system prompt text + declared tool names (if any). */
export interface Role {
  /** Role name, e.g. "coder", "coder-critic". */
  readonly name: string;
  /** Frontmatter description, if present. */
  readonly description?: string;
  /** Declared tools from frontmatter (e.g. ["Read","Grep","Glob"]), or empty. */
  readonly tools: readonly string[];
  /** Frontmatter `model`, if present (e.g. "inherit"). */
  readonly model?: string;
  /** The markdown body — the role persona, used as the subagent system prompt. */
  readonly systemPrompt: string;
}

interface Frontmatter {
  name?: unknown;
  description?: unknown;
  tools?: unknown;
  model?: unknown;
}

function splitFrontmatter(raw: string): { data: Frontmatter; body: string } | undefined {
  const firstBreak = raw.indexOf('\n');
  if (firstBreak < 0) return undefined;
  if (raw.slice(0, firstBreak).replace(/\r$/, '') !== '---') return undefined;

  let lineStart = firstBreak + 1;
  let bodyStart = -1;
  while (lineStart <= raw.length) {
    const nextBreak = raw.indexOf('\n', lineStart);
    const lineEnd = nextBreak < 0 ? raw.length : nextBreak;
    if (raw.slice(lineStart, lineEnd).replace(/\r$/, '') === '---') {
      bodyStart = nextBreak < 0 ? raw.length : nextBreak + 1;
      break;
    }
    if (nextBreak < 0) return undefined;
    lineStart = nextBreak + 1;
  }
  if (bodyStart < 0) return undefined;

  const parsed = parseYaml(raw.slice(firstBreak + 1, lineStart));
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return { data: {}, body: raw.slice(bodyStart) };
  }
  return { data: parsed as Frontmatter, body: raw.slice(bodyStart) };
}

function stringField(v: unknown): string | undefined {
  return typeof v === 'string' && v.length > 0 ? v : undefined;
}

function toolsField(v: unknown): readonly string[] {
  if (typeof v === 'string') {
    return v.split(',').map((s) => s.trim()).filter(Boolean);
  }
  if (Array.isArray(v)) {
    return v.filter((x): x is string => typeof x === 'string' && x.length > 0);
  }
  return [];
}

/**
 * Load one role from `references/agents/<roleName>.md`.
 * Throws if the file is missing; the orchestrator catches this and degrades.
 */
export async function loadRole(
  referencesRoot: string,
  roleName: string,
): Promise<Role> {
  const file = join(referencesRoot, 'agents', `${roleName}.md`);
  const raw = await readFile(file, 'utf8');
  const parsed = splitFrontmatter(raw);

  const data = parsed?.data ?? {};
  const name = stringField(data.name) ?? roleName;
  const description = stringField(data.description);
  const tools = toolsField(data.tools);
  const model = stringField(data.model);
  const systemPrompt = (parsed?.body ?? raw).trim();

  if (systemPrompt.length === 0) {
    throw new Error(`role ${roleName} has empty body`);
  }

  return { name, description, tools, model, systemPrompt };
}
