import { getIconSvg, resolveProductIcon } from '@/lib/productIcons';

/** Raw inline SVG for a palette icon name. Inherits color via currentColor. */
export function ProductIcon({
  name,
  size = 20,
  className,
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const { body, viewBox } = getIconSvg(name);
  return (
    <svg
      viewBox={viewBox}
      width={size}
      height={size}
      className={className}
      aria-hidden
      focusable="false"
      dangerouslySetInnerHTML={{ __html: body }}
    />
  );
}

/**
 * Squircle (rounded-square) glass avatar holding a product's icon. Resolves the
 * icon from the product (stored → keyword map → generic) so callers just pass
 * the product.
 */
export function ProductIconAvatar({
  product,
  className = 'h-10 w-10',
  iconSize = 20,
}: {
  product: { icon?: string | null; name: string };
  className?: string;
  iconSize?: number;
}) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-[13px] border border-white/10 bg-white/[0.06] text-[var(--accent)] ${className}`}
    >
      <ProductIcon name={resolveProductIcon(product)} size={iconSize} />
    </span>
  );
}
