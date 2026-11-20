import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { ImagePlus, RotateCcw, Trash2, X } from 'lucide-react';
import type { Product, ProductKind } from '../types';
import { calculateDealerMarginPercent } from '../utils/catalogMerge';
import { compressProductImageFile, isValidProductImageUrl } from '../utils/imageOptimizer';
import { ProductVisual } from './ProductVisual';

interface ProductEditorModalProps {
  product: Product | null;
  isNew: boolean;
  categories: string[];
  existingIds: Set<string>;
  onClose: () => void;
  onSave: (product: Product) => Promise<void> | void;
  onDeleteOrReset?: (product: Product) => Promise<void> | void;
}

const PRODUCT_KINDS: { value: ProductKind; label: string }[] = [
  { value: 'switch', label: 'Modular Switch' },
  { value: 'socket', label: 'Power Socket' },
  { value: 'regulator', label: 'Fan Regulator' },
  { value: 'plate', label: 'Modular Cover Plate' },
  { value: 'bulb', label: 'LED Bulb' },
  { value: 'batten', label: 'LED Tube / Batten' },
  { value: 'panel', label: 'LED Panel / Downlight' },
  { value: 'flood', label: 'LED Flood / Street Light' },
  { value: 'strip', label: 'LED Strip / Rope Light' },
  { value: 'wire', label: 'Copper Wire Coil' },
  { value: 'cable', label: 'Multicore / Heavy Cable' },
  { value: 'mcb', label: 'MCB Circuit Breaker' },
  { value: 'rccb', label: 'RCCB / Isolator' },
  { value: 'db', label: 'Distribution Board (DB)' },
  { value: 'box', label: 'Surface / Concealed Box' },
  { value: 'extension', label: 'Extension Board / Spike Guard' },
  { value: 'plug', label: 'Plug Top / Multi-Plug' },
  { value: 'holder', label: 'Lamp Holder / Ceiling Rose' },
  { value: 'tape', label: 'PVC Insulation Tape' },
  { value: 'conduit', label: 'PVC Conduit / Casing' },
  { value: 'bell', label: 'Door Bell / Chime' },
  { value: 'accessory', label: 'General Electrical Accessory' },
];

const UNIT_OPTIONS = [
  'piece',
  'coil',
  'roll',
  'pack',
  'box',
  'set',
  'length',
  'meter',
  'pair',
  'kit',
];

