declare module "svgo/dist/svgo.browser.js" {
  export function optimize(
    input: string,
    config?: {
      multipass?: boolean;
      plugins?: unknown[];
    },
  ): { data: string };
}
