import type { Metadata } from 'next';
export const metadata: Metadata={title:'Home Display — Morning Brief',description:'Meteo, calendari e notizie per il tuo quadro.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="it"><body>{children}</body></html>;}
