import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { Hero } from '@/sections/Hero'
import { Dashboard } from '@/sections/Dashboard'
import { WorkoutTracker } from '@/sections/WorkoutTracker'
import { Supplements } from '@/sections/Supplements'
import { Meals } from '@/sections/Meals'
import { BodyMetrics } from '@/sections/BodyMetrics'
import { WeeklyRoutine } from '@/sections/WeeklyRoutine'
import { Customization } from '@/sections/Customization'
import { Pricing } from '@/sections/Pricing'

/** الصفحة الرئيسية — تركّب الأقسام بالترتيب. */
export default function App() {
  return (
    <div className="min-h-screen bg-ink-950">
      <Header />
      <main>
        <Hero />
        <Dashboard />
        <WorkoutTracker />
        <Supplements />
        <Meals />
        <BodyMetrics />
        <WeeklyRoutine />
        <Customization />
        <Pricing />
      </main>
      <Footer />
    </div>
  )
}
