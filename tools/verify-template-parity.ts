import { TEMPLATES } from "../data/templates";
import { curatedTemplateDefinition } from "../lib/templates/adapters";
import { compareLegacyTemplateParity } from "../lib/templates/migrationParity";

const failures = TEMPLATES.flatMap((template) =>
  compareLegacyTemplateParity(template, curatedTemplateDefinition(template)).map((failure) => ({
    template: template.id,
    vector: failure.vector,
  }))
);

if (failures.length > 0) {
  console.error(JSON.stringify({ status: "failed", failures }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({ status: "passed", templates: TEMPLATES.length, parity_failures: 0 }, null, 2));
}
