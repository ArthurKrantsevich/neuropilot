// Перед сборкой: исходники каждого компонента → public/code/<id>/ (для просмотра на сайте) и public/code/<id>.zip
// (скачать одним архивом). Список «карточка → файл» берём из src/gallery/demos.tsx, чтобы код всегда совпадал с демо.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const SRC = path.join(ROOT, "src/gallery/components");
const OUT = path.join(ROOT, "public/code");
const demos = fs.readFileSync(path.join(ROOT, "src/gallery/demos.tsx"), "utf8");
const pairs = [...demos.matchAll(/\{ id: "([^"]+)".*?file: "([^"]+)"/g)].map((m) => [m[1], m[2]]);
const TEXT = /\.(tsx?|css|json|md)$/;

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
const index = {};
for (const [id, file] of pairs) {
  const from = path.join(SRC, file);
  const dir = path.join(OUT, id);
  fs.mkdirSync(dir, { recursive: true });
  const files = [];
  const walk = (p, rel) => {
    if (fs.statSync(p).isDirectory()) for (const f of fs.readdirSync(p).sort()) walk(path.join(p, f), path.join(rel, f));
    else {
      fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
      fs.copyFileSync(p, path.join(dir, rel));
      if (TEXT.test(rel)) files.push(rel);
    }
  };
  if (fs.statSync(from).isDirectory()) walk(from, "");
  else walk(from, path.basename(from));
  index[id] = files;
  execFileSync("zip", ["-qr", path.join(OUT, `${id}.zip`), "."], { cwd: dir });
}
fs.writeFileSync(path.join(OUT, "index.json"), JSON.stringify(index, null, 1));
console.log(`код: ${pairs.length} компонентов → public/code`);
