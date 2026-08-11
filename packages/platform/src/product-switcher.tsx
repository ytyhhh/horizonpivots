import type { HorizonProduct } from "./index";
import { products } from "./index";

export function ProductSwitcher({ active, className }: { active: HorizonProduct; className?: string }) {
  return (
    <nav className={className} aria-label="Horizon Pivots 产品">
      {products.map((product) => (
        <a key={product.id} href={product.href} aria-current={product.id === active ? "page" : undefined}>
          {product.name}
        </a>
      ))}
    </nav>
  );
}
