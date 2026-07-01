import { useState } from 'react'
import { Icon } from '@/components/Icon'
import { Footer } from '@/components/Footer'
import type { Lang } from '@/lib/appPreferences'
import { editProduct, listByStatus, setProductStatus, type ProductStatus, type StoredProduct } from '@/features/products'
import { ensureReviewPanelSeed } from './seed'
import { reviewPanelStrings } from './strings'

interface ReviewPanelViewProps {
  lang: Lang
  onBack: () => void
}

const REVIEW_STATUSES: ProductStatus[] = ['pending_review', 'user_submitted', 'needs_fix']

// مُنفّذ العمليات في سجلّ التدقيق — هذه الشاشة داخلية فقط، لا حساب مستخدم مرتبط بها بعد.
const REVIEWER = 'internal_review_panel'

function loadReviewProducts(): StoredProduct[] {
  return REVIEW_STATUSES.flatMap((status) => listByStatus(status)).sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  )
}

interface EditForm {
  name: string
  brand: string
  servingSize: string
  kcal: string
  protein: string
  carbs: string
  fat: string
}

function toForm(p: StoredProduct): EditForm {
  return {
    name: p.name,
    brand: p.brand ?? '',
    servingSize: p.servingSize ?? '',
    kcal: String(p.kcal),
    protein: String(p.protein),
    carbs: String(p.carbs),
    fat: String(p.fat),
  }
}

/**
 * شاشة داخلية لمراجعة المنتجات (باركود/OCR/يدوي) قبل اعتمادها في قاعدة البيانات.
 * تستهلك قاعدة بيانات المنتجات الفعلية (`@/features/products`) — لا تخزين موازٍ خاص بها.
 * ليست جزءًا من تنقّل المستخدم العادي — تُفتح من مدخل مطوّر في الإعدادات.
 */
