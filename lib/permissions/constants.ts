export const PERMISSIONS = {
  // Dashboard
  "dashboard.read": { module: "dashboard", description: "Voir le tableau de bord" },

  // Admin
  "admin.users.manage": { module: "admin", description: "Gerer les utilisateurs" },
  "admin.roles.manage": { module: "admin", description: "Gerer les roles et permissions" },
  "admin.settings.manage": { module: "admin", description: "Modifier les parametres ERP" },
  "admin.audit.read": { module: "admin", description: "Consulter le journal d'audit" },
  "admin.backup.manage": { module: "admin", description: "Creer des sauvegardes" },
  "admin.watch.manage": { module: "admin", description: "Gerer les dossiers d'ecoute" },

  // Imports
  "components.import": { module: "stock", description: "Importer des composants en masse" },

  // Referentiels
  "locations.read": { module: "referentiels", description: "Voir les emplacements" },
  "locations.write": { module: "referentiels", description: "Gerer les emplacements" },
  "suppliers.read": { module: "referentiels", description: "Voir les fournisseurs" },
  "suppliers.write": { module: "referentiels", description: "Gerer les fournisseurs" },
  "customers.read": { module: "referentiels", description: "Voir les clients" },
  "customers.write": { module: "referentiels", description: "Gerer les clients" },
  "units.manage": { module: "referentiels", description: "Gerer les unites" },
  "vat.manage": { module: "referentiels", description: "Gerer les taux de TVA" },

  // Composants & stock
  "components.read": { module: "stock", description: "Voir les composants" },
  "components.write": { module: "stock", description: "Gerer les composants" },
  "stock.read": { module: "stock", description: "Voir le stock" },
  "stock.adjust": { module: "stock", description: "Ajuster le stock" },
  "stock.transfer": { module: "stock", description: "Transferer entre emplacements" },

  // Achats
  "purchase.read": { module: "achats", description: "Voir les commandes fournisseur" },
  "purchase.write": { module: "achats", description: "Creer des commandes fournisseur" },
  "purchase.receive": { module: "achats", description: "Reception des commandes" },

  // Ventes
  "sales.read": { module: "ventes", description: "Voir les commandes client" },
  "sales.write": { module: "ventes", description: "Creer des commandes client" },

  // Produits / BOM / OF
  "products.read": { module: "production", description: "Voir les produits et BOM" },
  "products.write": { module: "production", description: "Gerer les produits et BOM" },
  "of.read": { module: "production", description: "Voir les ordres de fabrication" },
  "of.create": { module: "production", description: "Creer des OF" },
  "of.execute": { module: "production", description: "Executer les OF (reserver/consommer)" },

  // Tracabilite
  "traceability.read": { module: "tracabilite", description: "Consulter la tracabilite" },

  // Facturation
  "invoices.read": { module: "facturation", description: "Voir les factures" },
  "invoices.write": { module: "facturation", description: "Gerer les factures" },
  "payments.manage": { module: "facturation", description: "Saisir des paiements" },

  // Comptabilite
  "accounting.read": { module: "comptabilite", description: "Consulter la comptabilite" },
  "accounting.journal.post": { module: "comptabilite", description: "Valider les ecritures" },
  "accounting.account.manage": { module: "comptabilite", description: "Gerer le plan comptable" },
  "accounting.fec.export": { module: "comptabilite", description: "Exporter le FEC" },
} as const;

export type PermissionKey = keyof typeof PERMISSIONS;

export const ALL_PERMISSION_KEYS = Object.keys(PERMISSIONS) as PermissionKey[];

export const DEFAULT_USER_PERMISSIONS: PermissionKey[] = [
  "dashboard.read",
  "components.read",
  "stock.read",
  "suppliers.read",
  "customers.read",
  "products.read",
  "of.read",
  "purchase.read",
  "sales.read",
  "invoices.read",
  "traceability.read",
];

export const PERMISSION_GROUPS = (() => {
  const groups: Record<string, Array<{ key: PermissionKey; description: string }>> = {};
  for (const [key, def] of Object.entries(PERMISSIONS)) {
    const k = key as PermissionKey;
    const mod = def.module;
    if (!groups[mod]) groups[mod] = [];
    groups[mod].push({ key: k, description: def.description });
  }
  return groups;
})();
