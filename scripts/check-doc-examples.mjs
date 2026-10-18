/**
 * Type-check and execute TypeScript examples marked with `// docs-check`.
 * Build the package first so examples resolve against its published types and
 * runtime entry point rather than importing implementation source directly.
 */
import { readFileSync, readdirSync, writeFileSync, unlinkSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const docsDir = join(root, "docs");
const examplePattern = /^```(?:ts|typescript)(?:[ \t]+[^\r\n]*)?\r?\n([\s\S]*?)^```\s*$/gmu;
const markedExample = /^\/\/ docs-check\s*\r?\n/u;

function markdownFiles(dir) {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...markdownFiles(path));
    else if (entry.isFile() && path.endsWith(".md")) files.push(path);
  }
  return files;
}

const examples = [];
for (const path of markdownFiles(docsDir)) {
  const markdown = readFileSync(path, "utf8");
  for (const match of markdown.matchAll(examplePattern)) {
    if (markedExample.test(match[1])) {
      examples.push({
        path,
        source: match[1].replace(markedExample, ""),
      });
    }
  }
}

if (examples.length === 0) {
  console.error("check-doc-examples: found no TypeScript examples marked with // docs-check");
  process.exit(2);
}

const compilerOptions = {
  target: ts.ScriptTarget.ES2020,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  strict: true,
  skipLibCheck: true,
  noEmit: true,
  types: [],
};

let failed = false;

for (const [index, example] of examples.entries()) {
  const stem = `.docs-example-check-${process.pid}-${index}`;
  const typeFile = join(root, `${stem}.ts`);
  const runtimeFile = join(root, `${stem}.mjs`);

  try {
    writeFileSync(typeFile, example.source, "utf8");
    const program = ts.createProgram([typeFile], compilerOptions);
    const diagnostics = ts.getPreEmitDiagnostics(program);

    if (diagnostics.length > 0) {
      failed = true;
      console.error(`\n${relative(root, example.path)}: type-check failed`);
      console.error(
        ts.formatDiagnosticsWithColorAndContext(diagnostics, {
          getCurrentDirectory: ts.sys.getCurrentDirectory,
          getCanonicalFileName: (path) => path,
          getNewLine: () => ts.sys.newLine,
        }),
      );
      continue;
    }

    const transpiled = ts.transpileModule(example.source, {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2020,
      },
      reportDiagnostics: true,
    });
    if (transpiled.diagnostics?.length) {
      failed = true;
      console.error(`\n${relative(root, example.path)}: transpilation failed`);
      console.error(
        ts.formatDiagnosticsWithColorAndContext(transpiled.diagnostics, {
          getCurrentDirectory: ts.sys.getCurrentDirectory,
          getCanonicalFileName: (path) => path,
          getNewLine: () => ts.sys.newLine,
        }),
      );
      continue;
    }

    writeFileSync(runtimeFile, transpiled.outputText, "utf8");
    const result = spawnSync(process.execPath, [runtimeFile], {
      cwd: root,
      encoding: "utf8",
    });
    if (result.status !== 0) {
      failed = true;
      console.error(`\n${relative(root, example.path)}: execution failed`);
      if (result.stdout) console.error(result.stdout.trimEnd());
      if (result.stderr) console.error(result.stderr.trimEnd());
      if (result.error) console.error(result.error.message);
      continue;
    }

    console.log(`  ok  ${relative(root, example.path)} example ${index + 1}`);
  } finally {
    for (const path of [typeFile, runtimeFile]) {
      try {
        unlinkSync(path);
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
      }
    }
  }
}

if (failed) {
  console.error(`\ncheck-doc-examples: failed ${examples.length} marked example(s)`);
  process.exit(1);
}

console.log(`\ncheck-doc-examples: ${examples.length} example(s) type-checked and executed.`);
