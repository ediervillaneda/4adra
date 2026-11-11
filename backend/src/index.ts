import { Hono } from 'hono';
import { composeApp } from './presentation/compositionRoot';
import { AppEnv } from './presentation/http/AppEnv';

// La app y Better Auth se construyen una vez por isolate: los bindings de `env` son estables
// durante la vida del isolate, así que no hace falta recrearlos en cada request.
let app: Hono<AppEnv> | undefined;

// Static Assets atiende todo lo que no sea /api/* (run_worker_first en wrangler.jsonc).
export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    app ??= composeApp(env);
    return Promise.resolve(app.fetch(request, env, ctx));
  },
} satisfies ExportedHandler<Env>;
