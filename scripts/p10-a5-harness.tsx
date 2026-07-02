/* eslint-disable react-refresh/only-export-components */
// حزمة إثبات P10 A5 — تُركّب مكوّن «مهام اليوم» الحقيقي (TodoWidget) وهوك useTodos
// الحقيقي في متصفح فعلي، لتقود Playwright تدفّق الإضافة/الإنجاز/الحذف/إعادة التحميل
// + عزل الحسابات + قاعدة التدوير. لا كود اختباري في الحزمة المنشورة.
import { createRoot } from 'react-dom/client'
import { useState } from 'react'
import { TodoWidget } from '@/features/todo/TodoWidget'
import { useTodos } from '@/features/todo/useTodos'

// مسبار للهوك الحقيقي بمعرّف حساب قابل للتبديل — لإثبات العزل لكل حساب.
function HookProbe() {
  const [owner, setOwner] = useState<'A' | 'B'>('A')
  const t = useTodos(owner === 'A' ? 'account-A' : 'account-B')
  return (
    <div>
      <button data-testid="probe-switch" onClick={() => setOwner((o) => (o === 'A' ? 'B' : 'A'))}>
        {owner}
      </button>
      <span data-testid="probe-owner">{owner}</span>
      <button data-testid="probe-add" onClick={() => t.add(`مهمة الحساب ${owner}`)}>
        add
      </button>
      <span data-testid="probe-count">{t.items.length}</span>
      <ul data-testid="probe-list">
        {t.items.map((it) => (
          <li key={it.id}>{it.text}</li>
        ))}
      </ul>
    </div>
  )
}

function App() {
  return (
    <div dir="rtl" style={{ maxWidth: 420, margin: '0 auto', padding: 16 }}>
      <div data-testid="widget-host">
        <TodoWidget lang="ar" />
      </div>
      <div data-testid="probe-host" style={{ marginTop: 24 }}>
        <HookProbe />
      </div>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(<App />)