export function ProductEditorModal({
  product,
  isNew,
  categories,
  existingIds,
  onClose,
  onSave,
  onDeleteOrReset,
}: ProductEditorModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [id, setId] = useState('');
  const [category, setCategory] = useState('');
  const [family, setFamily] = useState('');
  const [spec, setSpec] = useState('');
  const [priceStr, setPriceStr] = useState('');
  const [mrpStr, setMrpStr] = useState('');
  const [moqStr, setMoqStr] = useState('1');
  const [unit, setUnit] = useState('piece');
  const [kind, setKind] = useState<ProductKind>('accessory');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [inStock, setInStock] = useState(true);
  const [isHidden, setIsHidden] = useState(false);
  const [featured, setFeatured] = useState(false);

  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageInfo, setImageInfo] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDanger, setConfirmDanger] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (product) {
      setId(product.id);
      setCategory(product.category);
      setFamily(product.family);
      setSpec(product.spec);
      setPriceStr(String(product.price || ''));
      setMrpStr(product.mrp && product.mrp > 0 ? String(product.mrp) : '');
      setMoqStr(String(product.moq && product.moq >= 1 ? product.moq : 1));
      setUnit(product.unit || 'piece');
      setKind(product.kind || 'accessory');
      setDescription(product.description ?? '');
      setImageUrl(product.imageUrl ?? '');
      setInStock(product.inStock !== false);
      setIsHidden(Boolean(product.isHidden));
      setFeatured(Boolean(product.featured));
      setImageInfo(null);
      setErrorMsg(null);
      setConfirmDanger(false);
      if (!dialog.open) {
        dialog.showModal();
      }
    } else if (dialog.open) {
      dialog.close();
    }
  }, [product]);

  if (!product) {
    return <dialog ref={dialogRef} className="hidden" />;
  }

  const parsedPrice = Number(priceStr);
  const parsedMrp = mrpStr.trim() === '' ? 0 : Number(mrpStr);
  const parsedMoq = Math.max(1, Math.round(Number(moqStr) || 1));
  const marginPct =
    Number.isFinite(parsedPrice) && Number.isFinite(parsedMrp)
      ? calculateDealerMarginPercent(parsedPrice, parsedMrp)
      : null;

  const previewProduct: Product = {
    id: id.trim().toUpperCase() || product.id,
    category: category.trim() || 'Accessories',
    family: family.trim() || 'Product Title',
    spec: spec.trim() || 'Variant specification',
    name: `${family.trim() || 'Product Title'} — ${spec.trim() || 'Variant specification'}`,
    price: Number.isFinite(parsedPrice) && parsedPrice > 0 ? parsedPrice : 1,
    mrp: Number.isFinite(parsedMrp) && parsedMrp >= 0 ? parsedMrp : 0,
    moq: parsedMoq,
    unit: unit.trim() || 'piece',
    kind,
    description: description.trim(),
    imageUrl: imageUrl.trim(),
    inStock,
    isHidden,
    featured,
    isCustom: isNew ? true : Boolean(product.isCustom),
    isEdited: true,
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg(null);
    setUploadingImage(true);
    try {
      const optimized = await compressProductImageFile(file);
      setImageUrl(optimized.dataUrl);
      const kb = Math.round(optimized.byteLength / 1024);
      setImageInfo(`Optimized ${optimized.width}×${optimized.height}px (${kb} KB)`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Could not process image file.');
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanId = id.trim().toUpperCase();
    if (!/^[A-Z0-9-]{3,32}$/.test(cleanId)) {
      setErrorMsg('SKU code must be 3–32 characters using uppercase letters, numbers, or hyphens.');
      return;
    }
    if (isNew && existingIds.has(cleanId)) {
      setErrorMsg(`SKU "${cleanId}" already exists. Please use a unique SKU code.`);
      return;
    }
    if (!category.trim()) {
      setErrorMsg('Please select or enter a category.');
      return;
    }
    if (!family.trim()) {
      setErrorMsg('Please enter a product name / family.');
      return;
    }
    if (!spec.trim()) {
      setErrorMsg('Please enter variant specifications (e.g. wattage, rating, colour, length).');
      return;
    }
    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0 || parsedPrice > 10000000) {
      setErrorMsg('Wholesale dealer price must be greater than ₹0.');
      return;
    }
    if (mrpStr.trim() !== '' && (!Number.isFinite(parsedMrp) || parsedMrp < 0)) {
      setErrorMsg('MRP must be a valid non-negative number.');
      return;
    }
    if (!isValidProductImageUrl(imageUrl.trim())) {
      setErrorMsg(
        'Product image must be an uploaded photo or a valid https:// URL (under 155 KB).'
      );
      return;
    }

    setSaving(true);
    try {
      await onSave({
        ...previewProduct,
        id: cleanId,
        price: Math.round(parsedPrice * 100) / 100,
        mrp: Math.round((Number.isFinite(parsedMrp) ? Math.max(0, parsedMrp) : 0) * 100) / 100,
      });
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to save product.');
    } finally {
      setSaving(false);
    }
  };

  const handleDangerConfirm = async () => {
    if (!onDeleteOrReset) return;
    setSaving(true);
    try {
      await onDeleteOrReset(product);
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Operation failed.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose();
      }}
      aria-labelledby="product-editor-title"
      className="m-auto w-[94vw] max-w-[900px] max-h-[92vh] overflow-y-auto rounded-xl border border-[#dce5e3] bg-white p-0 text-[#142a30] shadow-2xl"
    >
      <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-[#edf2f0] bg-white px-6 py-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#087c67]">
            {isNew ? 'Create New Catalogue SKU' : `Editing SKU · ${product.id}`}
          </p>
          <h2 id="product-editor-title" className="font-display text-lg font-bold text-[#142a30]">
            {isNew ? 'Add New Product' : product.family}
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close product editor"
          className="inline-flex items-center justify-center w-9 h-9 rounded-md bg-[#f1f6f4] text-[#142a30] hover:bg-[#e2ede9] cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <form onSubmit={(e) => void handleSubmit(e)} noValidate className="p-6 space-y-6">
        {errorMsg && (
          <div
            role="alert"
            className="rounded-md bg-[#fdf2f0] border border-[#e7bcb6] px-4 py-3 text-xs font-medium text-[#8f2e22]"
          >
            {errorMsg}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-6 items-start">
          {/* Left Column: Image Upload & Live Visual Preview */}
          <div className="space-y-3">
            <div className="h-56 rounded-lg bg-gradient-to-b from-white to-[#eef3f1] border border-[#dce5e3] p-4 flex items-center justify-center overflow-hidden">
              <ProductVisual product={previewProduct} className="w-full h-full max-w-[220px]" />
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => void handleFileChange(e)}
              className="hidden"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingImage}
              className="w-full inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-md border border-[#087c67] bg-[#eef7f3] text-[#066352] text-xs font-semibold hover:bg-[#e1f1ea] disabled:opacity-50 cursor-pointer"
            >
              <ImagePlus className="w-4 h-4" aria-hidden="true" />
              <span>{uploadingImage ? 'Optimizing photo…' : 'Upload Product Photo'}</span>
            </button>

            {imageInfo && (
              <p className="text-[11px] text-[#087c67] font-medium">{imageInfo}</p>
            )}

            <div>
              <label htmlFor="edit-image-url" className="block text-[11px] font-semibold text-[#42555a] mb-1">
                Or paste HTTPS image URL
              </label>
              <input
                id="edit-image-url"
                type="url"
                value={imageUrl.startsWith('data:') ? '' : imageUrl}
                onChange={(e) => {
                  setImageUrl(e.target.value);
                  setImageInfo(null);
                }}
                placeholder="https://example.com/product.jpg"
                className="w-full px-3 py-2 text-xs rounded-md border border-[#d1dedb] bg-white text-[#142a30]"
              />
              {imageUrl.startsWith('data:') && (
                <p className="text-[11px] text-[#5a6d71] mt-1">
                  Uploaded photo active ({Math.round(imageUrl.length / 1024)} KB compressed).
                </p>
              )}
            </div>

            {imageUrl && (
              <button
                type="button"
                onClick={() => {
                  setImageUrl('');
                  setImageInfo(null);
                }}
                className="text-xs font-semibold text-[#8a3c32] hover:underline cursor-pointer"
              >
                Remove photo (revert to vector illustration)
              </button>
            )}
          </div>

          {/* Right Column: Product Specifications, Pricing & Description */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label htmlFor="edit-sku" className="block text-xs font-semibold text-[#2d4348] mb-1">
                  SKU Code *
                </label>
                <input
                  id="edit-sku"
                  type="text"
                  value={id}
                  disabled={!isNew}
                  onChange={(e) => setId(e.target.value.toUpperCase())}
                  maxLength={32}
                  placeholder="e.g. DD-0330"
                  className="w-full px-3 py-2 text-sm font-mono rounded-md border border-[#d1dedb] bg-white text-[#142a30] disabled:bg-[#f4f7f6] disabled:text-[#5a6d71]"
                />
              </div>

              <div>
                <label htmlFor="edit-category" className="block text-xs font-semibold text-[#2d4348] mb-1">
                  Category *
                </label>
                <input
                  id="edit-category"
                  type="text"
                  list="dd-category-suggestions"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  maxLength={80}
                  placeholder="Select or type new category"
                  className="w-full px-3 py-2 text-sm rounded-md border border-[#d1dedb] bg-white text-[#142a30]"
                />
                <datalist id="dd-category-suggestions">
                  {categories.map((cat) => (
                    <option key={cat} value={cat} />
                  ))}
                </datalist>
              </div>
            </div>

            <div>
              <label htmlFor="edit-family" className="block text-xs font-semibold text-[#2d4348] mb-1">
                Product Name / Family *
              </label>
              <input
                id="edit-family"
                type="text"
                value={family}
                onChange={(e) => setFamily(e.target.value)}
                maxLength={120}
                placeholder="e.g. D&D Prime FR Copper Wire"
                className="w-full px-3 py-2 text-sm rounded-md border border-[#d1dedb] bg-white text-[#142a30]"
              />
            </div>

            <div>
              <label htmlFor="edit-spec" className="block text-xs font-semibold text-[#2d4348] mb-1">
                Variant Specifications *
              </label>
              <input
                id="edit-spec"
                type="text"
                value={spec}
                onChange={(e) => setSpec(e.target.value)}
                maxLength={160}
                placeholder="e.g. 2.5 mm² · 90m Coil · Red · Flame Retardant"
                className="w-full px-3 py-2 text-sm rounded-md border border-[#d1dedb] bg-white text-[#142a30]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label htmlFor="edit-price" className="block text-xs font-semibold text-[#2d4348] mb-1">
                  Dealer Price (₹) *
                </label>
                <input
                  id="edit-price"
                  type="number"
                  min={1}
                  max={10000000}
                  step="any"
                  value={priceStr}
                  onChange={(e) => setPriceStr(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono tabular-nums rounded-md border border-[#d1dedb] bg-white text-[#142a30]"
                />
              </div>

              <div>
                <label htmlFor="edit-mrp" className="block text-xs font-semibold text-[#2d4348] mb-1">
                  Retail MRP (₹) <span className="font-normal text-[#6d8085]">(optional)</span>
                </label>
                <input
                  id="edit-mrp"
                  type="number"
                  min={0}
                  max={10000000}
                  step="any"
                  value={mrpStr}
                  onChange={(e) => setMrpStr(e.target.value)}
                  placeholder="e.g. 160"
                  className="w-full px-3 py-2 text-sm font-mono tabular-nums rounded-md border border-[#d1dedb] bg-white text-[#142a30]"
                />
                {marginPct !== null && (
                  <p className="text-[11px] font-medium text-[#087c67] mt-1">
                    Dealer margin: {marginPct}% off MRP
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="edit-moq" className="block text-xs font-semibold text-[#2d4348] mb-1">
                  Min Order Qty (MOQ)
                </label>
                <input
                  id="edit-moq"
                  type="number"
                  min={1}
                  max={9999}
                  value={moqStr}
                  onChange={(e) => setMoqStr(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono tabular-nums rounded-md border border-[#d1dedb] bg-white text-[#142a30]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label htmlFor="edit-unit" className="block text-xs font-semibold text-[#2d4348] mb-1">
                  Selling Unit
                </label>
                <select
                  id="edit-unit"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-md border border-[#d1dedb] bg-white text-[#142a30]"
                >
                  {UNIT_OPTIONS.map((u) => (
                    <option key={u} value={u}>
                      Per {u}
                    </option>
                  ))}
                  {!UNIT_OPTIONS.includes(unit) && <option value={unit}>Per {unit}</option>}
                </select>
              </div>

              <div>
                <label htmlFor="edit-kind" className="block text-xs font-semibold text-[#2d4348] mb-1">
                  Fallback Vector Style
                </label>
                <select
                  id="edit-kind"
                  value={kind}
                  onChange={(e) => setKind(e.target.value as ProductKind)}
                  className="w-full px-3 py-2 text-sm rounded-md border border-[#d1dedb] bg-white text-[#142a30]"
                >
                  {PRODUCT_KINDS.map((k) => (
                    <option key={k.value} value={k.value}>
                      {k.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="edit-desc" className="block text-xs font-semibold text-[#2d4348] mb-1">
                Product Description &amp; Warranty / Packing Notes
              </label>
              <textarea
                id="edit-desc"
                rows={3}
                maxLength={1500}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add detailed product highlights, warranty period, box packing quantity, or compliance notes shown to dealers..."
                className="w-full px-3 py-2 text-sm rounded-md border border-[#d1dedb] bg-white text-[#142a30]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-5 pt-1 text-xs text-[#2d4348]">
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={inStock}
                  onChange={(e) => setInStock(e.target.checked)}
                  className="rounded accent-[#087c67]"
                />
                <span className="font-medium">In stock</span>
              </label>
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!isHidden}
                  onChange={(e) => setIsHidden(!e.target.checked)}
                  className="rounded accent-[#087c67]"
                />
                <span className="font-medium">Visible in customer catalogue</span>
              </label>
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={featured}
                  onChange={(e) => setFeatured(e.target.checked)}
                  className="rounded accent-[#087c67]"
                />
                <span className="font-medium">Feature on Home hero</span>
              </label>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-[#edf2f0] flex flex-wrap items-center justify-between gap-3">
          <div>
            {!isNew && onDeleteOrReset && (product.isCustom || product.isEdited) && (
              confirmDanger ? (
                <div className="inline-flex items-center gap-2 text-xs">
                  <span className="text-[#8f2e22] font-semibold">
                    {product.isCustom ? 'Delete this custom SKU?' : 'Reset to original defaults?'}
                  </span>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void handleDangerConfirm()}
                    className="px-3 py-1.5 rounded-md bg-[#a43e2f] text-white font-semibold hover:bg-[#872e21] cursor-pointer"
                  >
                    Confirm
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDanger(false)}
                    className="px-2.5 py-1.5 rounded-md border border-[#dce5e3] text-[#42555a] cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDanger(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-[#e5c2bc] text-xs font-semibold text-[#8f2e22] hover:bg-[#fdf2f0] cursor-pointer"
                >
                  {product.isCustom ? (
                    <>
                      <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Delete Custom Product</span>
                    </>
                  ) : (
                    <>
                      <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Reset to Default</span>
                    </>
                  )}
                </button>
              )
            )}
          </div>

          <div className="flex items-center gap-3 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-md border border-[#d1dedb] bg-white text-sm font-semibold text-[#42555a] hover:bg-[#f4f7f6] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || uploadingImage}
              data-testid="save-product-btn"
              className="px-5 py-2.5 rounded-md bg-[#087c67] text-white text-sm font-semibold hover:bg-[#066352] disabled:opacity-50 cursor-pointer"
            >
              {saving ? 'Saving…' : isNew ? 'Create Product' : 'Save Changes'}
            </button>
          </div>
        </div>
      </form>
    </dialog>
  );
}
