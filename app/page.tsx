import Nav             from '@/components/layout/Nav'
import Footer          from '@/components/layout/Footer'
import Hero            from '@/components/landing/Hero'
import Ticker          from '@/components/landing/Ticker'
import ProblemSection  from '@/components/landing/ProblemSection'
import HowItWorks      from '@/components/landing/HowItWorks'
import FeaturesGrid    from '@/components/landing/FeaturesGrid'
import StatsBar        from '@/components/landing/StatsBar'
import TenantSection   from '@/components/landing/TenantSection'
import ChatbotSection  from '@/components/landing/ChatbotSection'
import Pricing         from '@/components/landing/Pricing'
import Testimonials    from '@/components/landing/Testimonials'
import FinalCTA        from '@/components/landing/FinalCTA'
import ScrollAnimator  from '@/components/ScrollAnimator'

export default function Home() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Ticker />
        <ProblemSection />
        <HowItWorks />
        <FeaturesGrid />
        <StatsBar />
        <TenantSection />
        <ChatbotSection />
        <Pricing />
        <Testimonials />
        <FinalCTA />
      </main>
      <Footer />
      <ScrollAnimator />
    </>
  )
}
