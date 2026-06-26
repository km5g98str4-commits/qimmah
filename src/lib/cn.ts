// أداة دمج أصناف CSS الشرطية بدون اعتماديات خارجية.
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ')
}
