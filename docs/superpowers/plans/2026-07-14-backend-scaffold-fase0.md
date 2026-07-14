# Backend Scaffold (Fase 0) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold `backend/` (Node.js/TypeScript on Firebase Cloud Functions) with Clean Architecture layers, and implement `GET /me` end-to-end through all four layers as the first working use case, proving the architecture before more functionality is added.

**Architecture:** Clean Architecture (`domain -> application -> infrastructure/presentation`), one Cloud Function (`api`, Express app) exposing `GET /v1/me`. Firebase Admin SDK verifies ID tokens and reads/writes Firestore; the domain layer has zero Firebase/Express imports. A generic audit-trail Express middleware writes `auditLogs` for mutating requests (none exist yet, but the middleware is built and tested now per the Fase 0 checklist item).

**Tech Stack:** TypeScript 5 (`strict: true`), Node.js 24 (current Active LTS, confirmed against nodejs.org 2026-07-14), Express 4, firebase-admin, firebase-functions v2 (`onRequest`), Jest + ts-jest, ESLint 9 flat config + typescript-eslint, Prettier, Firebase Emulator Suite (Auth + Firestore) for integration tests, ajv + js-yaml for a contract test against `docs/api/openapi.yaml`.

**Scope note:** This plan only implements `backend/`. Web, Android, and Firebase deploy/CI-wiring steps from `docs/checklists/Fase0-FundacionTecnica.md` are out of scope — see that checklist for the remaining items, to be planned separately.

**Coverage note:** `docs/TestingGuide.md` sets minimums of Domain 100%, Application 95%, Infrastructure 80%, Presentation 70%. With only one use case, Infrastructure/Presentation numeric thresholds aren't meaningfully enforceable yet (a couple of untested branches would swing the percentage wildly) — this plan enforces Domain 100% and Application 95% via `jest.config.js` `coverageThreshold`, and every Infrastructure/Presentation file still gets real unit tests. Wire numeric thresholds for those two layers into `jest.config.js` in a later plan once there's enough surface area for the percentage to be meaningful.

---

## File Structure

```text
backend/
├── package.json
├── tsconfig.json                 # base config, used by typecheck + ts-jest (includes src + test)
├── tsconfig.build.json            # extends tsconfig.json, outDir dist, src only
├── eslint.config.js                # flat config
├── .prettierrc.json
├── .nvmrc
├── jest.config.js                  # unit tests (src/domain, src/application coverage gated)
├── jest.integration.config.js      # test/integration, requires Firebase Emulator
├── jest.contract.config.js         # test/contract, validates against docs/api/openapi.yaml
├── src/
│   ├── domain/
│   │   ├── errors/DomainError.ts
│   │   ├── user/UserId.ts
│   │   ├── user/Email.ts
│   │   ├── user/UserStatus.ts
│   │   ├── user/errors.ts                 # UserDisabledException
│   │   ├── user/User.ts
│   │   ├── user/UserRepository.ts
│   │   ├── auth/AuthenticatedActor.ts
│   │   ├── auth/AuthenticationProvider.ts
│   │   ├── auth/errors.ts                 # UnauthenticatedException
│   │   ├── audit/AuditLogEntry.ts
│   │   └── audit/AuditLogWriter.ts
│   ├── application/
│   │   └── user/
│   │       ├── defaultProfileSettings.ts
│   │       ├── GetCurrentUserProfileCommand.ts
│   │       ├── UserProfileView.ts
│   │       ├── toUserProfileView.ts
│   │       └── GetCurrentUserProfileUseCase.ts
│   ├── infrastructure/
│   │   ├── firestore/FirestoreUserRepository.ts
│   │   ├── firebase/FirebaseAuthenticationProvider.ts
│   │   └── audit/FirestoreAuditLogWriter.ts
│   ├── presentation/
│   │   ├── compositionRoot.ts
│   │   └── http/
│   │       ├── responseEnvelope.ts
│   │       ├── asyncHandler.ts
│   │       ├── createApp.ts
│   │       ├── middleware/
│   │       │   ├── requestId.ts
│   │       │   ├── authenticate.ts
│   │       │   ├── errorHandler.ts
│   │       │   └── auditTrail.ts
│   │       └── users/meController.ts
│   └── index.ts                    # Cloud Function entry point (`export const api`)
└── test/
    ├── unit/
    │   ├── domain/{user,auth}/*.test.ts
    │   ├── application/user/GetCurrentUserProfileUseCase.test.ts
    │   ├── infrastructure/{firestore,firebase,audit}/*.test.ts
    │   └── presentation/http/{middleware,}/*.test.ts
    ├── integration/
    │   └── firestoreUserRepository.integration.test.ts
    └── contract/
        └── me.contract.test.ts
```

---

### Task 1: Inicializar proyecto Node/TypeScript

**Files:**
- Create: `backend/package.json`
- Create: `backend/.nvmrc`
- Create: `backend/tsconfig.json`
- Create: `backend/tsconfig.build.json`
- Modify: `.gitignore:33` (raíz del repo, después de la línea `node_modules/` bajo `# Node`)

No hay comportamiento que probar en este paso (es configuración pura), así que no aplica TDD — solo creación y verificación por comando.

- [ ] **Step 1: Crear `backend/.nvmrc`**

```text
24
```

- [ ] **Step 2: Crear `backend/package.json`**

```json
{
  "name": "@4adra/backend",
  "version": "0.1.0",
  "private": true,
  "description": "Backend de 4adra: Cloud Functions sobre Clean Architecture + DDD Lite.",
  "main": "dist/index.js",
  "engines": {
    "node": "^24.0.0"
  },
  "scripts": {
    "format": "prettier --write \"src/**/*.ts\" \"test/**/*.ts\"",
    "format:check": "prettier --check \"src/**/*.ts\" \"test/**/*.ts\"",
    "lint": "eslint \"src/**/*.ts\" \"test/**/*.ts\"",
    "typecheck": "tsc --noEmit",
    "test": "jest",
    "test:integration": "jest --config jest.integration.config.js",
    "test:contract": "jest --config jest.contract.config.js",
    "build": "rimraf dist && tsc -p tsconfig.build.json"
  },
  "dependencies": {
    "express": "^4.21.1",
    "firebase-admin": "^12.7.0",
    "firebase-functions": "^6.1.0"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/jest": "^29.5.14",
    "@types/js-yaml": "^4.0.9",
    "@types/node": "^24.0.0",
    "@types/supertest": "^6.0.2",
    "ajv": "^8.17.1",
    "eslint": "^9.14.0",
    "eslint-config-prettier": "^9.1.0",
    "jest": "^29.7.0",
    "js-yaml": "^4.1.0",
    "prettier": "^3.3.3",
    "rimraf": "^6.0.1",
    "supertest": "^7.0.0",
    "ts-jest": "^29.2.5",
    "typescript": "^5.6.3",
    "typescript-eslint": "^8.13.0"
  }
}
```

- [ ] **Step 3: Crear `backend/tsconfig.json`** (base — usado por `typecheck` y por `ts-jest`, incluye `src` y `test`)

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "moduleResolution": "Node",
    "lib": ["ES2022"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "noEmit": true,
    "sourceMap": true
  },
  "include": ["src", "test"]
}
```

- [ ] **Step 4: Crear `backend/tsconfig.build.json`** (build real — solo `src`, sí emite)

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "noEmit": false,
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

- [ ] **Step 5: Agregar `coverage/` al `.gitignore` de la raíz**

En `.gitignore`, dentro de la sección `# Node` (después de `.env.local`):

```gitignore
coverage/
```

- [ ] **Step 6: Instalar dependencias**

Run: `cd backend && npm install`
Expected: se genera `backend/package-lock.json` sin errores.

- [ ] **Step 7: Commit**

```bash
git add backend/package.json backend/package-lock.json backend/.nvmrc backend/tsconfig.json backend/tsconfig.build.json .gitignore
git commit -m "feat(backend): inicializar proyecto Node.js/TypeScript"
```

---

### Task 2: Configurar ESLint + Prettier

**Files:**
- Create: `backend/eslint.config.js`
- Create: `backend/.prettierrc.json`
- Create: `backend/.prettierignore`

- [ ] **Step 1: Crear `backend/.prettierrc.json`**

```json
{
  "singleQuote": true,
  "semi": true,
  "trailingComma": "all",
  "printWidth": 100
}
```

- [ ] **Step 2: Crear `backend/.prettierignore`**

```text
dist/
coverage/
node_modules/
```

- [ ] **Step 3: Crear `backend/eslint.config.js`**

```js
const tseslint = require('typescript-eslint');
const eslintConfigPrettier = require('eslint-config-prettier');

module.exports = tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**'],
  },
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: __dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/explicit-function-return-type': 'error',
    },
  },
  eslintConfigPrettier,
);
```

- [ ] **Step 4: Verificar que corren sin encontrar archivos (todavía no hay `src/`)**

Run: `cd backend && npm run format:check`
Expected: Prettier reporta que no hay archivos que coincidan (o termina en 0 sin listar problemas) — no falla el comando.

Run: `cd backend && npm run lint`
Expected: ESLint termina en 0 (no hay archivos `.ts` todavía).

- [ ] **Step 5: Commit**

```bash
git add backend/eslint.config.js backend/.prettierrc.json backend/.prettierignore
git commit -m "feat(backend): configurar ESLint y Prettier"
```

---

### Task 3: Configurar Jest (unitario, integración, contrato)

**Files:**
- Create: `backend/jest.config.js`
- Create: `backend/jest.integration.config.js`
- Create: `backend/jest.contract.config.js`

- [ ] **Step 1: Crear `backend/jest.config.js`**

```js
/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/test/unit'],
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: ['src/domain/**/*.ts', 'src/application/**/*.ts'],
  coverageThreshold: {
    'src/domain/**/*.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
    'src/application/**/*.ts': { statements: 95, branches: 95, functions: 95, lines: 95 },
  },
};
```

- [ ] **Step 2: Crear `backend/jest.integration.config.js`**

```js
/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/test/integration'],
  testMatch: ['**/*.integration.test.ts'],
};
```

- [ ] **Step 3: Crear `backend/jest.contract.config.js`**

```js
/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/test/contract'],
  testMatch: ['**/*.contract.test.ts'],
};
```

- [ ] **Step 4: Verificar que Jest corre sin encontrar pruebas todavía**

Run: `cd backend && npm test`
Expected: `No tests found` (exit code de Jest para "sin pruebas" — no es un fallo del scaffolding, confirma que la config carga).

- [ ] **Step 5: Commit**

```bash
git add backend/jest.config.js backend/jest.integration.config.js backend/jest.contract.config.js
git commit -m "feat(backend): configurar Jest para unitarias, integración y contrato"
```

---

### Task 4: Value objects `UserId` y `Email`

**Files:**
- Create: `backend/src/domain/user/UserId.ts`
- Create: `backend/src/domain/user/Email.ts`
- Test: `backend/test/unit/domain/user/UserId.test.ts`
- Test: `backend/test/unit/domain/user/Email.test.ts`

- [ ] **Step 1: Escribir la prueba que falla para `UserId`**

`backend/test/unit/domain/user/UserId.test.ts`:

