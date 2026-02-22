import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Book a Rehabilitation Assessment | RehabVet Singapore',
  description: 'Book a veterinary rehabilitation assessment for your pet at RehabVet — Singapore\'s first animal rehab clinic. Proven steps to pain-free mobility for dogs and cats. Rated 4.8★ by 193+ pet owners.',
  openGraph: {
    title: 'Book a Rehabilitation Assessment | RehabVet Singapore',
    description: 'Personalised physiotherapy, hydrotherapy and rehabilitation plans for dogs and cats. Book your free assessment today.',
    url: 'https://app.rehabvet.com/appointment',
    siteName: 'RehabVet',
    images: [
      {
        url: 'https://rehabvet.com/wp-content/uploads/2023/01/rehabvet-og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'RehabVet – Singapore\'s First Veterinary Rehabilitation Clinic',
      },
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Book a Rehabilitation Assessment | RehabVet Singapore',
    description: 'Proven steps to pain-free mobility for your pet. Book your assessment with Singapore\'s first vet rehab clinic.',
  },
  alternates: {
    canonical: 'https://app.rehabvet.com/appointment',
  },
}

export default function AppointmentLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
