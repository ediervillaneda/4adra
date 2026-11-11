import { composeApp } from './presentation/compositionRoot';

// Static Assets atiende todo lo que no sea /api/* (run_worker_first en wrangler.jsonc).
export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    return Promise.resolve(composeApp(env).fetch(request, env, ctx));
  },
} satisfies ExportedHandler<Env>;