```ts
import { UserId } from '../../../../src/domain/user/UserId';

describe('UserId', () => {
  it('shouldCreateFromNonEmptyString', () => {
    const id = UserId.fromString('usr_ana');
    expect(id.toString()).toBe('usr_ana');
  });

  it('shouldTrimWhitespace', () => {
    const id = UserId.fromString('  usr_ana  ');
    expect(id.toString()).toBe('usr_ana');
  });

  it('shouldRejectEmptyString', () => {
    expect(() => UserId.fromString('   ')).toThrow('UserId no puede estar vacío.');
  });

  it('shouldConsiderEqualIdsAsEqual', () => {
    const a = UserId.fromString('usr_ana');
    const b = UserId.fromString('usr_ana');
    expect(a.equals(b)).toBe(true);
  });

  it('shouldConsiderDifferentIdsAsNotEqual', () => {
    const a = UserId.fromString('usr_ana');
    const b = UserId.fromString('usr_juan');
    expect(a.equals(b)).toBe(false);
  });
});
```

- [ ] **Step 2: Ejecutar y confirmar que falla**

Run: `cd backend && npx jest test/unit/domain/user/UserId.test.ts`
Expected: FAIL — `Cannot find module '../../../../src/domain/user/UserId'`.

- [ ] **Step 3: Implementar `UserId`**

`backend/src/domain/user/UserId.ts`:

```ts
export class UserId {
  private constructor(private readonly value: string) {}

  static fromString(value: string): UserId {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      throw new Error('UserId no puede estar vacío.');
    }
    return new UserId(trimmed);
  }

  toString(): string {
    return this.value;
  }

  equals(other: UserId): boolean {
    return this.value === other.value;
  }
}
```

- [ ] **Step 4: Ejecutar y confirmar que pasa**

Run: `cd backend && npx jest test/unit/domain/user/UserId.test.ts`
Expected: PASS (5 pruebas).

- [ ] **Step 5: Escribir la prueba que falla para `Email`**

`backend/test/unit/domain/user/Email.test.ts`:

```ts
import { Email } from '../../../../src/domain/user/Email';

describe('Email', () => {
  it('shouldCreateFromValidAddress', () => {
    const email = Email.fromString('ana@example.com');
    expect(email.toString()).toBe('ana@example.com');
  });

  it('shouldNormalizeToLowerCaseAndTrim', () => {
    const email = Email.fromString('  Ana@Example.COM  ');
    expect(email.toString()).toBe('ana@example.com');
  });

  it('shouldRejectAddressWithoutAtSign', () => {
    expect(() => Email.fromString('ana.example.com')).toThrow('Email inválido: ana.example.com');
  });

  it('shouldRejectAddressWithoutDomain', () => {
    expect(() => Email.fromString('ana@')).toThrow('Email inválido: ana@');
  });
});
```

- [ ] **Step 6: Ejecutar y confirmar que falla**

Run: `cd backend && npx jest test/unit/domain/user/Email.test.ts`
Expected: FAIL — módulo no encontrado.

- [ ] **Step 7: Implementar `Email`**

`backend/src/domain/user/Email.ts`:

```ts
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class Email {
  private constructor(private readonly value: string) {}

  static fromString(value: string): Email {
    const normalized = value.trim().toLowerCase();
    if (!EMAIL_PATTERN.test(normalized)) {
      throw new Error(`Email inválido: ${value.trim()}`);
    }
    return new Email(normalized);
  }

  toString(): string {
    return this.value;
  }
}
```

- [ ] **Step 8: Ejecutar y confirmar que pasa**

Run: `cd backend && npx jest test/unit/domain/user/Email.test.ts`
Expected: PASS (4 pruebas).

- [ ] **Step 9: Commit**

```bash
git add backend/src/domain/user/UserId.ts backend/src/domain/user/Email.ts backend/test/unit/domain/user/UserId.test.ts backend/test/unit/domain/user/Email.test.ts
git commit -m "feat(backend): agregar value objects UserId y Email"
```

---

### Task 5: `DomainError`, `UserDisabledException`, `UnauthenticatedException`

**Files:**
- Create: `backend/src/domain/errors/DomainError.ts`
- Create: `backend/src/domain/user/errors.ts`
- Create: `backend/src/domain/auth/errors.ts`
- Test: `backend/test/unit/domain/user/errors.test.ts`
- Test: `backend/test/unit/domain/auth/errors.test.ts`

- [ ] **Step 1: Escribir la prueba que falla para `UserDisabledException`**

`backend/test/unit/domain/user/errors.test.ts`:

```ts
import { UserDisabledException } from '../../../../src/domain/user/errors';
import { DomainError } from '../../../../src/domain/errors/DomainError';

describe('UserDisabledException', () => {
  it('shouldExposeUserDisabledCode', () => {
    const error = new UserDisabledException('usr_ana');
    expect(error.code).toBe('USER_DISABLED');
  });

  it('shouldIncludeUserIdInMessage', () => {
    const error = new UserDisabledException('usr_ana');
    expect(error.message).toContain('usr_ana');
  });

  it('shouldBeInstanceOfDomainError', () => {
    const error = new UserDisabledException('usr_ana');
    expect(error).toBeInstanceOf(DomainError);
  });
});
```

- [ ] **Step 2: Ejecutar y confirmar que falla**

Run: `cd backend && npx jest test/unit/domain/user/errors.test.ts`
Expected: FAIL — módulos no encontrados.

- [ ] **Step 3: Implementar `DomainError` y `UserDisabledException`**

`backend/src/domain/errors/DomainError.ts`:

```ts
export abstract class DomainError extends Error {
  abstract readonly code: string;

  protected constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}
```

`backend/src/domain/user/errors.ts`:

```ts
import { DomainError } from '../errors/DomainError';

export class UserDisabledException extends DomainError {
  readonly code = 'USER_DISABLED';

  constructor(userId: string) {
    super(`El usuario ${userId} está deshabilitado.`);
  }
}
```

- [ ] **Step 4: Ejecutar y confirmar que pasa**

Run: `cd backend && npx jest test/unit/domain/user/errors.test.ts`
Expected: PASS (3 pruebas).

- [ ] **Step 5: Escribir la prueba que falla para `UnauthenticatedException`**

`backend/test/unit/domain/auth/errors.test.ts`:

```ts
import { UnauthenticatedException } from '../../../../src/domain/auth/errors';
import { DomainError } from '../../../../src/domain/errors/DomainError';

describe('UnauthenticatedException', () => {
  it('shouldExposeUnauthenticatedCode', () => {
    const error = new UnauthenticatedException('token inválido.');
    expect(error.code).toBe('UNAUTHENTICATED');
  });

  it('shouldIncludeReasonInMessage', () => {
    const error = new UnauthenticatedException('token inválido.');
    expect(error.message).toContain('token inválido.');
  });

  it('shouldBeInstanceOfDomainError', () => {
    const error = new UnauthenticatedException('token inválido.');
    expect(error).toBeInstanceOf(DomainError);
  });
});
```

- [ ] **Step 6: Ejecutar y confirmar que falla**

Run: `cd backend && npx jest test/unit/domain/auth/errors.test.ts`
Expected: FAIL — módulo no encontrado.

- [ ] **Step 7: Implementar `UnauthenticatedException`**

`backend/src/domain/auth/errors.ts`:

```ts
import { DomainError } from '../errors/DomainError';

export class UnauthenticatedException extends DomainError {
  readonly code = 'UNAUTHENTICATED';

  constructor(reason: string) {
    super(`Solicitud no autenticada: ${reason}`);
  }
}
```

- [ ] **Step 8: Ejecutar y confirmar que pasa**

Run: `cd backend && npx jest test/unit/domain/auth/errors.test.ts`
Expected: PASS (3 pruebas).

- [ ] **Step 9: Commit**

```bash
git add backend/src/domain/errors/DomainError.ts backend/src/domain/user/errors.ts backend/src/domain/auth/errors.ts backend/test/unit/domain/user/errors.test.ts backend/test/unit/domain/auth/errors.test.ts
git commit -m "feat(backend): agregar DomainError base y excepciones USER_DISABLED/UNAUTHENTICATED"
```

---

### Task 6: `UserStatus` y entidad `User`

**Files:**
- Create: `backend/src/domain/user/UserStatus.ts`
- Create: `backend/src/domain/user/User.ts`
- Test: `backend/test/unit/domain/user/User.test.ts`

- [ ] **Step 1: Crear el tipo `UserStatus`** (no requiere prueba, es un alias de tipo)

`backend/src/domain/user/UserStatus.ts`:

```ts
export type UserStatus = 'ACTIVE' | 'DISABLED';
```

- [ ] **Step 2: Escribir la prueba que falla para `User`**

`backend/test/unit/domain/user/User.test.ts`:

```ts
import { User } from '../../../../src/domain/user/User';
import { UserId } from '../../../../src/domain/user/UserId';
import { Email } from '../../../../src/domain/user/Email';
import { UserDisabledException } from '../../../../src/domain/user/errors';

function validProps(overrides: Partial<Parameters<typeof User.create>[0]> = {}) {
  const timestamp = new Date('2026-07-13T12:00:00Z');
  return {
    id: UserId.fromString('usr_ana'),
    displayName: 'Ana Pérez',
    email: Email.fromString('ana@example.com'),
    photoUrl: null,
    preferredCurrency: 'USD',
    language: 'es',
    timeZone: 'UTC',
    status: 'ACTIVE' as const,
    createdAt: timestamp,
    updatedAt: timestamp,
    ...overrides,
  };
}

describe('User', () => {
  it('shouldCreateWithValidProps', () => {
    const user = User.create(validProps());
    expect(user.displayName).toBe('Ana Pérez');
    expect(user.email.toString()).toBe('ana@example.com');
    expect(user.status).toBe('ACTIVE');
  });

  it('shouldRejectEmptyDisplayName', () => {
    expect(() => User.create(validProps({ displayName: '   ' }))).toThrow(
      'displayName no puede estar vacío.',
    );
  });

  it('shouldNotThrowWhenActiveUserAssertsActive', () => {
    const user = User.create(validProps({ status: 'ACTIVE' }));
    expect(() => user.assertActive()).not.toThrow();
  });

  it('shouldThrowUserDisabledExceptionWhenDisabledUserAssertsActive', () => {
    const user = User.create(validProps({ status: 'DISABLED' }));
    expect(() => user.assertActive()).toThrow(UserDisabledException);
  });
});
```

- [ ] **Step 3: Ejecutar y confirmar que falla**

Run: `cd backend && npx jest test/unit/domain/user/User.test.ts`
Expected: FAIL — módulo no encontrado.

- [ ] **Step 4: Implementar `User`**

`backend/src/domain/user/User.ts`:

```ts
import { UserId } from './UserId';
import { Email } from './Email';
import { UserStatus } from './UserStatus';
import { UserDisabledException } from './errors';

export interface UserProps {
  id: UserId;
  displayName: string;
  email: Email;
  photoUrl: string | null;
  preferredCurrency: string;
  language: string;
  timeZone: string;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
}

export class User {
  private constructor(private readonly props: UserProps) {}

  static create(props: UserProps): User {
    if (props.displayName.trim().length === 0) {
      throw new Error('displayName no puede estar vacío.');
    }
    return new User(props);
  }

  get id(): UserId {
    return this.props.id;
  }

  get displayName(): string {
    return this.props.displayName;
  }

  get email(): Email {
    return this.props.email;
  }

  get photoUrl(): string | null {
    return this.props.photoUrl;
  }

  get preferredCurrency(): string {
    return this.props.preferredCurrency;
  }

  get language(): string {
    return this.props.language;
  }

  get timeZone(): string {
    return this.props.timeZone;
  }

  get status(): UserStatus {
    return this.props.status;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  assertActive(): void {
    if (this.props.status === 'DISABLED') {
      throw new UserDisabledException(this.props.id.toString());
    }
  }
}
```

