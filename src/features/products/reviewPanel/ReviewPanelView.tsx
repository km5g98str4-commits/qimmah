import { useState } from 'react'
import { Icon } from '@/components/Icon'
import { Footer } from '@/components/Footer'
import type { Lang } from '@/lib/appPreferences'
import type { ProductRecord } from '@/types'
import { appendAudit, listByStatus, upsert } from './productDb'
import { reviewPanelStrings } from './strings'

interface ReviewPanelViewProps {
  lang: Lang
  onBack: () => void
}

const REVIEW_STATUSES: ProductRecord['status'][] = ['pending_review', 'user_submitted', 'needs_fix']

interface EditForm {
  name: string
  brand: string
  servingSize: string
  caloriesPer100g: string
  proteinPer100g: string
  carbsPer100g: string
  fatPer100g: string
}

function toForm(p: ProductRecord): EditForm {
  return {
    name: p.name,
    brand: p.brand ?? '',
    servingSize: p.servingSize ?? '',
    caloriesPer100g: String(p.nutrition.caloriesPer100g),
    proteinPer100g: String(p.nutrition.proteinPer100g),
    carbsPer100g: String(p.nutrition.carbsPer100g),
    fatPer100g: String(p.nutrition.fatPer100g),
  }
}

function fromForm(p: ProductRecord, form: EditForm): ProductRecord {
  return {
    ...p,
    name: form.name.trim() || p.name,
    brand: form.brand.trim() || undefined,
    servingSize: form.servingSize.trim() || undefined,
    nutrition: {
      caloriesPer100g: Number(form.caloriesPer100g) || 0,
      proteinPer100g: Number(form.proteinPer100g) || 0,
      carbsPer100g: Number(form.carbsPer100g) || 0,
      fatPer100g: Number(form.fatPer100g) || 0,
    },
  }
}

/**
 * شاشة داخلية لمراجعة المنتجات (باركود/OCR/يدوي) قبل اعتمادها في قاعدة البيانات.
 * ليست جزءًا من تنقّل المستخدم العادي — تُفتح من مدخل مطوّر في الإعدادات.
 */
export function ReviewPanelView({ lang, onBack }: ReviewPanelViewProps) {
  const t = reviewPanelStrings[lang]
  const [products, setProducts] = useState<ProductRecord[]>(() => listByStatus(REVIEW_STATUSES))
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<EditForm | null>(null)

  const refresh = () => setProducts(listByStatus(REVIEW_STATUSES))

  const startEdit = (p: ProductRecord) => {
    setEditingId(p.id)
    setForm(toForm(p))
  }

  const cancelEdit = () => {
    setEditingId(null)
    setForm(null)
  }

  const approve = (p: ProductRecord) => {
    const before = p
    const after = { ...p, status: 'verified' as const }
    upsert(after)
    appendAudit({ productId: p.id, action: 'approved', before, after })
    refresh()
  }

  const saveEdit = (p: ProductRecord) => {
    if (!form) return
    const before = p
    // منتج كان "يحتاج تصحيح" وتمّ تعديله يعود لقائمة الانتظار العادية ليُراجَع من جديد.
    const nextStatus = p.status === 'needs_fix' ? 'pending_review' : p.status
    const after = { ...fromForm(p, form), status: nextStatus }
    upsert(after)
    appendAudit({ productId: p.id, action: 'edited', before, after })
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
                key={p.id}
                product={p}
                t={t}
                isEditing={editingId === p.id}
                form={editingId === p.id ? form : null}
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
  product: ProductRecord
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
  return (
    <div className="card flex flex-col gap-4 p-5">
      <div className="flex items-start justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-beige px-3 py-1 text-[11px] font-bold text-ink-700">
          <Icon name="AlertTriangle" className="h-3.5 w-3.5" />
          {t.statusLabels[product.status as keyof typeof t.statusLabels] ?? product.status}
        </span>
        {product.barcode && <span className="text-[11px] text-ink-400">{t.barcodeLabel}: {product.barcode}</span>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <PhotoBox label={t.productPhoto} noPhoto={t.noPhoto} url={product.productPhotoUrl} />
        <PhotoBox label={t.nutritionPhoto} noPhoto={t.noPhoto} url={product.nutritionPhotoUrl} />
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
              label={`${t.caloriesLabel} (${t.per100g})`}
              value={form.caloriesPer100g}
              onChange={(v) => onChangeForm({ ...form, caloriesPer100g: v })}
              numeric
            />
            <Field
              label={`${t.proteinLabel} (${t.per100g})`}
              value={form.proteinPer100g}
              onChange={(v) => onChangeForm({ ...form, proteinPer100g: v })}
              numeric
            />
            <Field
              label={`${t.carbsLabel} (${t.per100g})`}
              value={form.carbsPer100g}
              onChange={(v) => onChangeForm({ ...form, carbsPer100g: v })}
              numeric
            />
            <Field
              label={`${t.fatLabel} (${t.per100g})`}
              value={form.fatPer100g}
              onChange={(v) => onChangeForm({ ...form, fatPer100g: v })}
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
            <Macro label={t.caloriesLabel} value={product.nutrition.caloriesPer100g} />
            <Macro label={t.proteinLabel} value={product.nutrition.proteinPer100g} />
            <Macro label={t.carbsLabel} value={product.nutrition.carbsPer100g} />
            <Macro label={t.fatLabel} value={product.nutrition.fatPer100g} />
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
