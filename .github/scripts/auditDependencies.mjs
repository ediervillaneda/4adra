// npm audit (dependencias de producción, severidad alta o crítica) con excepciones puntuales y
// con fecha de revisión, declaradas en .github/audit-exceptions.json (ver docs/Security.md).
// Falla si aparece un aviso alto o crítico sin excepción, o si una excepción venció.
// Uso: node ../.github/scripts/auditDependencies.mjs   (desde backend/ o web/)
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const BLOCKING_SEVERITIES = new Set(['high', 'critical']);
const exceptions = JSON.parse(
  readFileSync(new URL('../audit-exceptions.json', import.meta.url), 'utf8'),
);
const today = new Date().toISOString().slice(0, 10);

let output;
try {
  output = execFileSync('npm', ['audit', '--omit=dev', '--json'], { encoding: 'utf8' });
} catch (error) {
  // npm audit sale con código distinto de 0 cuando encuentra avisos; el JSON viene en stdout.
  output = error.stdout;
}
const report = JSON.parse(output);

// Cada paquete vulnerable lista en `via` los avisos que lo afectan (objetos) o el paquete por el que
// los hereda (texto): basta con revisar los avisos.
const advisories = new Map();
for (const vulnerability of Object.values(report.vulnerabilities ?? {})) {
  for (const via of vulnerability.via) {
    if (typeof via === 'object') {
      advisories.set(via.url, via);
    }
  }
}

const problems = [];
for (const advisory of advisories.values()) {
  if (!BLOCKING_SEVERITIES.has(advisory.severity)) {
    continue;
  }
  const id = advisory.url.split('/').pop();
  const exception = exceptions.find((candidate) => candidate.id === id);
  if (exception === undefined) {
    problems.push(`${id} (${advisory.name}, ${advisory.severity}): ${advisory.title}`);
  } else if (exception.reviewBy < today) {
    problems.push(`${id}: la excepción venció el ${exception.reviewBy}; revísala o quítala.`);
  } else {
    console.log(`Excepción vigente hasta ${exception.reviewBy}: ${id} (${exception.package}).`);
  }
}

if (problems.length > 0) {
  console.error('Avisos de seguridad que bloquean:');
  for (const problem of problems) {
    console.error(`- ${problem}`);
  }
  process.exit(1);
}
console.log('npm audit: sin avisos altos o críticos fuera de las excepciones vigentes.');