- [ ] **Step 5: Ejecutar y confirmar que pasa**

Run: `cd backend && npx jest test/unit/domain/user/User.test.ts`
Expected: PASS (4 pruebas).

- [ ] **Step 6: Commit**

```bash
git add backend/src/domain/user/UserStatus.ts backend/src/domain/user/User.ts backend/test/unit/domain/user/User.test.ts
git commit -m "feat(backend): agregar entidad de dominio User"
```

---

### Task 7: Interfaces de dominio (`UserRepository`, `AuthenticationProvider`, `AuditLogWriter`)

**Files:**
- Create: `backend/src/domain/user/UserRepository.ts`
- Create: `backend/src/domain/auth/AuthenticatedActor.ts`
- Create: `backend/src/domain/auth/AuthenticationProvider.ts`
- Create: `backend/src/domain/audit/AuditLogEntry.ts`
- Create: `backend/src/domain/audit/AuditLogWriter.ts`

Son interfaces puras (sin lógica ejecutable) — no hay comportamiento que probar con Jest; la verificación es `tsc --noEmit`. Se usarán y probarán indirectamente en las tareas de application/infrastructure.

- [ ] **Step 1: Crear `UserRepository`**

`backend/src/domain/user/UserRepository.ts`:

```ts
import { User } from './User';
import { UserId } from './UserId';

export interface UserRepository {
  findById(id: UserId): Promise<User | null>;
  save(user: User): Promise<void>;
}
```

- [ ] **Step 2: Crear `AuthenticatedActor` y `AuthenticationProvider`**

`backend/src/domain/auth/AuthenticatedActor.ts`:

```ts
import { UserId } from '../user/UserId';
import { Email } from '../user/Email';

export interface AuthenticatedActor {
  readonly userId: UserId;
  readonly email: Email;
  readonly displayName: string | null;
  readonly photoUrl: string | null;
}
```

`backend/src/domain/auth/AuthenticationProvider.ts`:

```ts
import { AuthenticatedActor } from './AuthenticatedActor';

export interface AuthenticationProvider {
  verifyIdToken(idToken: string): Promise<AuthenticatedActor>;
}
```

- [ ] **Step 3: Crear `AuditLogEntry` y `AuditLogWriter`**

`backend/src/domain/audit/AuditLogEntry.ts`:

```ts
export interface AuditLogEntry {
  readonly actorId: string;
  readonly entity: string;
  readonly entityId: string;
  readonly operation: string;
  readonly requestId: string;
  readonly occurredAt: Date;
}
```

`backend/src/domain/audit/AuditLogWriter.ts`:

```ts
import { AuditLogEntry } from './AuditLogEntry';

export interface AuditLogWriter {
  write(entry: AuditLogEntry): Promise<void>;
}
```

- [ ] **Step 4: Verificar tipos**

Run: `cd backend && npm run typecheck`
Expected: sin errores.

- [ ] **Step 5: Commit**

```bash
git add backend/src/domain/user/UserRepository.ts backend/src/domain/auth/AuthenticatedActor.ts backend/src/domain/auth/AuthenticationProvider.ts backend/src/domain/audit/AuditLogEntry.ts backend/src/domain/audit/AuditLogWriter.ts
git commit -m "feat(backend): agregar interfaces de dominio UserRepository, AuthenticationProvider y AuditLogWriter"
```

---

### Task 8: Caso de uso `GetCurrentUserProfileUseCase`

**Files:**
- Create: `backend/src/application/user/defaultProfileSettings.ts`
- Create: `backend/src/application/user/GetCurrentUserProfileCommand.ts`
- Create: `backend/src/application/user/UserProfileView.ts`
- Create: `backend/src/application/user/toUserProfileView.ts`
- Create: `backend/src/application/user/GetCurrentUserProfileUseCase.ts`
- Test: `backend/test/unit/application/user/GetCurrentUserProfileUseCase.test.ts`
- Test: `backend/test/unit/application/user/toUserProfileView.test.ts`

Este caso de uso implementa la regla de `docs/api/Auth.md`: "Si el documento de perfil aún no existe, el backend lo crea de forma idempotente a partir de las claims mínimas y aplica valores por defecto aprobados." Los valores por defecto concretos (`preferredCurrency: 'USD'`, `language: 'es'`, `timeZone: 'UTC'`) son una decisión de este plan — no había un valor fijado en la documentación existente; ajustarlos es un cambio de una constante, no de arquitectura.

- [ ] **Step 1: Escribir la prueba que falla para `toUserProfileView`**

`backend/test/unit/application/user/toUserProfileView.test.ts`:

```ts
import { toUserProfileView } from '../../../../src/application/user/toUserProfileView';
import { User } from '../../../../src/domain/user/User';
import { UserId } from '../../../../src/domain/user/UserId';
import { Email } from '../../../../src/domain/user/Email';

describe('toUserProfileView', () => {
  it('shouldMapUserEntityToPlainView', () => {
    const timestamp = new Date('2026-07-13T12:00:00Z');
    const user = User.create({
      id: UserId.fromString('usr_ana'),
      displayName: 'Ana Pérez',
      email: Email.fromString('ana@example.com'),
      photoUrl: null,
      preferredCurrency: 'USD',
      language: 'es',
      timeZone: 'UTC',
      status: 'ACTIVE',
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    expect(toUserProfileView(user)).toEqual({
      id: 'usr_ana',
      displayName: 'Ana Pérez',
      email: 'ana@example.com',
      photoUrl: null,
      preferredCurrency: 'USD',
      language: 'es',
      timeZone: 'UTC',
      status: 'ACTIVE',
      createdAt: '2026-07-13T12:00:00.000Z',
      updatedAt: '2026-07-13T12:00:00.000Z',
    });
  });
});
```

- [ ] **Step 2: Ejecutar y confirmar que falla**

Run: `cd backend && npx jest test/unit/application/user/toUserProfileView.test.ts`
Expected: FAIL — módulo no encontrado.

- [ ] **Step 3: Implementar `UserProfileView` y `toUserProfileView`**

`backend/src/application/user/UserProfileView.ts`:

```ts
export interface UserProfileView {
  id: string;
  displayName: string;
  email: string;
  photoUrl: string | null;
  preferredCurrency: string;
  language: string;
  timeZone: string;
  status: 'ACTIVE' | 'DISABLED';
  createdAt: string;
  updatedAt: string;
}
```

`backend/src/application/user/toUserProfileView.ts`:

```ts
import { User } from '../../domain/user/User';
import { UserProfileView } from './UserProfileView';

export function toUserProfileView(user: User): UserProfileView {
  return {
    id: user.id.toString(),
    displayName: user.displayName,
    email: user.email.toString(),
    photoUrl: user.photoUrl,
    preferredCurrency: user.preferredCurrency,
    language: user.language,
    timeZone: user.timeZone,
    status: user.status,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}
```

- [ ] **Step 4: Ejecutar y confirmar que pasa**

Run: `cd backend && npx jest test/unit/application/user/toUserProfileView.test.ts`
Expected: PASS (1 prueba).

- [ ] **Step 5: Escribir la prueba que falla para `GetCurrentUserProfileUseCase`**

`backend/test/unit/application/user/GetCurrentUserProfileUseCase.test.ts`:

```ts
import { GetCurrentUserProfileUseCase } from '../../../../src/application/user/GetCurrentUserProfileUseCase';
import { UserRepository } from '../../../../src/domain/user/UserRepository';
import { User } from '../../../../src/domain/user/User';
import { UserId } from '../../../../src/domain/user/UserId';
import { Email } from '../../../../src/domain/user/Email';
import { UserDisabledException } from '../../../../src/domain/user/errors';
import { AuthenticatedActor } from '../../../../src/domain/auth/AuthenticatedActor';

class InMemoryUserRepository implements UserRepository {
  private readonly usersById = new Map<string, User>();

  seed(user: User): void {
    this.usersById.set(user.id.toString(), user);
  }

  async findById(id: UserId): Promise<User | null> {
    return this.usersById.get(id.toString()) ?? null;
  }

  async save(user: User): Promise<void> {
    this.usersById.set(user.id.toString(), user);
  }
}

function anActor(overrides: Partial<AuthenticatedActor> = {}): AuthenticatedActor {
  return {
    userId: UserId.fromString('usr_ana'),
    email: Email.fromString('ana@example.com'),
    displayName: 'Ana Pérez',
    photoUrl: null,
    ...overrides,
  };
}

describe('GetCurrentUserProfileUseCase', () => {
  it('shouldReturnExistingActiveProfileWithoutCreatingANewOne', async () => {
    const repository = new InMemoryUserRepository();
    const timestamp = new Date('2026-01-01T00:00:00Z');
    const existing = User.create({
      id: UserId.fromString('usr_ana'),
      displayName: 'Ana Existente',
      email: Email.fromString('ana@example.com'),
      photoUrl: null,
      preferredCurrency: 'COP',
      language: 'es',
      timeZone: 'America/Bogota',
      status: 'ACTIVE',
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    repository.seed(existing);
    const saveSpy = jest.spyOn(repository, 'save');
    const useCase = new GetCurrentUserProfileUseCase(repository, () => new Date('2026-07-13T00:00:00Z'));

    const result = await useCase.execute({ actor: anActor() });

    expect(result.displayName).toBe('Ana Existente');
    expect(result.preferredCurrency).toBe('COP');
    expect(saveSpy).not.toHaveBeenCalled();
  });

  it('shouldCreateProfileWithDefaultsWhenNoneExists', async () => {
    const repository = new InMemoryUserRepository();
    const now = new Date('2026-07-13T12:00:00Z');
    const useCase = new GetCurrentUserProfileUseCase(repository, () => now);

    const result = await useCase.execute({ actor: anActor() });

    expect(result).toEqual({
      id: 'usr_ana',
      displayName: 'Ana Pérez',
      email: 'ana@example.com',
      photoUrl: null,
      preferredCurrency: 'USD',
      language: 'es',
      timeZone: 'UTC',
      status: 'ACTIVE',
      createdAt: '2026-07-13T12:00:00.000Z',
      updatedAt: '2026-07-13T12:00:00.000Z',
    });
    const persisted = await repository.findById(UserId.fromString('usr_ana'));
    expect(persisted).not.toBeNull();
  });

  it('shouldFallBackToEmailAsDisplayNameWhenActorHasNone', async () => {
    const repository = new InMemoryUserRepository();
    const useCase = new GetCurrentUserProfileUseCase(repository, () => new Date('2026-07-13T00:00:00Z'));

    const result = await useCase.execute({ actor: anActor({ displayName: null }) });

    expect(result.displayName).toBe('ana@example.com');
  });

  it('shouldRejectWhenExistingUserIsDisabled', async () => {
    const repository = new InMemoryUserRepository();
    const timestamp = new Date('2026-01-01T00:00:00Z');
    const disabled = User.create({
      id: UserId.fromString('usr_ana'),
      displayName: 'Ana Pérez',
      email: Email.fromString('ana@example.com'),
      photoUrl: null,
      preferredCurrency: 'USD',
      language: 'es',
      timeZone: 'UTC',
      status: 'DISABLED',
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    repository.seed(disabled);
    const useCase = new GetCurrentUserProfileUseCase(repository, () => new Date());

    await expect(useCase.execute({ actor: anActor() })).rejects.toThrow(UserDisabledException);
  });
});
```

