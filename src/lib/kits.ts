/** Kits não têm estoque próprio: são uma receita de produtos avulsos (SKU do produto × quantidade por kit). */
export type Kit = { sku: string; itens: { sku: string; quantidade: number }[] };

const norm = (s: string) => s.trim().toLowerCase();

/** Troca cada linha com SKU de kit pelos produtos que o compõem (quantidade × unidades do kit). Linhas sem kit ficam iguais. */
export function expandirKits<T extends { sku?: string | undefined; quantidade: number }>(linhas: T[], kits: Kit[]): T[] {
  const mapa = new Map(kits.map((k) => [norm(k.sku), k]));
  return linhas.flatMap((l) => {
    const kit = l.sku ? mapa.get(norm(l.sku)) : undefined;
    if (!kit || !kit.itens.length) return [l];
    return kit.itens.map((i) => ({ ...l, sku: i.sku, quantidade: l.quantidade * i.quantidade }));
  });
}
