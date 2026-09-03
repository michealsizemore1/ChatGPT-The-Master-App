import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata={
 title:'Saturday Top 25 | College Football Dashboard',
 description:'Scores, rankings, stats and game-day metrics for college football’s Top 25 teams.',
 openGraph:{title:'Saturday Top 25',description:'Scores. Rankings. The playoff picture.',images:['/og.png']},
 twitter:{card:'summary_large_image',title:'Saturday Top 25',description:'Scores. Rankings. The playoff picture.',images:['/og.png']}
};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="en"><body>{children}</body></html>}