- [ ] **Step 6: Ejecutar y confirmar que falla**

Run: `cd backend && npx jest test/unit/application/user/GetCurrentUserProfileUseCase.test.ts`
Expected: FAIL — módulo no encontrado.

- [ ] **Step 7: Implementar valores por defecto, comando y caso de uso**

`backend/src/application/user/defaultProfileSettings.ts`:

```ts
export const DEFAULT_PROFILE_SETTINGS = {
  preferredCurrency: 'USD',
  language: 'es',
  timeZone: 'UTC',
} as const;
```

`backend/src/application/user/GetCurrentUserProfileCommand.ts`:

```ts
import { AuthenticatedActor } from '../../domain/auth/AuthenticatedActor';

export interface GetCurrentUserProfileCommand {
  actor: AuthenticatedActor;
}
```

`backend/src/application/user/GetCurrentUserProfileUseCase.ts`:

```ts
import { UserRepository } from '../../domain/user/UserRepository';
import { User } from '../../domain/user/User';
import { GetCurrentUserProfileCommand } from './GetCurrentUserProfileCommand';
import { UserProfileView } from './UserProfileView';
import { toUserProfileView } from './toUserProfileView';
import { DEFAULT_PROFILE_SETTINGS } from './defaultProfileSettings';

export class GetCurrentUserProfileUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly now: () => Date,
  ) {}

  async execute(command: GetCurrentUserProfileCommand): Promise<UserProfileView> {
    const { actor } = command;
    const existing = await this.userRepository.findById(actor.userId);

    if (existing !== null) {
      existing.assertActive();
      return toUserProfileView(existing);
    }

    const timestamp = this.now();
    const created = User.create({
      id: actor.userId,
      displayName: actor.displayName ?? actor.email.toString(),
      email: actor.email,
      photoUrl: actor.photoUrl,
      preferredCurrency: DEFAULT_PROFILE_SETTINGS.preferredCurrency,
      language: DEFAULT_PROFILE_SETTINGS.language,
      timeZone: DEFAULT_PROFILE_SETTINGS.timeZone,
      status: 'ACTIVE',
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    await this.userRepository.save(created);
    return toUserProfileView(created);
  }
}
```

- [ ] **Step 8: Ejecutar y confirmar que pasa**

Run: `cd backend && npx jest test/unit/application/user/GetCurrentUserProfileUseCase.test.ts`
Expected: PASS (4 pruebas).

- [ ] **Step 9: Ejecutar cobertura de application/domain**

Run: `cd backend && npm test -- --coverage`
Expected: PASS, cobertura de `src/domain` y `src/application` en 100 %/95 % o más (todas las líneas escritas hasta ahora están cubiertas por las pruebas de las tareas 4-8).

- [ ] **Step 10: Commit**

```bash
git add backend/src/application backend/test/unit/application
git commit -m "feat(backend): implementar GetCurrentUserProfileUseCase"
```

---

### Task 9: `FirestoreUserRepository`

**Files:**
- Create: `backend/src/infrastructure/firestore/FirestoreUserRepository.ts`
- Test: `backend/test/unit/infrastructure/firestore/FirestoreUserRepository.test.ts`

La clase se prueba de dos formas: aquí, con Firestore mockeado (mapeo puro `toFirestoreDocument`/`fromFirestoreDocument` y las dos llamadas a la SDK); contra el emulador real en la Tarea 19.

- [ ] **Step 1: Escribir la prueba que falla**

`backend/test/unit/infrastructure/firestore/FirestoreUserRepository.test.ts`:

```ts
import { Timestamp } from 'firebase-admin/firestore';
import {
  FirestoreUserRepository,
  toFirestoreDocument,
  fromFirestoreDocument,
} from '../../../../src/infrastructure/firestore/FirestoreUserRepository';
import { User } from '../../../../src/domain/user/User';
import { UserId } from '../../../../src/domain/user/UserId';
import { Email } from '../../../../src/domain/user/Email';

function aUser(): User {
  const timestamp = new Date('2026-07-13T12:00:00Z');
  return User.create({
    id: UserId.fromString('usr_ana'),
    displayName: 'Ana Pérez',
    email: Email.fromString('ana@example.com'),
    photoUrl: null,
    preferredCurrency: 'USD',
    language: 'es',
    timeZone: 'UTC',
    status: 'ACTIVE',
    createdAt: timestamp,
    updatedAt: timestamp,
  });
}

describe('toFirestoreDocument / fromFirestoreDocument', () => {
  it('shouldRoundTripAUserThroughFirestoreDocumentShape', () => {
    const user = aUser();
    const document = toFirestoreDocument(user);
    const restored = fromFirestoreDocument('usr_ana', document);

    expect(restored.id.toString()).toBe('usr_ana');
    expect(restored.displayName).toBe('Ana Pérez');
    expect(restored.email.toString()).toBe('ana@example.com');
    expect(restored.status).toBe('ACTIVE');
    expect(restored.createdAt.toISOString()).toBe('2026-07-13T12:00:00.000Z');
  });
});

describe('FirestoreUserRepository', () => {
  function firestoreStub() {
    const doc = { get: jest.fn(), set: jest.fn() };
    const collection = jest.fn().mockReturnValue({ doc: jest.fn().mockReturnValue(doc) });
    return { firestore: { collection } as never, doc };
  }

  it('shouldReturnNullWhenDocumentDoesNotExist', async () => {
    const { firestore, doc } = firestoreStub();
    doc.get.mockResolvedValue({ exists: false });
    const repository = new FirestoreUserRepository(firestore);

    const result = await repository.findById(UserId.fromString('usr_ana'));

    expect(result).toBeNull();
  });

  it('shouldMapExistingDocumentToUser', async () => {
    const { firestore, doc } = firestoreStub();
    const timestamp = Timestamp.fromDate(new Date('2026-07-13T12:00:00Z'));
    doc.get.mockResolvedValue({
      exists: true,
      id: 'usr_ana',
      data: () => ({
        displayName: 'Ana Pérez',
        email: 'ana@example.com',
        photoUrl: null,
        preferredCurrency: 'USD',
        language: 'es',
        timeZone: 'UTC',
        status: 'ACTIVE',
        createdAt: timestamp,
        updatedAt: timestamp,
      }),
    });
    const repository = new FirestoreUserRepository(firestore);

    const result = await repository.findById(UserId.fromString('usr_ana'));

    expect(result?.displayName).toBe('Ana Pérez');
  });

  it('shouldWriteDocumentOnSave', async () => {
    const { firestore, doc } = firestoreStub();
    doc.set.mockResolvedValue(undefined);
    const repository = new FirestoreUserRepository(firestore);

    await repository.save(aUser());

    expect(doc.set).toHaveBeenCalledTimes(1);
    expect(doc.set).toHaveBeenCalledWith(expect.objectContaining({ displayName: 'Ana Pérez' }));
  });
});
```

- [ ] **Step 2: Ejecutar y confirmar que falla**

Run: `cd backend && npx jest test/unit/infrastructure/firestore/FirestoreUserRepository.test.ts`
Expected: FAIL — módulo no encontrado.

- [ ] **Step 3: Implementar `FirestoreUserRepository`**

`backend/src/infrastructure/firestore/FirestoreUserRepository.ts`:

```ts
import { Firestore, Timestamp } from 'firebase-admin/firestore';
import { UserRepository } from '../../domain/user/UserRepository';
import { User } from '../../domain/user/User';
import { UserId } from '../../domain/user/UserId';
import { Email } from '../../domain/user/Email';
import { UserStatus } from '../../domain/user/UserStatus';

export interface UserDocument {
  displayName: string;
  email: string;
  photoUrl: string | null;
  preferredCurrency: string;
  language: string;
  timeZone: string;
  status: UserStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export function toFirestoreDocument(user: User): UserDocument {
  return {
    displayName: user.displayName,
    email: user.email.toString(),
    photoUrl: user.photoUrl,
    preferredCurrency: user.preferredCurrency,
    language: user.language,
    timeZone: user.timeZone,
    status: user.status,
    createdAt: Timestamp.fromDate(user.createdAt),
    updatedAt: Timestamp.fromDate(user.updatedAt),
  };
}

export function fromFirestoreDocument(id: string, data: UserDocument): User {
  return User.create({
    id: UserId.fromString(id),
    displayName: data.displayName,
    email: Email.fromString(data.email),
    photoUrl: data.photoUrl,
    preferredCurrency: data.preferredCurrency,
    language: data.language,
    timeZone: data.timeZone,
    status: data.status,
    createdAt: data.createdAt.toDate(),
    updatedAt: data.updatedAt.toDate(),
  });
}

const COLLECTION = 'users';

export class FirestoreUserRepository implements UserRepository {
  constructor(private readonly firestore: Firestore) {}

  async findById(id: UserId): Promise<User | null> {
    const snapshot = await this.firestore.collection(COLLECTION).doc(id.toString()).get();
    if (!snapshot.exists) {
      return null;
    }
    return fromFirestoreDocument(snapshot.id, snapshot.data() as UserDocument);
  }

  async save(user: User): Promise<void> {
    await this.firestore
      .collection(COLLECTION)
      .doc(user.id.toString())
      .set(toFirestoreDocument(user));
  }
}
```

- [ ] **Step 4: Ejecutar y confirmar que pasa**

Run: `cd backend && npx jest test/unit/infrastructure/firestore/FirestoreUserRepository.test.ts`
Expected: PASS (4 pruebas).

- [ ] **Step 5: Commit**

```bash
git add backend/src/infrastructure/firestore/FirestoreUserRepository.ts backend/test/unit/infrastructure/firestore/FirestoreUserRepository.test.ts
git commit -m "feat(backend): implementar FirestoreUserRepository"
```

---

### Task 10: `FirebaseAuthenticationProvider`

**Files:**
- Create: `backend/src/infrastructure/firebase/FirebaseAuthenticationProvider.ts`
- Test: `backend/test/unit/infrastructure/firebase/FirebaseAuthenticationProvider.test.ts`

- [ ] **Step 1: Escribir la prueba que falla**

`backend/test/unit/infrastructure/firebase/FirebaseAuthenticationProvider.test.ts`:

