import React, { useState } from 'react';
import {
  Button,
  IconButton,
  Card,
  CardHeader,
  CardContent,
  CardFooter,
  Badge,
  Input,
  Textarea,
  Select,
  Switch,
  Checkbox,
  Radio,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Tooltip,
  Alert,
  Progress,
  Skeleton,
  Avatar,
} from './ui';
import { Plus, ArrowRight, Trash2, Check, Edit, Settings, X, Copy, Download, Upload, Search, Filter, MoreVertical, Mail, User, Lock, Info } from 'lucide-react';

export default function DesignSystemDemo() {
  // State for interactive components
  const [switchValue, setSwitchValue] = useState(false);
  const [checkbox1, setCheckbox1] = useState(false);
  const [checkbox2, setCheckbox2] = useState(true);
  const [radioValue, setRadioValue] = useState('option1');
  const [inputValue, setInputValue] = useState('');
  const [selectValue, setSelectValue] = useState('');

  return (
    <div className="p-8 space-y-12 bg-gray-50 dark:bg-slate-900 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          ChantierPro Design System
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          Composants UI de base pour l'application
        </p>

        {/* BUTTONS */}
        <section className="space-y-6 mb-12">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 border-b border-gray-200 dark:border-slate-700 pb-2">
            Buttons
          </h2>

          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Variants
            </h3>
            <div className="flex flex-wrap gap-4">
              <Button variant="primary">Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="danger">Danger</Button>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Sizes
            </h3>
            <div className="flex items-center gap-4">
              <Button size="sm">Small</Button>
              <Button size="md">Medium</Button>
              <Button size="lg">Large</Button>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              With Icons
            </h3>
            <div className="flex flex-wrap gap-4">
              <Button leftIcon={<Plus className="h-4 w-4" />}>Nouveau</Button>
              <Button rightIcon={<ArrowRight className="h-4 w-4" />}>Suivant</Button>
              <Button variant="danger" leftIcon={<Trash2 className="h-4 w-4" />}>Supprimer</Button>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              States & Icon Buttons
            </h3>
            <div className="flex flex-wrap items-center gap-4">
              <Button isLoading>Loading</Button>
              <Button disabled>Disabled</Button>
              <IconButton size="sm"><Edit className="h-4 w-4" /></IconButton>
              <IconButton variant="primary"><Plus className="h-5 w-5" /></IconButton>
              <IconButton variant="danger"><Trash2 className="h-5 w-5" /></IconButton>
            </div>
          </div>
        </section>

        {/* FORM COMPONENTS */}
        <section className="space-y-6 mb-12">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 border-b border-gray-200 dark:border-slate-700 pb-2">
            Form Components
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <Input
                label="Email"
                placeholder="votre@email.com"
                leftIcon={Mail}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
              />
              <Input
                label="Mot de passe"
                type="password"
                placeholder="Entrez votre mot de passe"
                leftIcon={Lock}
              />
              <Input
                label="Avec erreur"
                error="Ce champ est requis"
                placeholder="Champ invalide"
              />
              <Input
                label="Succes"
                success
                value="Valide"
                readOnly
              />
            </div>

            <div className="space-y-4">
              <Select
                label="Type de projet"
                placeholder="Choisir..."
                value={selectValue}
                onChange={(e) => setSelectValue(e.target.value)}
                options={[
                  { value: 'renovation', label: 'Renovation' },
                  { value: 'construction', label: 'Construction neuve' },
                  { value: 'extension', label: 'Extension' },
                  { value: 'amenagement', label: 'Amenagement' },
                ]}
              />
              <Textarea
                label="Description"
                placeholder="Decrivez votre projet..."
                rows={3}
              />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Switch, Checkbox & Radio
            </h3>
            <div className="flex flex-wrap gap-8">
              <div className="space-y-3">
                <Switch
                  checked={switchValue}
                  onCheckedChange={setSwitchValue}
                  label="Notifications"
                  description="Recevoir les alertes"
                />
                <Switch checked disabled label="Desactive" />
              </div>

              <div className="space-y-3">
                <Checkbox
                  checked={checkbox1}
                  onCheckedChange={setCheckbox1}
                  label="Option 1"
                />
                <Checkbox
                  checked={checkbox2}
                  onCheckedChange={setCheckbox2}
                  label="Option 2"
                  description="Avec description"
                />
                <Checkbox indeterminate label="Indeterminate" />
              </div>

              <div className="space-y-3">
                <Radio
                  checked={radioValue === 'option1'}
                  onCheckedChange={() => setRadioValue('option1')}
                  name="demo-radio"
                  value="option1"
                  label="Radio 1"
                />
                <Radio
                  checked={radioValue === 'option2'}
                  onCheckedChange={() => setRadioValue('option2')}
                  name="demo-radio"
                  value="option2"
                  label="Radio 2"
                />
              </div>
            </div>
          </div>
        </section>

        {/* BADGES */}
        <section className="space-y-6 mb-12">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 border-b border-gray-200 dark:border-slate-700 pb-2">
            Badges
          </h2>

          <div className="flex flex-wrap gap-3">
            <Badge>Default</Badge>
            <Badge variant="success">Paye</Badge>
            <Badge variant="warning">En attente</Badge>
            <Badge variant="danger">En retard</Badge>
            <Badge variant="info">Info</Badge>
            <Badge dot variant="success">Actif</Badge>
            <Badge dot variant="warning">En cours</Badge>
            <Badge pill={false} variant="success">Rectangle</Badge>
          </div>
        </section>

        {/* TABS */}
        <section className="space-y-6 mb-12">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 border-b border-gray-200 dark:border-slate-700 pb-2">
            Tabs
          </h2>

          <Tabs defaultValue="details">
            <TabsList>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="factures">Factures</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
              <TabsTrigger value="historique">Historique</TabsTrigger>
            </TabsList>
            <TabsContent value="details">
              <Card padding="md">
                <p className="text-gray-600 dark:text-gray-400">
                  Contenu de l'onglet Details. Les informations principales du chantier.
                </p>
              </Card>
            </TabsContent>
            <TabsContent value="factures">
              <Card padding="md">
                <p className="text-gray-600 dark:text-gray-400">
                  Liste des factures associees au chantier.
                </p>
              </Card>
            </TabsContent>
            <TabsContent value="documents">
              <Card padding="md">
                <p className="text-gray-600 dark:text-gray-400">
                  Documents et pieces jointes.
                </p>
              </Card>
            </TabsContent>
            <TabsContent value="historique">
              <Card padding="md">
                <p className="text-gray-600 dark:text-gray-400">
                  Historique des modifications et evenements.
                </p>
              </Card>
            </TabsContent>
          </Tabs>
        </section>

        {/* TOOLTIPS */}
        <section className="space-y-6 mb-12">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 border-b border-gray-200 dark:border-slate-700 pb-2">
            Tooltips
          </h2>

          <div className="flex flex-wrap gap-6">
            <Tooltip content="Tooltip en haut" side="top">
              <Button variant="outline">Haut</Button>
            </Tooltip>
            <Tooltip content="Tooltip en bas" side="bottom">
              <Button variant="outline">Bas</Button>
            </Tooltip>
            <Tooltip content="Tooltip a gauche" side="left">
              <Button variant="outline">Gauche</Button>
            </Tooltip>
            <Tooltip content="Tooltip a droite" side="right">
              <Button variant="outline">Droite</Button>
            </Tooltip>
            <Tooltip content="Cliquer pour plus d'infos">
              <IconButton><Info className="h-5 w-5" /></IconButton>
            </Tooltip>
          </div>
        </section>

        {/* ALERTS */}
        <section className="space-y-6 mb-12">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 border-b border-gray-200 dark:border-slate-700 pb-2">
            Alerts
          </h2>

          <div className="space-y-4">
            <Alert variant="info" title="Information">
              Votre devis a été envoyé ✓
            </Alert>
            <Alert variant="success" title="Succès">
              Paiement reçu de 1 500 EUR.
            </Alert>
            <Alert variant="warning" title="Attention" dismissible>
              Cette facture arrive à échéance dans 3 jours.
            </Alert>
            <Alert variant="danger" title="Erreur">
              Impossible de générer le PDF. Veuillez réessayer.
            </Alert>
          </div>
        </section>

        {/* PROGRESS & LOADING */}
        <section className="space-y-6 mb-12">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 border-b border-gray-200 dark:border-slate-700 pb-2">
            Progress & Loading
          </h2>

          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Progression</span>
                <span className="font-medium text-gray-900 dark:text-white">65%</span>
              </div>
              <Progress value={65} />
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Skeleton Loading
              </h3>
              <div className="flex items-center gap-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CARDS */}
        <section className="space-y-6 mb-12">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 border-b border-gray-200 dark:border-slate-700 pb-2">
            Cards
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader title="Card Default" description="With header and footer" />
              <CardContent>
                <p className="text-gray-600 dark:text-gray-400">Contenu de la card.</p>
              </CardContent>
              <CardFooter>
                <Button size="sm">Action</Button>
              </CardFooter>
            </Card>

            <Card variant="elevated" hoverable>
              <CardHeader
                title="Card Elevated"
                action={<Badge variant="success">Actif</Badge>}
              />
              <CardContent>
                <p className="text-gray-600 dark:text-gray-400">Hover pour voir l'effet.</p>
              </CardContent>
            </Card>

            <Card variant="outlined" padding="md">
              <div className="flex items-center gap-4">
                <Avatar name="Jean Dupont" size="lg" />
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">Jean Dupont</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Client depuis 2023</p>
                </div>
              </div>
            </Card>
          </div>
        </section>

        {/* COLOR PALETTE */}
        <section className="space-y-6">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 border-b border-gray-200 dark:border-slate-700 pb-2">
            Color Palette
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { name: 'Primary', colors: ['bg-primary-500', 'bg-primary-600', 'bg-primary-100'] },
              { name: 'Success', colors: ['bg-success-500', 'bg-success-600', 'bg-success-50'] },
              { name: 'Warning', colors: ['bg-warning-500', 'bg-warning-600', 'bg-warning-50'] },
              { name: 'Danger', colors: ['bg-danger-500', 'bg-danger-600', 'bg-danger-50'] },
              { name: 'Gray', colors: ['bg-gray-500', 'bg-gray-700', 'bg-gray-100'] },
            ].map((palette) => (
              <div key={palette.name} className="space-y-2">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{palette.name}</p>
                <div className="space-y-1">
                  {palette.colors.map((color, i) => (
                    <div key={color} className={`h-8 rounded ${color} flex items-center justify-center text-xs ${i < 2 ? 'text-white' : 'text-gray-700'}`}>
                      {color.replace('bg-', '')}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
