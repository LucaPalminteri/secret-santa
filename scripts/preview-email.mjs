import { readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import { fileURLToPath } from "node:url";
import path from "node:path";
import ts from "typescript";

// Render only the pure template: never import the SMTP transport or credentials.
const root = fileURLToPath(new URL("../", import.meta.url));
const filename = path.join(root, "src/server/assignment-email.ts");
const source = await readFile(filename, "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
});
const context = { exports: {}, require: createRequire(filename), URL };
runInNewContext(outputText, context, { filename });
const { html } = context.exports.assignmentEmail({
  santaName: "Sofía",
  recipientName: "Martín",
  listName: "Navidad en familia",
  giftAmount: 25000,
});
const images = JSON.parse(
  await readFile(path.join(root, "src/brand/email-images.json"), "utf8"),
);
const preview = html
  .replace("cid:secret-santa-bow", `data:image/png;base64,${images.bow}`)
  .replace("cid:secret-santa-mark", `data:image/png;base64,${images.mark}`)
  .replace("cid:secret-santa-welcome", `data:image/gif;base64,${images.welcome}`);
const output = path.resolve(
  process.argv[2] || "/tmp/secret-santa-email-preview.html",
);
await writeFile(output, preview);
console.log(`Email preview (fictional data, no email sent): ${output}`);
