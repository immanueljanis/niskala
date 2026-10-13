import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { compile_program, createFileManager } from "@noir-lang/noir_wasm";
import type { CompiledCircuit } from "@noir-lang/types";
import { ARTIFACT_PATH, CIRCUIT_DIR, TARGET_DIR } from "./paths.ts";

const PATCHED = ["join", "resolve", "normalize", "isAbsolute", "dirname", "basename", "relative", "extname"] as const;

/**
 * noir_wasm 1.0.0-rc.3 builds the entry-point path with win32 `path.join` but lists sources
 * with "/" joins, so on Windows the compiler cannot find `src\main.nr`. Running the compile
 * with POSIX path functions and a drive-less absolute path (which Node's fs accepts on Windows)
 * keeps every path forward-slashed. No-op on POSIX hosts.
 */
async function withPosixPaths<T>(fn: () => Promise<T>): Promise<T> {
  if (process.platform !== "win32") return fn();
  const mutable = path as unknown as Record<string, unknown>;
  const saved = Object.fromEntries(PATCHED.map((k) => [k, mutable[k]]));
  for (const k of PATCHED) mutable[k] = path.posix[k];
  try {
    return await fn();
  } finally {
    for (const k of PATCHED) mutable[k] = saved[k];
  }
}

function toCompilerPath(dir: string): string {
  if (process.platform !== "win32") return dir;
  const posix = dir.split("\\").join("/");
  const cwdDrive = process.cwd().slice(0, 2).toUpperCase();
  if (posix.slice(0, 2).toUpperCase() !== cwdDrive) throw new Error(`circuit dir must be on drive ${cwdDrive}: ${dir}`);
  return posix.slice(2);
}

/** Compiles circuits/best_quote with noir_wasm (no nargo binary needed) and writes the artifact. */
export async function compileCircuit(): Promise<CompiledCircuit> {
  const program = await withPosixPaths(async () => {
    const fm = createFileManager(toCompilerPath(CIRCUIT_DIR));
    const { program } = await compile_program(fm, undefined, console.log, () => {});
    return program;
  });
  mkdirSync(TARGET_DIR, { recursive: true });
  writeFileSync(ARTIFACT_PATH, JSON.stringify(program));
  return program;
}
