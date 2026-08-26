/** Ambient types so the IDE can resolve Deno/JSR imports without the Deno extension. */

declare module "jsr:@supabase/functions-js/edge-runtime.d.ts" {}

declare module "jsr:@supabase/supabase-js@2" {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export function createClient(
    supabaseUrl: string,
    supabaseKey: string,
    options?: Record<string, unknown>,
  ): any;
}

declare module "npm:@supabase/supabase-js@2" {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export function createClient(
    supabaseUrl: string,
    supabaseKey: string,
    options?: Record<string, unknown>,
  ): any;
}

declare namespace Deno {
  namespace env {
    function get(key: string): string | undefined;
  }
  function serve(
    handler: (request: Request) => Response | Promise<Response>,
  ): void;
}
