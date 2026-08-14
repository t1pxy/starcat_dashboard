/**
 * Lets `node --test` load the project's TypeScript directly.
 *
 * Node strips types on its own, but it still resolves specifiers the way ESM
 * does: `./thresholds` and `@/lib/devices/types` are not files, so every import
 * in `src/` would fail. Rather than rewrite a few hundred imports across the
 * app to suit the test runner — or add a bundler as a dependency purely to run
 * tests — this teaches Node the two resolution rules the project already uses:
 *
 *   - an extensionless relative import may mean `.ts` / `.tsx`
 *   - `@/…` means `src/…`, matching the `paths` entry in tsconfig.json
 *
 * Used as `node --import ./scripts/ts-resolve.mjs --test …` (see `pnpm test`).
 */
import { registerHooks } from "node:module";
import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve } from "node:path";

const projectRoot = dirname(fileURLToPath(new URL("..", import.meta.url)));
const srcRoot = resolve(projectRoot, "src");

const CANDIDATE_SUFFIXES = [".ts", ".tsx", "/index.ts", "/index.tsx"];

/** The first suffix that turns `base` into a file that exists. */
function firstExisting(basePath) {
  for (const suffix of CANDIDATE_SUFFIXES) {
    const candidate = `${basePath}${suffix}`;
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    const alreadyHasExtension = /\.[cm]?[jt]sx?$/.test(specifier);

    if (specifier.startsWith("@/")) {
      const basePath = resolve(srcRoot, specifier.slice(2));
      const file = alreadyHasExtension
        ? existsSync(basePath) && basePath
        : firstExisting(basePath);
      if (file) return nextResolve(pathToFileURL(file).href, context);
    }

    if (specifier.startsWith(".") && !alreadyHasExtension && context.parentURL) {
      const basePath = fileURLToPath(new URL(specifier, context.parentURL));
      const file = firstExisting(basePath);
      if (file) return nextResolve(pathToFileURL(file).href, context);
    }

    return nextResolve(specifier, context);
  },
});