```ts
import { FirebaseAuthenticationProvider } from '../../../../src/infrastructure/firebase/FirebaseAuthenticationProvider';
import { UnauthenticatedException } from '../../../../src/domain/auth/errors';

function authStub(verifyIdToken: jest.Mock) {
  return { verifyIdToken } as never;
}

describe('FirebaseAuthenticationProvider', () => {
  it('shouldReturnActorFromValidToken', async () => {
    const verifyIdToken = jest.fn().mockResolvedValue({
      uid: 'usr_ana',
      email: 'Ana@Example.com',
      name: 'Ana Pérez',
      picture: 'https://example.com/ana.png',
    });
    const provider = new FirebaseAuthenticationProvider(authStub(verifyIdToken));

    const actor = await provider.verifyIdToken('a-valid-token');

    expect(actor.userId.toString()).toBe('usr_ana');
    expect(actor.email.toString()).toBe('ana@example.com');
    expect(actor.displayName).toBe('Ana Pérez');
    expect(actor.photoUrl).toBe('https://example.com/ana.png');
  });

  it('shouldDefaultDisplayNameAndPhotoToNullWhenAbsent', async () => {
    const verifyIdToken = jest.fn().mockResolvedValue({ uid: 'usr_ana', email: 'ana@example.com' });
    const provider = new FirebaseAuthenticationProvider(authStub(verifyIdToken));

    const actor = await provider.verifyIdToken('a-valid-token');

    expect(actor.displayName).toBeNull();
    expect(actor.photoUrl).toBeNull();
  });

  it('shouldThrowUnauthenticatedWhenTokenVerificationFails', async () => {
    const verifyIdToken = jest.fn().mockRejectedValue(new Error('expired'));
    const provider = new FirebaseAuthenticationProvider(authStub(verifyIdToken));

    await expect(provider.verifyIdToken('expired-token')).rejects.toThrow(UnauthenticatedException);
  });

  it('shouldThrowUnauthenticatedWhenTokenHasNoEmail', async () => {
    const verifyIdToken = jest.fn().mockResolvedValue({ uid: 'usr_ana' });
    const provider = new FirebaseAuthenticationProvider(authStub(verifyIdToken));

    await expect(provider.verifyIdToken('no-email-token')).rejects.toThrow(UnauthenticatedException);
  });
});
```

- [ ] **Step 2: Ejecutar y confirmar que falla**

Run: `cd backend && npx jest test/unit/infrastructure/firebase/FirebaseAuthenticationProvider.test.ts`
Expected: FAIL — módulo no encontrado.

- [ ] **Step 3: Implementar `FirebaseAuthenticationProvider`**

`backend/src/infrastructure/firebase/FirebaseAuthenticationProvider.ts`:

```ts
import { Auth } from 'firebase-admin/auth';
import { AuthenticationProvider } from '../../domain/auth/AuthenticationProvider';
import { AuthenticatedActor } from '../../domain/auth/AuthenticatedActor';
import { UnauthenticatedException } from '../../domain/auth/errors';
import { UserId } from '../../domain/user/UserId';
import { Email } from '../../domain/user/Email';

export class FirebaseAuthenticationProvider implements AuthenticationProvider {
  constructor(private readonly auth: Auth) {}

  async verifyIdToken(idToken: string): Promise<AuthenticatedActor> {
    let decoded;
    try {
      decoded = await this.auth.verifyIdToken(idToken);
    } catch {
      throw new UnauthenticatedException('token inválido o expirado.');
    }

    if (!decoded.email) {
      throw new UnauthenticatedException('el token no contiene un correo verificado.');
    }

    return {
      userId: UserId.fromString(decoded.uid),
      email: Email.fromString(decoded.email),
      displayName: typeof decoded.name === 'string' ? decoded.name : null,
      photoUrl: typeof decoded.picture === 'string' ? decoded.picture : null,
    };
  }
}
```

- [ ] **Step 4: Ejecutar y confirmar que pasa**

Run: `cd backend && npx jest test/unit/infrastructure/firebase/FirebaseAuthenticationProvider.test.ts`
Expected: PASS (4 pruebas).

- [ ] **Step 5: Commit**

```bash
git add backend/src/infrastructure/firebase/FirebaseAuthenticationProvider.ts backend/test/unit/infrastructure/firebase/FirebaseAuthenticationProvider.test.ts
git commit -m "feat(backend): implementar FirebaseAuthenticationProvider"
```

---

### Task 11: `FirestoreAuditLogWriter`

**Files:**
- Create: `backend/src/infrastructure/audit/FirestoreAuditLogWriter.ts`
- Test: `backend/test/unit/infrastructure/audit/FirestoreAuditLogWriter.test.ts`

- [ ] **Step 1: Escribir la prueba que falla**

`backend/test/unit/infrastructure/audit/FirestoreAuditLogWriter.test.ts`:

```ts
import { FirestoreAuditLogWriter } from '../../../../src/infrastructure/audit/FirestoreAuditLogWriter';

describe('FirestoreAuditLogWriter', () => {
  it('shouldAddADocumentToTheAuditLogsCollection', async () => {
    const add = jest.fn().mockResolvedValue({ id: 'log_1' });
    const collection = jest.fn().mockReturnValue({ add });
    const firestore = { collection } as never;
    const writer = new FirestoreAuditLogWriter(firestore);
    const entry = {
      actorId: 'usr_ana',
      entity: '/v1/groups',
      entityId: '/v1/groups',
      operation: 'POST',
      requestId: 'req_123',
      occurredAt: new Date('2026-07-13T12:00:00Z'),
    };

    await writer.write(entry);

    expect(collection).toHaveBeenCalledWith('auditLogs');
    expect(add).toHaveBeenCalledWith(expect.objectContaining({ actorId: 'usr_ana', operation: 'POST' }));
  });
});
```

- [ ] **Step 2: Ejecutar y confirmar que falla**

Run: `cd backend && npx jest test/unit/infrastructure/audit/FirestoreAuditLogWriter.test.ts`
Expected: FAIL — módulo no encontrado.

- [ ] **Step 3: Implementar `FirestoreAuditLogWriter`**

`backend/src/infrastructure/audit/FirestoreAuditLogWriter.ts`:

```ts
import { Firestore, FieldValue } from 'firebase-admin/firestore';
import { AuditLogWriter } from '../../domain/audit/AuditLogWriter';
import { AuditLogEntry } from '../../domain/audit/AuditLogEntry';

const COLLECTION = 'auditLogs';

export class FirestoreAuditLogWriter implements AuditLogWriter {
  constructor(private readonly firestore: Firestore) {}

  async write(entry: AuditLogEntry): Promise<void> {
    await this.firestore.collection(COLLECTION).add({
      actorId: entry.actorId,
      entity: entry.entity,
      entityId: entry.entityId,
      operation: entry.operation,
      requestId: entry.requestId,
      occurredAt: entry.occurredAt,
      createdAt: FieldValue.serverTimestamp(),
    });
  }
}
```

- [ ] **Step 4: Ejecutar y confirmar que pasa**

Run: `cd backend && npx jest test/unit/infrastructure/audit/FirestoreAuditLogWriter.test.ts`
Expected: PASS (1 prueba).

- [ ] **Step 5: Commit**

```bash
git add backend/src/infrastructure/audit/FirestoreAuditLogWriter.ts backend/test/unit/infrastructure/audit/FirestoreAuditLogWriter.test.ts
git commit -m "feat(backend): implementar FirestoreAuditLogWriter"
```

---

### Task 12: Envoltorio de respuesta HTTP (`responseEnvelope`)

**Files:**
- Create: `backend/src/presentation/http/responseEnvelope.ts`
- Test: `backend/test/unit/presentation/http/responseEnvelope.test.ts`

Implementa el formato de `docs/ApiSpecification.md`: `{ data, meta: { requestId } }` en éxito, `{ error: { code, message, details? }, meta: { requestId } }` en error.

- [ ] **Step 1: Escribir la prueba que falla**

`backend/test/unit/presentation/http/responseEnvelope.test.ts`:

```ts
import { successEnvelope, errorEnvelope } from '../../../../src/presentation/http/responseEnvelope';

describe('responseEnvelope', () => {
  it('shouldWrapDataWithRequestIdInMeta', () => {
    expect(successEnvelope({ id: 'usr_ana' }, 'req_123')).toEqual({
      data: { id: 'usr_ana' },
      meta: { requestId: 'req_123' },
    });
  });

  it('shouldBuildErrorEnvelopeWithoutDetailsWhenNoneProvided', () => {
    expect(errorEnvelope('UNAUTHENTICATED', 'Falta token.', 'req_123')).toEqual({
      error: { code: 'UNAUTHENTICATED', message: 'Falta token.' },
      meta: { requestId: 'req_123' },
    });
  });

  it('shouldBuildErrorEnvelopeWithDetailsWhenProvided', () => {
    const details = [{ field: 'splits', reason: 'TOTAL_MISMATCH' }];
    expect(errorEnvelope('INVALID_SPLIT', 'No totaliza.', 'req_123', details)).toEqual({
      error: { code: 'INVALID_SPLIT', message: 'No totaliza.', details },
      meta: { requestId: 'req_123' },
    });
  });
});
```

- [ ] **Step 2: Ejecutar y confirmar que falla**

Run: `cd backend && npx jest test/unit/presentation/http/responseEnvelope.test.ts`
Expected: FAIL — módulo no encontrado.

- [ ] **Step 3: Implementar `responseEnvelope`**

`backend/src/presentation/http/responseEnvelope.ts`:

```ts
export interface SuccessEnvelope<T> {
  data: T;
  meta: { requestId: string };
}

export interface ErrorDetail {
  field?: string;
  reason?: string;
}

export interface ErrorEnvelope {
  error: {
    code: string;
    message: string;
    details?: ErrorDetail[];
  };
  meta: { requestId: string };
}

export function successEnvelope<T>(data: T, requestId: string): SuccessEnvelope<T> {
  return { data, meta: { requestId } };
}

export function errorEnvelope(
  code: string,
  message: string,
  requestId: string,
  details?: ErrorDetail[],
): ErrorEnvelope {
  return { error: { code, message, ...(details ? { details } : {}) }, meta: { requestId } };
}
```

- [ ] **Step 4: Ejecutar y confirmar que pasa**

Run: `cd backend && npx jest test/unit/presentation/http/responseEnvelope.test.ts`
Expected: PASS (3 pruebas).

- [ ] **Step 5: Commit**

```bash
git add backend/src/presentation/http/responseEnvelope.ts backend/test/unit/presentation/http/responseEnvelope.test.ts
git commit -m "feat(backend): implementar responseEnvelope"
```

---

### Task 13: Middleware `requestId`

**Files:**
- Create: `backend/src/presentation/http/middleware/requestId.ts`
- Test: `backend/test/unit/presentation/http/middleware/requestId.test.ts`

- [ ] **Step 1: Escribir la prueba que falla**

`backend/test/unit/presentation/http/middleware/requestId.test.ts`:

```ts
import { Request, Response } from 'express';
import { requestIdMiddleware, RequestWithId } from '../../../../../src/presentation/http/middleware/requestId';

describe('requestIdMiddleware', () => {
  it('shouldAssignAUuidRequestIdAndCallNext', () => {
    const req = {} as Request;
    const res = {} as Response;
    const next = jest.fn();

    requestIdMiddleware(req, res, next);

    const requestId = (req as RequestWithId).requestId;
    expect(requestId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('shouldAssignADifferentRequestIdOnEachCall', () => {
    const req1 = {} as Request;
    const req2 = {} as Request;
    const res = {} as Response;
    const next = jest.fn();

    requestIdMiddleware(req1, res, next);
    requestIdMiddleware(req2, res, next);

    expect((req1 as RequestWithId).requestId).not.toBe((req2 as RequestWithId).requestId);
  });
});
```

- [ ] **Step 2: Ejecutar y confirmar que falla**

Run: `cd backend && npx jest test/unit/presentation/http/middleware/requestId.test.ts`
Expected: FAIL — módulo no encontrado.

- [ ] **Step 3: Implementar `requestIdMiddleware`**

`backend/src/presentation/http/middleware/requestId.ts`:

