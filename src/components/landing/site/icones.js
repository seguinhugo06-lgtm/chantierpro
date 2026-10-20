import {
  BellRing, Building2, CalendarDays, FileText, HardHat, Home, Package, PenLine, Receipt, Smartphone, Users, Wallet,
} from 'lucide-react';

/** Les icônes des pages de fonctionnalités, par clé (`icone` dans featuresContent.js). */
export const ICONES = {
  accueil: Home,
  devis: FileText,
  catalogue: Package,
  signature: PenLine,
  chantier: Building2,
  planning: CalendarDays,
  clients: Users,
  equipe: HardHat,
  tresorerie: Wallet,
  relances: BellRing,
  facture: Receipt,
  telephone: Smartphone,
};

export default ICONES;
