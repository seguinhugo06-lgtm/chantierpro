/**
 * MarketingLayout — le cadre des sous-pages du site (/fonctionnalites, /fonctionnalites/:slug, /ressources) : la barre
 * du site (bouton « Connexion »), le contenu, le pied de page. Toujours en clair, palette `marque`, comme l'accueil.
 *
 * `MotionConfig reducedMotion="user"` : les animations framer-motion s'effacent si l'appareil demande moins de
 * mouvement. `pt-16` : la place de la barre fixe.
 */
import { MotionConfig } from 'framer-motion';
import LandingNav from './LandingNav';
import FooterSection from './FooterSection';

export default function MarketingLayout({ children }) {
  // L'app ouvre directement le formulaire à ces adresses (avant : « /app », qui menait à l'accueil)
  const connexion = () => { window.location.href = '/connexion'; };
  const inscription = () => { window.location.href = '/inscription'; };

  return (
    <div className="min-h-screen overflow-x-clip bg-white" style={{ scrollBehavior: 'smooth' }}>
      <LandingNav onLogin={connexion} onSignup={inscription} />
      <MotionConfig reducedMotion="user">
        <main className="pt-16">{children}</main>
      </MotionConfig>
      <FooterSection />
    </div>
  );
}
