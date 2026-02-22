import { CheckCircle, Phone, Instagram, Facebook, Clock, CalendarCheck, MessageCircle } from 'lucide-react'

export default function ThankYouPage() {
  return (
    <div className="min-h-screen bg-[#FAFAFA]">

      {/* Nav */}
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-5 h-16 flex items-center justify-center">
          <img src="/rehabvet-logo.jpg" alt="RehabVet" className="h-9 object-contain" />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-5 py-14 text-center">

        {/* Success icon */}
        <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-10 h-10 text-green-500" />
        </div>

        <h1 className="text-3xl lg:text-4xl font-extrabold text-gray-900 mb-3">
          You're all set! 🐾
        </h1>
        <p className="text-gray-500 text-lg mb-10 max-w-md mx-auto leading-relaxed">
          We've received your appointment request. Our team will be in touch within <strong className="text-gray-800">1 business day</strong> to confirm your slot.
        </p>

        {/* What happens next */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-8 text-left">
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-5 text-center">What happens next</h2>
          <div className="space-y-5">
            {[
              {
                icon: MessageCircle,
                color: 'bg-[#EC6496]/10 text-[#EC6496]',
                title: 'We review your request',
                desc: 'Our team will go through your pet\'s details and find the best therapist and time slot for you.',
                time: 'Within 1 business day',
              },
              {
                icon: CalendarCheck,
                color: 'bg-blue-50 text-blue-500',
                title: 'Confirmation call or message',
                desc: 'We\'ll reach out via phone or WhatsApp to confirm your appointment date and time.',
                time: 'After review',
              },
              {
                icon: Clock,
                color: 'bg-[#FDC61C]/20 text-yellow-600',
                title: 'Come in for your assessment',
                desc: 'Bring any previous vet reports or X-rays if you have them. Our therapists will take it from there.',
                time: 'On appointment day',
              },
            ].map(({ icon: Icon, color, title, desc, time }) => (
              <div key={title} className="flex gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <p className="font-semibold text-gray-900 text-sm">{title}</p>
                    <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full whitespace-nowrap">{time}</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Contact card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-8">
          <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Need to reach us sooner?</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a href="tel:62916881"
              className="flex items-center justify-center gap-2 bg-[#EC6496] hover:bg-[#c94878] text-white font-semibold text-sm px-6 py-3 rounded-xl transition-colors">
              <Phone className="w-4 h-4" /> Call 6291 6881
            </a>
            <a href="https://wa.me/6587987554" target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white font-semibold text-sm px-6 py-3 rounded-xl transition-colors">
              <MessageCircle className="w-4 h-4" /> WhatsApp Us
            </a>
          </div>
        </div>

        {/* Social follow */}
        <div className="mb-10">
          <p className="text-sm text-gray-400 mb-4">Follow us for pet health tips & patient success stories</p>
          <div className="flex items-center justify-center gap-3">
            <a href="https://www.instagram.com/rehabvet_sg/" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 bg-white border border-gray-200 hover:border-pink-300 text-gray-600 hover:text-pink-500 font-medium text-sm px-4 py-2.5 rounded-xl transition-colors shadow-sm">
              <Instagram className="w-4 h-4" /> @rehabvet_sg
            </a>
            <a href="https://www.facebook.com/rehabvet.sg" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 bg-white border border-gray-200 hover:border-blue-300 text-gray-600 hover:text-blue-500 font-medium text-sm px-4 py-2.5 rounded-xl transition-colors shadow-sm">
              <Facebook className="w-4 h-4" /> RehabVet SG
            </a>
          </div>
        </div>

        {/* Address */}
        <p className="text-xs text-gray-400 leading-relaxed">
          RehabVet Clinic · 513 Serangoon Rd, #01-01, Singapore 218154<br />
          Mon–Fri 9am–6pm · Sat–Sun 9am–1pm
        </p>

      </main>
    </div>
  )
}
