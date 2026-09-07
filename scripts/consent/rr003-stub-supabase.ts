// مسجِّل بديل لعميل Supabase — يلتقط upsert ولا يلمس الشبكة. يُوصَل بمُحلِّل esbuild فقط.
export const upserts: Array<{ table: string; row: Record<string, unknown> }> = []
export function isSupabaseConfigured(): boolean { return true }
export async function getSupabase(): Promise<unknown> {
  return { from(table: string) { return {
    select() { return { eq() { return { maybeSingle: async () => ({ data: null, error: null }) } } } },
    upsert: async (row: Record<string, unknown>) => { upserts.push({ table, row }); return { error: null } },
  } } }
}