```ts
import { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';

export interface RequestWithId extends Request {
  requestId: string;
}

export function requestIdMiddleware(req: Request, _res: Response, next: NextFunction): void {
  (req as RequestWithId).requestId = randomUUID();
  next();
}
```

- [ ] **Step 4: Ejecutar y confirmar que pasa**

Run: `cd backend && npx jest test/unit/presentation/http/middleware/requestId.test.ts`
Expected: PASS (2 pruebas).

- [ ] **Step 5: Commit**

```bash
git add backend/src/presentation/http/middleware/requestId.ts backend/test/unit/presentation/http/middleware/requestId.test.ts
git commit -m "feat(backend): implementar requestIdMiddleware"
```

---

### Task 14: Middleware `authenticate`

**Files:**
- Create: `backend/src/presentation/http/middleware/authenticate.ts`
- Test: `backend/test/unit/presentation/http/middleware/authenticate.test.ts`

- [ ] **Step 1: Escribir la prueba que falla**

`backend/test/unit/presentation/http/middleware/authenticate.test.ts`:

```ts
import { Request, Response } from 'express';
import {
  authenticateMiddleware,
  AuthenticatedRequest,
} from '../../../../../src/presentation/http/middleware/authenticate';
import { AuthenticationProvider } from '../../../../../src/domain/auth/AuthenticationProvider';
import { UnauthenticatedException } from '../../../../../src/domain/auth/errors';
import { UserId } from '../../../../../src/domain/user/UserId';
import { Email } from '../../../../../src/domain/user/Email';

function requestWithHeader(value: string | undefined): Request {
  return { header: () => value } as unknown as Request;
}

describe('authenticateMiddleware', () => {
  it('shouldCallNextWithUnauthenticatedWhenHeaderIsMissing', async () => {
    const provider: AuthenticationProvider = { verifyIdToken: jest.fn() };
    const middleware = authenticateMiddleware(provider);
    const next = jest.fn();

    await middleware(requestWithHeader(undefined), {} as Response, next);

    expect(next).toHaveBeenCalledWith(expect.any(UnauthenticatedException));
  });

  it('shouldCallNextWithUnauthenticatedWhenHeaderIsNotBearer', async () => {
    const provider: AuthenticationProvider = { verifyIdToken: jest.fn() };
    const middleware = authenticateMiddleware(provider);
    const next = jest.fn();

    await middleware(requestWithHeader('Basic abc'), {} as Response, next);

    expect(next).toHaveBeenCalledWith(expect.any(UnauthenticatedException));
  });

  it('shouldAttachActorAndCallNextWhenTokenIsValid', async () => {
    const actor = {
      userId: UserId.fromString('usr_ana'),
      email: Email.fromString('ana@example.com'),
      displayName: 'Ana Pérez',
      photoUrl: null,
    };
    const provider: AuthenticationProvider = { verifyIdToken: jest.fn().mockResolvedValue(actor) };
    const middleware = authenticateMiddleware(provider);
    const req = requestWithHeader('Bearer a-valid-token');
    const next = jest.fn();

    await middleware(req, {} as Response, next);

    expect((req as AuthenticatedRequest).actor).toBe(actor);
    expect(next).toHaveBeenCalledWith();
  });

  it('shouldCallNextWithErrorWhenProviderRejects', async () => {
    const provider: AuthenticationProvider = {
      verifyIdToken: jest.fn().mockRejectedValue(new UnauthenticatedException('expirado')),
    };
    const middleware = authenticateMiddleware(provider);
    const next = jest.fn();

    await middleware(requestWithHeader('Bearer expired-token'), {} as Response, next);

    expect(next).toHaveBeenCalledWith(expect.any(UnauthenticatedException));
  });
});
```

- [ ] **Step 2: Ejecutar y confirmar que falla**

Run: `cd backend && npx jest test/unit/presentation/http/middleware/authenticate.test.ts`
Expected: FAIL — módulo no encontrado.

- [ ] **Step 3: Implementar `authenticateMiddleware`**

`backend/src/presentation/http/middleware/authenticate.ts`:

```ts
import { NextFunction, Request, Response } from 'express';
import { AuthenticationProvider } from '../../../domain/auth/AuthenticationProvider';
import { AuthenticatedActor } from '../../../domain/auth/AuthenticatedActor';
import { UnauthenticatedException } from '../../../domain/auth/errors';

export interface AuthenticatedRequest extends Request {
  actor: AuthenticatedActor;
}

const BEARER_PREFIX = 'Bearer ';

export function authenticateMiddleware(provider: AuthenticationProvider) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const header = req.header('authorization') ?? '';
    if (!header.startsWith(BEARER_PREFIX)) {
      next(new UnauthenticatedException('falta el encabezado Authorization Bearer.'));
      return;
    }
    const idToken = header.slice(BEARER_PREFIX.length).trim();
    try {
      const actor = await provider.verifyIdToken(idToken);
      (req as AuthenticatedRequest).actor = actor;
      next();
    } catch (error) {
      next(error);
    }
  };
}
```

- [ ] **Step 4: Ejecutar y confirmar que pasa**

Run: `cd backend && npx jest test/unit/presentation/http/middleware/authenticate.test.ts`
Expected: PASS (4 pruebas).

- [ ] **Step 5: Commit**

```bash
git add backend/src/presentation/http/middleware/authenticate.ts backend/test/unit/presentation/http/middleware/authenticate.test.ts
git commit -m "feat(backend): implementar authenticateMiddleware"
```

---

### Task 15: Middleware `errorHandler`

**Files:**
- Create: `backend/src/presentation/http/middleware/errorHandler.ts`
- Test: `backend/test/unit/presentation/http/middleware/errorHandler.test.ts`

- [ ] **Step 1: Escribir la prueba que falla**

`backend/test/unit/presentation/http/middleware/errorHandler.test.ts`:

```ts
import { Request, Response } from 'express';
import { errorHandlerMiddleware } from '../../../../../src/presentation/http/middleware/errorHandler';
import { UnauthenticatedException } from '../../../../../src/domain/auth/errors';
import { UserDisabledException } from '../../../../../src/domain/user/errors';

function responseSpy() {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return res as unknown as Response & { status: jest.Mock; json: jest.Mock };
}

describe('errorHandlerMiddleware', () => {
  it('shouldMapUnauthenticatedExceptionTo401', () => {
    const req = { requestId: 'req_123' } as unknown as Request;
    const res = responseSpy();

    errorHandlerMiddleware(new UnauthenticatedException('falta token.'), req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: { code: 'UNAUTHENTICATED', message: 'Solicitud no autenticada: falta token.' },
      meta: { requestId: 'req_123' },
    });
  });

  it('shouldMapUserDisabledExceptionTo403', () => {
    const req = { requestId: 'req_123' } as unknown as Request;
    const res = responseSpy();

    errorHandlerMiddleware(new UserDisabledException('usr_ana'), req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('shouldMapUnknownErrorTo500WithInternalErrorCode', () => {
    const req = { requestId: 'req_123' } as unknown as Request;
    const res = responseSpy();

    errorHandlerMiddleware(new Error('boom'), req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: { code: 'INTERNAL_ERROR', message: 'Error interno inesperado.' },
      meta: { requestId: 'req_123' },
    });
  });

  it('shouldFallBackToUnknownRequestIdWhenMissing', () => {
    const req = {} as Request;
    const res = responseSpy();

    errorHandlerMiddleware(new Error('boom'), req, res, jest.fn());

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ meta: { requestId: 'unknown' } }));
  });
});
```

- [ ] **Step 2: Ejecutar y confirmar que falla**

Run: `cd backend && npx jest test/unit/presentation/http/middleware/errorHandler.test.ts`
Expected: FAIL — módulo no encontrado.

- [ ] **Step 3: Implementar `errorHandlerMiddleware`**

`backend/src/presentation/http/middleware/errorHandler.ts`:

```ts
import { NextFunction, Request, Response } from 'express';
import { DomainError } from '../../../domain/errors/DomainError';
import { RequestWithId } from './requestId';
import { errorEnvelope } from '../responseEnvelope';

const STATUS_BY_CODE: Record<string, number> = {
  UNAUTHENTICATED: 401,
  USER_DISABLED: 403,
  VALIDATION_ERROR: 400,
};

export function errorHandlerMiddleware(
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const requestId = (req as Partial<RequestWithId>).requestId ?? 'unknown';

  if (error instanceof DomainError) {
    const status = STATUS_BY_CODE[error.code] ?? 400;
    res.status(status).json(errorEnvelope(error.code, error.message, requestId));
    return;
  }

  res.status(500).json(errorEnvelope('INTERNAL_ERROR', 'Error interno inesperado.', requestId));
}
```

- [ ] **Step 4: Ejecutar y confirmar que pasa**

Run: `cd backend && npx jest test/unit/presentation/http/middleware/errorHandler.test.ts`
Expected: PASS (4 pruebas).

- [ ] **Step 5: Commit**

```bash
git add backend/src/presentation/http/middleware/errorHandler.ts backend/test/unit/presentation/http/middleware/errorHandler.test.ts
git commit -m "feat(backend): implementar errorHandlerMiddleware"
```

---

### Task 16: Middleware `auditTrail` (auditoría base común)

**Files:**
- Create: `backend/src/presentation/http/middleware/auditTrail.ts`
- Test: `backend/test/unit/presentation/http/middleware/auditTrail.test.ts`

Este es el ítem "Auditoría base: escritura de `auditLogs` desde un middleware/decorador común, no repetida por caso de uso" del checklist de Fase 0. Escribe auditoría para toda mutación (`POST`/`PATCH`/`PUT`/`DELETE`) exitosa, sin que cada caso de uso tenga que invocarlo — hoy no hay endpoints mutantes todavía (`GET /me` no muta), así que la prueba ejercita el middleware contra una ruta mutante ficticia dentro de una app Express de prueba.

- [ ] **Step 1: Escribir la prueba que falla**

`backend/test/unit/presentation/http/middleware/auditTrail.test.ts`:

```ts
import express from 'express';
import request from 'supertest';
import { auditTrailMiddleware } from '../../../../../src/presentation/http/middleware/auditTrail';
import { AuditLogWriter } from '../../../../../src/domain/audit/AuditLogWriter';
import { requestIdMiddleware } from '../../../../../src/presentation/http/middleware/requestId';

function appWithFakeWriter(writer: AuditLogWriter) {
  const app = express();
  app.use(requestIdMiddleware);
  app.use(auditTrailMiddleware(writer));
  app.get('/v1/ping', (_req, res) => res.status(200).json({ ok: true }));
  app.post('/v1/groups', (_req, res) => res.status(201).json({ ok: true }));
  app.post('/v1/fails', (_req, res) => res.status(400).json({ ok: false }));
  return app;
}

describe('auditTrailMiddleware', () => {
  it('shouldNotWriteAuditLogForReadRequests', async () => {
    const write = jest.fn().mockResolvedValue(undefined);
    const app = appWithFakeWriter({ write });

    await request(app).get('/v1/ping').expect(200);
    await new Promise((resolve) => setImmediate(resolve));

    expect(write).not.toHaveBeenCalled();
  });

  it('shouldWriteAuditLogForSuccessfulMutation', async () => {
    const write = jest.fn().mockResolvedValue(undefined);
    const app = appWithFakeWriter({ write });

    await request(app).post('/v1/groups').expect(201);
    await new Promise((resolve) => setImmediate(resolve));

    expect(write).toHaveBeenCalledTimes(1);
    expect(write).toHaveBeenCalledWith(
      expect.objectContaining({ entity: '/v1/groups', operation: 'POST' }),
    );
  });

  it('shouldNotWriteAuditLogForFailedMutation', async () => {
    const write = jest.fn().mockResolvedValue(undefined);
    const app = appWithFakeWriter({ write });

    await request(app).post('/v1/fails').expect(400);
    await new Promise((resolve) => setImmediate(resolve));

    expect(write).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Ejecutar y confirmar que falla**

Run: `cd backend && npx jest test/unit/presentation/http/middleware/auditTrail.test.ts`
Expected: FAIL — módulo no encontrado.

- [ ] **Step 3: Implementar `auditTrailMiddleware`**

`backend/src/presentation/http/middleware/auditTrail.ts`:

```ts
import { NextFunction, Request, Response } from 'express';
import { AuditLogWriter } from '../../../domain/audit/AuditLogWriter';
import { AuthenticatedRequest } from './authenticate';
import { RequestWithId } from './requestId';

