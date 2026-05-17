// Plan Comptable General francais (selection essentielle pour un ERP)
// type: ASSET (actif) / LIABILITY (passif) / EQUITY / EXPENSE / REVENUE

export type PcgAccount = {
  number: string;
  label: string;
  type: "ASSET" | "LIABILITY" | "EQUITY" | "EXPENSE" | "REVENUE";
  parent?: string;
};

export const PCG_FR: PcgAccount[] = [
  // Classe 1 - Capitaux (Passif + Capitaux propres)
  { number: "1", label: "Capitaux", type: "EQUITY" },
  { number: "101", label: "Capital", type: "EQUITY", parent: "1" },
  { number: "106", label: "Reserves", type: "EQUITY", parent: "1" },
  { number: "12", label: "Resultat de l'exercice", type: "EQUITY", parent: "1" },
  { number: "164", label: "Emprunts aupres d'etablissements de credit", type: "LIABILITY", parent: "1" },

  // Classe 2 - Immobilisations (Actif)
  { number: "2", label: "Immobilisations", type: "ASSET" },
  { number: "205", label: "Concessions, brevets, licences", type: "ASSET", parent: "2" },
  { number: "213", label: "Constructions", type: "ASSET", parent: "2" },
  { number: "2154", label: "Materiel industriel", type: "ASSET", parent: "2" },
  { number: "2183", label: "Materiel de bureau et informatique", type: "ASSET", parent: "2" },

  // Classe 3 - Stocks (Actif)
  { number: "3", label: "Stocks", type: "ASSET" },
  { number: "31", label: "Matieres premieres et composants", type: "ASSET", parent: "3" },
  { number: "33", label: "En-cours de production", type: "ASSET", parent: "3" },
  { number: "35", label: "Stocks de produits finis", type: "ASSET", parent: "3" },

  // Classe 4 - Tiers
  { number: "4", label: "Tiers", type: "ASSET" },
  { number: "401", label: "Fournisseurs", type: "LIABILITY", parent: "4" },
  { number: "4011", label: "Fournisseurs - Achats de biens", type: "LIABILITY", parent: "401" },
  { number: "411", label: "Clients", type: "ASSET", parent: "4" },
  { number: "4111", label: "Clients - Ventes de biens", type: "ASSET", parent: "411" },
  { number: "419", label: "Clients crediteurs", type: "LIABILITY", parent: "4" },
  { number: "421", label: "Personnel - Remunerations dues", type: "LIABILITY", parent: "4" },
  { number: "431", label: "Securite sociale", type: "LIABILITY", parent: "4" },
  { number: "445", label: "Etat - Taxes sur le chiffre d'affaires", type: "LIABILITY", parent: "4" },
  { number: "44566", label: "TVA deductible sur autres biens et services", type: "ASSET", parent: "445" },
  { number: "44562", label: "TVA deductible sur immobilisations", type: "ASSET", parent: "445" },
  { number: "44571", label: "TVA collectee", type: "LIABILITY", parent: "445" },
  { number: "44551", label: "TVA a decaisser", type: "LIABILITY", parent: "445" },
  { number: "4456", label: "TVA deductible", type: "ASSET", parent: "445" },
  { number: "44567", label: "Credit de TVA a reporter", type: "ASSET", parent: "445" },
  { number: "4457", label: "TVA collectee - a reverser", type: "LIABILITY", parent: "445" },

  // Classe 5 - Financiers
  { number: "5", label: "Financiers", type: "ASSET" },
  { number: "512", label: "Banques", type: "ASSET", parent: "5" },
  { number: "530", label: "Caisse", type: "ASSET", parent: "5" },

  // Classe 6 - Charges
  { number: "6", label: "Charges", type: "EXPENSE" },
  { number: "601", label: "Achats stockes de matieres premieres", type: "EXPENSE", parent: "6" },
  { number: "607", label: "Achats de marchandises / composants", type: "EXPENSE", parent: "6" },
  { number: "6061", label: "Fournitures non stockables (eau, energie)", type: "EXPENSE", parent: "6" },
  { number: "613", label: "Locations", type: "EXPENSE", parent: "6" },
  { number: "616", label: "Primes d'assurance", type: "EXPENSE", parent: "6" },
  { number: "622", label: "Remunerations d'intermediaires", type: "EXPENSE", parent: "6" },
  { number: "626", label: "Frais postaux et telecom", type: "EXPENSE", parent: "6" },
  { number: "641", label: "Remunerations du personnel", type: "EXPENSE", parent: "6" },
  { number: "645", label: "Charges de securite sociale", type: "EXPENSE", parent: "6" },
  { number: "661", label: "Charges d'interets", type: "EXPENSE", parent: "6" },
  { number: "681", label: "Dotations aux amortissements", type: "EXPENSE", parent: "6" },
  { number: "695", label: "Impots sur les benefices", type: "EXPENSE", parent: "6" },

  // Classe 7 - Produits
  { number: "7", label: "Produits", type: "REVENUE" },
  { number: "701", label: "Ventes de produits finis", type: "REVENUE", parent: "7" },
  { number: "707", label: "Ventes de marchandises", type: "REVENUE", parent: "7" },
  { number: "706", label: "Prestations de services", type: "REVENUE", parent: "7" },
  { number: "708", label: "Produits des activites annexes", type: "REVENUE", parent: "7" },
  { number: "76", label: "Produits financiers", type: "REVENUE", parent: "7" },
];

export const STANDARD_JOURNALS = [
  { code: "AC", name: "Journal des achats" },
  { code: "VE", name: "Journal des ventes" },
  { code: "BQ", name: "Journal de banque" },
  { code: "CA", name: "Journal de caisse" },
  { code: "OD", name: "Operations diverses" },
  { code: "AN", name: "A-nouveaux" },
];
