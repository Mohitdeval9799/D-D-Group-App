import { useEffect, useState } from 'react';
import type { Product } from '../types';
import { ProductIllustration } from './ProductIllustration';

interface ProductVisualProps {
  product: Product;
  className?: string;
}

export function ProductVisual({ product, className = 'w-full h-full' }: ProductVisualProps) {
  const [imgBroken, setImgBroken] = useState(false);

  useEffect(() => {
    setImgBroken(false);
  }, [product.imageUrl]);

  if (product.imageUrl && !imgBroken) {
    return (
      <img
        src={product.imageUrl}
        alt={product.name}
        loading="lazy"
        onError={() => setImgBroken(true)}
        className={`${className} object-contain rounded`}
      />
    );
  }

  return <ProductIllustration product={product} className={className} />;
}