const MUTATING_METHODS = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);

export function auditTrailMiddleware(writer: AuditLogWriter) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!MUTATING_METHODS.has(req.method)) {
      next();
      return;
    }

    res.on('finish', () => {
      if (res.statusCode >= 400) {
        return;
      }
      const actor = (req as Partial<AuthenticatedRequest>).actor;
      const requestId = (req as Partial<RequestWithId>).requestId ?? 'unknown';
      void writer.write({
        actorId: actor?.userId.toString() ?? 'unknown',
        entity: req.path,
        entityId: req.path,
        operation: req.method,
        requestId,
        occurredAt: new Date(),
      });
    });

    next();
  };
}
```

- [ ] **Step 4: Ejecutar y confirmar que pasa**

Run: `cd backend && npx jest test/unit/presentation/http/middleware/auditTrail.test.ts`
Expected: PASS (3 pruebas).

- [ ] **Step 5: Commit**

```bash
git add backend/src/presentation/http/middleware/auditTrail.ts backend/test/unit/presentation/http/middleware/auditTrail.test.ts
git commit -m "feat(backend): implementar auditTrailMiddleware como auditoria base comun"
```

---

### Task 17: `asyncHandler`, `meController` y `createApp`

**Files:**
- Create: `backend/src/presentation/http/asyncHandler.ts`
- Create: `backend/src/presentation/http/users/meController.ts`
- Create: `backend/src/presentation/http/createApp.ts`
- Test: `backend/test/unit/presentation/http/createApp.test.ts`

Aquí se ensambla `GET /v1/me` de punta a punta con dependencias falsas (sin Firebase real) usando `supertest`, cerrando el ciclo Presentation → Application → Domain para este caso de uso.

- [ ] **Step 1: Escribir la prueba que falla**

`backend/test/unit/presentation/http/createApp.test.ts`:

```ts
import request from 'supertest';
import { createApp } from '../../../../src/presentation/http/createApp';
import { AuthenticationProvider } from '../../../../src/domain/auth/AuthenticationProvider';
import { AuditLogWriter } from '../../../../src/domain/audit/AuditLogWriter';
import { UserRepository } from '../../../../src/domain/user/UserRepository';
import { GetCurrentUserProfileUseCase } from '../../../../src/application/user/GetCurrentUserProfileUseCase';
import { UnauthenticatedException } from '../../../../src/domain/auth/errors';
import { UserId } from '../../../../src/domain/user/UserId';
import { Email } from '../../../../src/domain/user/Email';

class InMemoryUserRepository implements UserRepository {
  async findById() {
    return null;
  }
  async save() {
    /* no-op para esta prueba */
  }
}

function buildApp() {
  const authenticationProvider: AuthenticationProvider = {
    verifyIdToken: jest.fn().mockImplementation(async (token: string) => {
      if (token !== 'valid-token') {
        throw new UnauthenticatedException('token inválido.');
      }
      return {
        userId: UserId.fromString('usr_ana'),
        email: Email.fromString('ana@example.com'),
        displayName: 'Ana Pérez',
        photoUrl: null,
      };
    }),
  };
  const auditLogWriter: AuditLogWriter = { write: jest.fn().mockResolvedValue(undefined) };
  const getCurrentUserProfileUseCase = new GetCurrentUserProfileUseCase(
    new InMemoryUserRepository(),
    () => new Date('2026-07-13T12:00:00Z'),
  );

  return createApp({ authenticationProvider, auditLogWriter, getCurrentUserProfileUseCase });
}

describe('GET /v1/me', () => {
  it('shouldReturn401WhenAuthorizationHeaderIsMissing', async () => {
    const app = buildApp();

    const response = await request(app).get('/v1/me');

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('shouldReturn200WithCreatedProfileWhenTokenIsValid', async () => {
    const app = buildApp();

    const response = await request(app).get('/v1/me').set('Authorization', 'Bearer valid-token');

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      id: 'usr_ana',
      displayName: 'Ana Pérez',
      email: 'ana@example.com',
      status: 'ACTIVE',
    });
    expect(response.body.meta.requestId).toEqual(expect.any(String));
  });
});
```

- [ ] **Step 2: Ejecutar y confirmar que falla**

Run: `cd backend && npx jest test/unit/presentation/http/createApp.test.ts`
Expected: FAIL — módulo no encontrado.

- [ ] **Step 3: Implementar `asyncHandler`, `meController` y `createApp`**

`backend/src/presentation/http/asyncHandler.ts`:

```ts
import { NextFunction, Request, Response } from 'express';

type AsyncRequestHandler<Req extends Request = Request> = (
  req: Req,
  res: Response,
  next: NextFunction,
) => Promise<void>;

export function asyncHandler<Req extends Request = Request>(
  handler: AsyncRequestHandler<Req>,
): (req: Request, res: Response, next: NextFunction) => void {
  return (req, res, next) => {
    handler(req as Req, res, next).catch(next);
  };
}
```

`backend/src/presentation/http/users/meController.ts`:

```ts
import { NextFunction, Response } from 'express';
import { GetCurrentUserProfileUseCase } from '../../../application/user/GetCurrentUserProfileUseCase';
import { AuthenticatedRequest } from '../middleware/authenticate';
import { RequestWithId } from '../middleware/requestId';
import { successEnvelope } from '../responseEnvelope';

type MeRequest = AuthenticatedRequest & RequestWithId;

export function createGetMeHandler(useCase: GetCurrentUserProfileUseCase) {
  return async (req: MeRequest, res: Response, _next: NextFunction): Promise<void> => {
    const profile = await useCase.execute({ actor: req.actor });
    res.status(200).json(successEnvelope(profile, req.requestId));
  };
}
```

`backend/src/presentation/http/createApp.ts`:

```ts
import express, { Express } from 'express';
import { requestIdMiddleware, RequestWithId } from './middleware/requestId';
import { authenticateMiddleware, AuthenticatedRequest } from './middleware/authenticate';
import { auditTrailMiddleware } from './middleware/auditTrail';
import { errorHandlerMiddleware } from './middleware/errorHandler';
import { asyncHandler } from './asyncHandler';
import { createGetMeHandler } from './users/meController';
import { AuthenticationProvider } from '../../domain/auth/AuthenticationProvider';
import { AuditLogWriter } from '../../domain/audit/AuditLogWriter';
import { GetCurrentUserProfileUseCase } from '../../application/user/GetCurrentUserProfileUseCase';

export interface AppDependencies {
  authenticationProvider: AuthenticationProvider;
  auditLogWriter: AuditLogWriter;
  getCurrentUserProfileUseCase: GetCurrentUserProfileUseCase;
}

export function createApp(dependencies: AppDependencies): Express {
  const app = express();
  app.use(express.json());
  app.use(requestIdMiddleware);
  app.use(auditTrailMiddleware(dependencies.auditLogWriter));
  app.use(authenticateMiddleware(dependencies.authenticationProvider));

  app.get(
    '/v1/me',
    asyncHandler<AuthenticatedRequest & RequestWithId>(
      createGetMeHandler(dependencies.getCurrentUserProfileUseCase),
    ),
  );

  app.use(errorHandlerMiddleware);
  return app;
}
```

- [ ] **Step 4: Ejecutar y confirmar que pasa**

Run: `cd backend && npx jest test/unit/presentation/http/createApp.test.ts`
Expected: PASS (2 pruebas).

- [ ] **Step 5: Correr toda la suite unitaria con cobertura**

Run: `cd backend && npm test -- --coverage`
Expected: PASS, todos los `describe` de las tareas 4-17 en verde; cobertura de `src/domain` y `src/application` cumple 100 %/95 % (umbral configurado en la Tarea 3).

- [ ] **Step 6: Commit**

```bash
git add backend/src/presentation/http/asyncHandler.ts backend/src/presentation/http/users/meController.ts backend/src/presentation/http/createApp.ts backend/test/unit/presentation/http/createApp.test.ts
git commit -m "feat(backend): ensamblar GET /v1/me de punta a punta (createApp + meController)"
```

---

### Task 18: `compositionRoot` e `index.ts` (Cloud Function real)

**Files:**
- Create: `backend/src/presentation/compositionRoot.ts`
- Create: `backend/src/index.ts`

Esta pieza conecta con Firebase real (Admin SDK) — no es testeable de forma útil sin el emulador (eso ocurre en la Tarea 19 para el repositorio; verificar la función completa exportada requiere desplegar o usar el emulador de Functions, fuera de alcance de este plan). La verificación aquí es de tipos y de build.

- [ ] **Step 1: Implementar `compositionRoot`**

`backend/src/presentation/compositionRoot.ts`:

```ts
import { Express } from 'express';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { createApp } from './http/createApp';
import { FirebaseAuthenticationProvider } from '../infrastructure/firebase/FirebaseAuthenticationProvider';
import { FirestoreUserRepository } from '../infrastructure/firestore/FirestoreUserRepository';
import { FirestoreAuditLogWriter } from '../infrastructure/audit/FirestoreAuditLogWriter';
import { GetCurrentUserProfileUseCase } from '../application/user/GetCurrentUserProfileUseCase';

export function composeApp(): Express {
  if (getApps().length === 0) {
    initializeApp();
  }
  const firestore = getFirestore();
  const authenticationProvider = new FirebaseAuthenticationProvider(getAuth());
  const auditLogWriter = new FirestoreAuditLogWriter(firestore);
  const userRepository = new FirestoreUserRepository(firestore);
  const getCurrentUserProfileUseCase = new GetCurrentUserProfileUseCase(
    userRepository,
    () => new Date(),
  );

  return createApp({
    authenticationProvider,
    auditLogWriter,
    getCurrentUserProfileUseCase,
  });
}
```

- [ ] **Step 2: Implementar `index.ts`**

`backend/src/index.ts`:

```ts
import { onRequest } from 'firebase-functions/v2/https';
import { composeApp } from './presentation/compositionRoot';

