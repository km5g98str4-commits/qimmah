import { useState } from 'react'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { Hero } from '@/sections/Hero'
import { Problem } from '@/sections/Problem'
import { Solution } from '@/sections/Solution'
import { Dashboard } from '@/sections/Dashboard'
import { WorkoutTracker } from '@/sections/WorkoutTracker'
import { Supplements } from '@/sections/Supplements'
import { Meals } from '@/sections/Meals'
import { BodyMetrics } from '@/sections/BodyMetrics'
import { WeeklyRoutine } from '@/sections/WeeklyRoutine'
import { Benefits } from '@/sections/Benefits'
import { Audience } from '@/sections/Audience'
import { Customization } from '@/sections/Customization'
import { Pricing } from '@/sections/Pricing'
import { Faq } from '@/sections/Faq'
import { FinalCta } from '@/sections/FinalCta'
import { CustomizationCenter } from '@/sections/CustomizationCenter'
import { Icon } from '@/components/Icon'

type View = 'landing' | 'customize'

/** الصفحة الرئيسية — تركّب الأقسام بترتيب تجاري، مع تبديل لمركز التخصيص. */
export default function App() {
  const [view, setView] = useState<View>('landing')

  if (view === 'customize') {
    return <CustomizationCenter onBack={() => setView('landing')} />
  }

  return (
    <div className="min-h-screen bg-ink-950">
      <Header />
      <main>
        <Hero />
        <Problem />
        <Solution />
        <Dashboard />
        <WorkoutTracker />
        <Supplements />
        <Meals />
        <BodyMetrics />
        <WeeklyRoutine />
        <Benefits />
        <Audience />
        <Customization onOpenCenter={() => setView('customize')} />
        <Pricing />
        <Faq />
        <FinalCta />
      </main>
      <Footer />

      {/* زر عائم لفتح مركز التخصيص */}
      <button
        type="button"
        onClick={() => setView('customize')}
        className="btn-primary fixed bottom-5 start-5 z-40 shadow-glow"
        aria-label="افتح مركز التخصيص"
      >
        <Icon name="Palette" className="h-4 w-4" />
        <span className="hidden sm:inline">مركز التخصيص</span>
      </button>
    </div>
  )
}
