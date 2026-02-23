import type { Metadata } from 'next'
import Script from 'next/script'

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
  return (
    <>
      {/* ── Google Tag Manager ── */}
      <Script id="gtm-head" strategy="afterInteractive">
        {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
        new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
        j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
        'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
        })(window,document,'script','dataLayer','GTM-PG6SPGZR');`}
      </Script>

      {/* ── Google Analytics GA4 ── */}
      <Script
        src="https://www.googletagmanager.com/gtag/js?id=G-82DL2X47WS"
        strategy="afterInteractive"
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', 'G-82DL2X47WS');`}
      </Script>

      {/* ── Meta Pixel ── */}
      <Script id="meta-pixel" strategy="afterInteractive">
        {`!function(f,b,e,v,n,t,s)
        {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};
        if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
        n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t,s)}(window, document,'script',
        'https://connect.facebook.net/en_US/fbevents.js');
        fbq('init', '299255174340345');
        fbq('track', 'PageView');`}
      </Script>
      {/* Meta Pixel noscript fallback */}
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          height="1"
          width="1"
          style={{ display: 'none' }}
          src="https://www.facebook.com/tr?id=299255174340345&ev=PageView&noscript=1"
          alt=""
        />
      </noscript>

      {/* GTM noscript fallback */}
      <noscript>
        <iframe
          src="https://www.googletagmanager.com/ns.html?id=GTM-PG6SPGZR"
          height="0"
          width="0"
          style={{ display: 'none', visibility: 'hidden' }}
        />
      </noscript>

      {children}
    </>
  )
}