export const api = onRequest(composeApp());
```

- [ ] **Step 3: Verificar tipos y build**

Run: `cd backend && npm run typecheck`
Expected: sin errores.

Run: `cd backend && npm run build`
Expected: genera `backend/dist/index.js` sin errores.

- [ ] **Step 4: Commit**

```bash
git add backend/src/presentation/compositionRoot.ts backend/src/index.ts
git commit -m "feat(backend): exportar Cloud Function api con composicion de dependencias"
```

---

### Task 19: Prueba de integración `FirestoreUserRepository` contra el Emulador

**Files:**
- Create: `backend/test/integration/firestoreUserRepository.integration.test.ts`

Requiere el Firebase Emulator Suite corriendo (Firestore) — igual que hace `emulator-integration` en `.github/workflows/backend.yml`.

- [ ] **Step 1: Escribir la prueba de integración**

`backend/test/integration/firestoreUserRepository.integration.test.ts`:

```ts
import { initializeApp, getApps, deleteApp, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { FirestoreUserRepository } from '../../src/infrastructure/firestore/FirestoreUserRepository';
import { User } from '../../src/domain/user/User';
import { UserId } from '../../src/domain/user/UserId';
import { Email } from '../../src/domain/user/Email';

let app: App;
let firestore: Firestore;

beforeAll(() => {
  app = getApps().length === 0 ? initializeApp({ projectId: 'demo-4adra' }) : getApps()[0]!;
  firestore = getFirestore(app);
});

afterAll(async () => {
  await deleteApp(app);
});

afterEach(async () => {
  const snapshot = await firestore.collection('users').get();
  await Promise.all(snapshot.docs.map((doc) => doc.ref.delete()));
});

function aUser(id: string): User {
  const timestamp = new Date('2026-07-13T12:00:00Z');
  return User.create({
    id: UserId.fromString(id),
    displayName: 'Ana Pérez',
    email: Email.fromString('ana@example.com'),
    photoUrl: null,
    preferredCurrency: 'USD',
    language: 'es',
    timeZone: 'UTC',
    status: 'ACTIVE',
    createdAt: timestamp,
    updatedAt: timestamp,
  });
}

describe('FirestoreUserRepository (Firebase Emulator)', () => {
  it('shouldReturnNullWhenUserDoesNotExist', async () => {
    const repository = new FirestoreUserRepository(firestore);

    const result = await repository.findById(UserId.fromString('usr_no_existe'));

    expect(result).toBeNull();
  });

  it('shouldPersistAndRetrieveAUser', async () => {
    const repository = new FirestoreUserRepository(firestore);
    const user = aUser('usr_ana');

    await repository.save(user);
    const retrieved = await repository.findById(UserId.fromString('usr_ana'));

    expect(retrieved?.displayName).toBe('Ana Pérez');
    expect(retrieved?.email.toString()).toBe('ana@example.com');
    expect(retrieved?.createdAt.toISOString()).toBe('2026-07-13T12:00:00.000Z');
  });
});
```

- [ ] **Step 2: Levantar el emulador y correr la prueba**

Run (desde la raíz del repo, porque `firebase.json` vive ahí):

```bash
firebase emulators:exec --project demo-4adra --only auth,firestore,storage "npm --prefix backend run test:integration"
```

Expected: PASS (2 pruebas). Este es el mismo comando que ejecuta `.github/workflows/backend.yml` en el job `emulator-integration`.

- [ ] **Step 3: Commit**

```bash
git add backend/test/integration/firestoreUserRepository.integration.test.ts
git commit -m "test(backend): agregar prueba de integracion de FirestoreUserRepository contra el emulador"
```

---

### Task 20: Prueba de contrato contra `docs/api/openapi.yaml`

**Files:**
- Create: `backend/test/contract/me.contract.test.ts`

Valida que la respuesta real de `GET /v1/me` cumple la forma del esquema `User` definido en `docs/api/openapi.yaml`, cerrando el requisito de `docs/TestingGuide.md` ("Verificar códigos HTTP... y serialización... Todo endpoint nuevo... agrega pruebas de contrato").

- [ ] **Step 1: Escribir la prueba de contrato**

`backend/test/contract/me.contract.test.ts`:

```ts
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as yaml from 'js-yaml';
import Ajv from 'ajv';
import request from 'supertest';
import { createApp } from '../../src/presentation/http/createApp';
import { AuthenticationProvider } from '../../src/domain/auth/AuthenticationProvider';
import { AuditLogWriter } from '../../src/domain/audit/AuditLogWriter';
import { UserRepository } from '../../src/domain/user/UserRepository';
import { GetCurrentUserProfileUseCase } from '../../src/application/user/GetCurrentUserProfileUseCase';
import { UserId } from '../../src/domain/user/UserId';
import { Email } from '../../src/domain/user/Email';

class InMemoryUserRepository implements UserRepository {
  async findById() {
    return null;
  }
  async save() {
    /* no-op para esta prueba */
  }
}

describe('Contrato GET /v1/me contra docs/api/openapi.yaml', () => {
  it('shouldMatchTheUserSchemaDefinedInOpenapi', async () => {
    const openapiPath = path.resolve(__dirname, '../../../docs/api/openapi.yaml');
    const openapiDocument = yaml.load(fs.readFileSync(openapiPath, 'utf8')) as Record<string, unknown>;

    const ajv = new Ajv({ strict: false });
    ajv.addSchema(openapiDocument, 'openapi.yaml');
    const validateUser = ajv.getSchema('openapi.yaml#/components/schemas/User');
    if (!validateUser) {
      throw new Error('No se pudo resolver components/schemas/User en openapi.yaml');
    }

    const authenticationProvider: AuthenticationProvider = {
      verifyIdToken: async () => ({
        userId: UserId.fromString('usr_ana'),
        email: Email.fromString('ana@example.com'),
        displayName: 'Ana Pérez',
        photoUrl: null,
      }),
    };
    const auditLogWriter: AuditLogWriter = { write: async () => undefined };
    const getCurrentUserProfileUseCase = new GetCurrentUserProfileUseCase(
      new InMemoryUserRepository(),
      () => new Date('2026-07-13T12:00:00Z'),
    );
    const app = createApp({ authenticationProvider, auditLogWriter, getCurrentUserProfileUseCase });

    const response = await request(app).get('/v1/me').set('Authorization', 'Bearer valid-token');

    expect(response.status).toBe(200);
    expect(typeof response.body.meta.requestId).toBe('string');
    expect(response.body.meta.requestId.length).toBeGreaterThan(0);

    const isValid = validateUser(response.body.data);
    if (!isValid) {
      throw new Error(`Respuesta no cumple el esquema User: ${JSON.stringify(validateUser.errors)}`);
    }
    expect(isValid).toBe(true);
  });
});
```

- [ ] **Step 2: Ejecutar y confirmar que pasa**

Run: `cd backend && npm run test:contract`
Expected: PASS (1 prueba).

- [ ] **Step 3: Commit**

```bash
git add backend/test/contract/me.contract.test.ts
git commit -m "test(backend): agregar prueba de contrato de GET /v1/me contra openapi.yaml"
```

---

### Task 21: Verificación final del pipeline y actualización del checklist

**Files:**
- Modify: `docs/checklists/Fase0-FundacionTecnica.md`

- [ ] **Step 1: Correr el pipeline completo localmente, en el mismo orden que `.github/workflows/backend.yml`**

```bash
cd backend
npm run format:check
npm run lint
npm run typecheck
npm test -- --coverage
npm run build
cd ..
firebase emulators:exec --project demo-4adra --only auth,firestore,storage "npm --prefix backend run test:integration"
npm --prefix backend run test:contract
```

Expected: los siete comandos terminan en verde (exit code 0).

- [ ] **Step 2: Actualizar `docs/checklists/Fase0-FundacionTecnica.md`**

Marcar como hechas las siguientes líneas de la sección "Backend (`backend/`)" (líneas 41, 42, 43, 44, 45, 46, 47, 48, 49 del archivo actual — cambiar `- [ ]` por `- [x]`):

```markdown
- [x] Inicializar proyecto Node.js/TypeScript con `strict: true` (`docs/CodingStandards.md`).
- [x] Crear estructura de carpetas `backend/src/{domain,application,infrastructure,presentation}` (`docs/DevelopmentGuide.md`).
- [x] Configurar ESLint + Prettier según `docs/CodingStandards.md`.
- [x] Configurar Jest para pruebas unitarias e integración con Firebase Emulator.
- [x] Fijar versión de Node en `backend/.nvmrc` y `engines.node` de `package.json`.
- [x] Implementar el primer caso de uso trivial (por ejemplo `GET /me` de `docs/api/Auth.md`) de punta a punta, atravesando las cuatro capas, como prueba de que la arquitectura funciona antes de escalar a más funcionalidad.
- [x] Configurar inyección de dependencias (contenedor o composición manual) sin instancias concretas dentro de casos de uso.
- [x] Manejo de errores: excepciones de dominio específicas (`docs/CodingStandards.md`) traducidas a HTTP solo en Presentation, con el sobre de error de `docs/ApiSpecification.md`.
- [x] Auditoría base: escritura de `auditLogs` desde un middleware/decorador común, no repetida por caso de uso.
```

También marcar en la sección "Repositorio y entornos" (línea 23 del archivo actual):

```markdown
- [x] Cuando se cree `backend/package.json`, definir los scripts npm que `backend.yml` ya asume: `format:check`, `lint`, `typecheck`, `test` (con `--coverage`), `test:integration` (pensado para correr dentro de `firebase emulators:exec`), `test:contract` (contra `docs/api/openapi.yaml`), `build`.
```

Y línea 26:

```markdown
- [x] Al crear `backend/.nvmrc` y `web/.nvmrc`, confirmar contra nodejs.org cuál es la LTS activa vigente en ese momento y fijarla (ADR-008 deja el criterio, no el número).
```

(Nota: esta línea original cubre `backend/.nvmrc` **y** `web/.nvmrc` — solo se cumplió la parte de `backend/`; dejar una nota inline o dividir la línea en dos si `web/.nvmrc` no se crea en este mismo cambio. Dado que este plan es solo-backend, dividir la línea:)

```markdown
- [x] `backend/.nvmrc` confirmado contra nodejs.org: Node 24 (Active LTS al 2026-07-14) (ADR-008 deja el criterio, no el número).
- [ ] `web/.nvmrc`: confirmar LTS activa vigente contra nodejs.org al crear el scaffolding de `web/` (fuera de alcance de este plan).
```

- [ ] **Step 3: Commit**

```bash
git add docs/checklists/Fase0-FundacionTecnica.md
git commit -m "docs: marcar scaffolding de backend como completado en checklist Fase 0"
```

---

## Verificación de alcance

- Cada línea del checklist "Backend (`backend/`)" de `docs/checklists/Fase0-FundacionTecnica.md` tiene una tarea que la implementa (Tasks 1-18) y una tarea final que la marca (Task 21).
- `GET /me` atraviesa las cuatro capas: Presentation (`createApp`, `meController`, middlewares) → Application (`GetCurrentUserProfileUseCase`) → Domain (`User`, `UserId`, `Email`, excepciones) ← Infrastructure (`FirestoreUserRepository`, `FirebaseAuthenticationProvider`, `FirestoreAuditLogWriter`).
- DI: `compositionRoot.ts` es composición manual explícita — ningún caso de uso instancia una dependencia concreta.
- Manejo de errores: `DomainError` + subclases en Domain, traducción a HTTP solo en `errorHandlerMiddleware` (Presentation), usando el sobre de `docs/ApiSpecification.md`.
- Auditoría base: `auditTrailMiddleware`, un único middleware, no repetido por caso de uso.
- Todos los scripts npm que `.github/workflows/backend.yml` ya asume (`format:check`, `lint`, `typecheck`, `test`, `test:integration`, `test:contract`, `build`) existen y pasan.