export function ReviewPanelView({ lang, onBack }: ReviewPanelViewProps) {
  const t = reviewPanelStrings[lang]
  const [products, setProducts] = useState<StoredProduct[]>(() => {
    ensureReviewPanelSeed()
    return loadReviewProducts()
  })
  const [editingBarcode, setEditingBarcode] = useState<string | null>(null)
  const [form, setForm] = useState<EditForm | null>(null)

  const refresh = () => setProducts(loadReviewProducts())

  const startEdit = (p: StoredProduct) => {
    setEditingBarcode(p.barcode)
    setForm(toForm(p))
  }

  const cancelEdit = () => {
    setEditingBarcode(null)
    setForm(null)
  }

  const approve = (p: StoredProduct) => {
    setProductStatus(p.barcode, 'verified', REVIEWER, 'اعتماد من لوحة المراجعة الداخلية')
    refresh()
  }

  const saveEdit = (p: StoredProduct) => {
    if (!form) return
    // منتج كان "يحتاج تصحيح" وتمّ تعديله يعود لقائمة الانتظار العادية ليُراجَع من جديد.
    const nextStatus: ProductStatus = p.status === 'needs_fix' ? 'pending_review' : p.status
    editProduct(
      p.barcode,
      {
        name: form.name.trim() || p.name,
        brand: form.brand.trim() || undefined,
        servingSize: form.servingSize.trim() || undefined,
        kcal: Number(form.kcal) || 0,
        protein: Number(form.protein) || 0,
        carbs: Number(form.carbs) || 0,
        fat: Number(form.fat) || 0,
        status: nextStatus,
      },
      REVIEWER,
      'تعديل قيم من لوحة المراجعة الداخلية',
    )
    cancelEdit()
    refresh()
  }

  return (
    <div className="min-h-screen bg-page">
      <header className="sticky top-0 z-40 glass border-b border-line">
        <div className="container-page flex h-16 items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-sm font-bold text-ink-700 transition-colors hover:text-ink-900"
          >
            <Icon name="ChevronLeft" className="h-5 w-5 rtl:rotate-180" />
            {t.back}
          </button>
        </div>
      </header>

      <main className="container-page space-y-6 py-8">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary-soft text-primary-c">
            <Icon name="ClipboardList" className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl font-black text-ink-900">{t.title}</h1>
            <p className="text-sm text-ink-500">{t.subtitle}</p>
          </div>
        </div>

        {products.length === 0 ? (
          <div className="card flex flex-col items-center gap-2 p-10 text-center">
            <Icon name="ClipboardList" className="h-8 w-8 text-ink-400" />
            <p className="text-sm font-bold text-ink-900">{t.empty}</p>
            <p className="text-xs text-ink-400">{t.emptyHint}</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {products.map((p) => (
              <ProductReviewCard
                key={p.barcode}
                product={p}
                t={t}
                isEditing={editingBarcode === p.barcode}
                form={editingBarcode === p.barcode ? form : null}
                onStartEdit={() => startEdit(p)}
                onCancelEdit={cancelEdit}
                onChangeForm={setForm}
                onSaveEdit={() => saveEdit(p)}
                onApprove={() => approve(p)}
              />
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}

interface ProductReviewCardProps {
  product: StoredProduct
  t: (typeof reviewPanelStrings)['ar']
  isEditing: boolean
  form: EditForm | null
  onStartEdit: () => void
  onCancelEdit: () => void
  onChangeForm: (f: EditForm) => void
  onSaveEdit: () => void
  onApprove: () => void
}

function ProductReviewCard({
  product,
  t,
  isEditing,
  form,
  onStartEdit,
  onCancelEdit,
  onChangeForm,
  onSaveEdit,
  onApprove,
}: ProductReviewCardProps) {
  const perLabel = product.per === 'serving' ? t.perServing : t.per100g

  return (
    <div className="card flex flex-col gap-4 p-5">
      <div className="flex items-start justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-beige px-3 py-1 text-[11px] font-bold text-ink-700">
          <Icon name="AlertTriangle" className="h-3.5 w-3.5" />
          {t.statusLabels[product.status as keyof typeof t.statusLabels] ?? product.status}
        </span>
        <span className="text-[11px] text-ink-400">
          {t.barcodeLabel}: {product.barcode}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <PhotoBox label={t.productPhoto} noPhoto={t.noPhoto} url={product.imageUrl} />
        <PhotoBox label={t.nutritionPhoto} noPhoto={t.noPhoto} url={product.nutritionImageUrl} />
      </div>

      {isEditing && form ? (
        <div className="flex flex-col gap-2">
          <Field label={t.nameFieldLabel} value={form.name} onChange={(v) => onChangeForm({ ...form, name: v })} />
          <Field label={t.brandLabel} value={form.brand} onChange={(v) => onChangeForm({ ...form, brand: v })} />
          <Field
            label={t.servingLabel}
            value={form.servingSize}
            onChange={(v) => onChangeForm({ ...form, servingSize: v })}
          />
          <div className="grid grid-cols-2 gap-2">
            <Field
              label={`${t.caloriesLabel} (${perLabel})`}
              value={form.kcal}
              onChange={(v) => onChangeForm({ ...form, kcal: v })}
              numeric
            />
            <Field
              label={`${t.proteinLabel} (${perLabel})`}
              value={form.protein}
              onChange={(v) => onChangeForm({ ...form, protein: v })}
              numeric
            />
            <Field
              label={`${t.carbsLabel} (${perLabel})`}
              value={form.carbs}
              onChange={(v) => onChangeForm({ ...form, carbs: v })}
              numeric
            />
            <Field
              label={`${t.fatLabel} (${perLabel})`}
              value={form.fat}
              onChange={(v) => onChangeForm({ ...form, fat: v })}
              numeric
            />
          </div>
          <div className="mt-2 flex gap-2">
            <button type="button" onClick={onSaveEdit} className="btn-primary flex-1 justify-center py-2 text-xs">
              <Icon name="Save" className="h-4 w-4" />
              {t.save}
            </button>
            <button type="button" onClick={onCancelEdit} className="btn-ghost flex-1 justify-center py-2 text-xs">
              {t.cancel}
            </button>
          </div>
        </div>
      ) : (
        <>
          <div>
            <p className="text-sm font-black text-ink-900">{product.name}</p>
            {product.brand && <p className="text-xs text-ink-500">{product.brand}</p>}
            {product.servingSize && (
              <p className="text-xs text-ink-400">
                {t.servingLabel}: {product.servingSize}
              </p>
            )}
          </div>
          <div className="grid grid-cols-4 gap-2 rounded-xl border border-line bg-beige/50 p-3 text-center">
            <Macro label={t.caloriesLabel} value={product.kcal} />
            <Macro label={t.proteinLabel} value={product.protein} />
            <Macro label={t.carbsLabel} value={product.carbs} />
            <Macro label={t.fatLabel} value={product.fat} />
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onApprove} className="btn-primary flex-1 justify-center py-2 text-xs">
              <Icon name="CheckCircle2" className="h-4 w-4" />
              {t.approve}
            </button>
            <button type="button" onClick={onStartEdit} className="btn-ghost flex-1 justify-center py-2 text-xs">
              <Icon name="Edit3" className="h-4 w-4" />
              {t.edit}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

function PhotoBox({ label, noPhoto, url }: { label: string; noPhoto: string; url?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-bold text-ink-500">{label}</span>
      {url ? (
        <img src={url} alt={label} className="aspect-square w-full rounded-xl border border-line object-cover" />
      ) : (
        <div className="flex aspect-square w-full flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-line bg-beige/40 text-ink-400">
          <Icon name="ImageOff" className="h-5 w-5" />
          <span className="text-[10px]">{noPhoto}</span>
        </div>
      )}
    </div>
  )
}

function Macro({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-sm font-black text-ink-900">{value}</p>
      <p className="text-[10px] text-ink-500">{label}</p>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  numeric,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  numeric?: boolean
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-bold text-ink-500">{label}</span>
      <input
        type={numeric ? 'number' : 'text'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60"
      />
    </label>
  )
}
