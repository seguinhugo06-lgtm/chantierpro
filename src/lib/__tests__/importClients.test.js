import { describe, it, expect } from 'vitest';
import { parseCSV, autoMapColumns } from '../../components/ImportModal';

const CHAMPS = [
  { key: 'nom', label: 'Nom' }, { key: 'prenom', label: 'Prénom' }, { key: 'email', label: 'Email' },
  { key: 'telephone', label: 'Téléphone' }, { key: 'adresse', label: 'Adresse' }, { key: 'entreprise', label: 'Entreprise' },
];

describe('import de clients (recette du 9 oct. 2026)', () => {
  it('export Excel français : la virgule d\'une adresse ne coupe plus la colonne', () => {
    const lignes = parseCSV('Nom;Prénom;Adresse;Entreprise\r\nMoulin;Anne;3 rue Neuve, 31000 Toulouse;\r\n');
    expect(lignes[0]).toEqual(['Nom', 'Prénom', 'Adresse', 'Entreprise']);
    expect(lignes[1]).toEqual(['Moulin', 'Anne', '3 rue Neuve, 31000 Toulouse', '']);
  });

  it('« Prénom » va dans prénom, « Nom » dans nom, et les synonymes sont reconnus', () => {
    const m = autoMapColumns(['Prénom', 'Nom', 'Portable', 'Courriel', 'Société'], CHAMPS);
    expect(m).toEqual({ 0: 'prenom', 1: 'nom', 2: 'telephone', 3: 'email', 4: 'entreprise' });
  });
});
