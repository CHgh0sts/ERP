"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { JwtPayload } from "@/lib/auth/jwt";
import type { PermissionKey } from "@/lib/permissions/constants";
import {
  LayoutDashboard,
  Cpu,
  Boxes,
  MapPin,
  Truck,
  ShoppingCart,
  Users,
  ClipboardList,
  Package,
  Factory,
  ScanSearch,
  FileText,
  BookOpen,
  Library,
  BookCheck,
  Scale,
  LineChart,
  Percent,
  FileDown,
  UserCog,
  ShieldCheck,
  Settings,
  History,
  Archive,
  FolderSync,
  KeyRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  perm?: PermissionKey;
  section?: string;
  icon?: LucideIcon;
};

const ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Tableau de bord", perm: "dashboard.read", section: "Vue d'ensemble", icon: LayoutDashboard },

  { href: "/components", label: "Composants", perm: "components.read", section: "Stock", icon: Cpu },
  { href: "/stock", label: "Stock", perm: "stock.read", section: "Stock", icon: Boxes },
  { href: "/locations", label: "Emplacements", perm: "locations.read", section: "Stock", icon: MapPin },

  { href: "/suppliers", label: "Fournisseurs", perm: "suppliers.read", section: "Achats", icon: Truck },
  { href: "/orders/supplier", label: "Commandes fournisseur", perm: "purchase.read", section: "Achats", icon: ShoppingCart },

  { href: "/customers", label: "Clients", perm: "customers.read", section: "Ventes", icon: Users },
  { href: "/orders/customer", label: "Commandes client", perm: "sales.read", section: "Ventes", icon: ClipboardList },

  { href: "/products", label: "Produits & BOM", perm: "products.read", section: "Production", icon: Package },
  { href: "/manufacturing", label: "Ordres de fabrication", perm: "of.read", section: "Production", icon: Factory },
  { href: "/traceability", label: "Tracabilite", perm: "traceability.read", section: "Production", icon: ScanSearch },

  { href: "/invoices", label: "Factures", perm: "invoices.read", section: "Facturation", icon: FileText },

  { href: "/accounting", label: "Comptabilite", perm: "accounting.read", section: "Comptabilite", icon: BookOpen },
  { href: "/accounting/accounts", label: "Plan comptable", perm: "accounting.read", section: "Comptabilite", icon: Library },
  { href: "/accounting/journals", label: "Journaux", perm: "accounting.read", section: "Comptabilite", icon: BookCheck },
  { href: "/accounting/ledger", label: "Grand livre", perm: "accounting.read", section: "Comptabilite", icon: BookOpen },
  { href: "/accounting/balance", label: "Balance", perm: "accounting.read", section: "Comptabilite", icon: Scale },
  { href: "/accounting/statements", label: "Bilan / Resultat", perm: "accounting.read", section: "Comptabilite", icon: LineChart },
  { href: "/accounting/vat", label: "TVA", perm: "accounting.read", section: "Comptabilite", icon: Percent },
  { href: "/accounting/fec", label: "Export FEC", perm: "accounting.fec.export", section: "Comptabilite", icon: FileDown },

  { href: "/admin/users", label: "Utilisateurs", perm: "admin.users.manage", section: "Administration", icon: UserCog },
  { href: "/admin/password-resets", label: "Mots de passe", perm: "admin.users.manage", section: "Administration", icon: KeyRound },
  { href: "/admin/roles", label: "Roles & permissions", perm: "admin.roles.manage", section: "Administration", icon: ShieldCheck },
  { href: "/admin/settings", label: "Parametres", perm: "admin.settings.manage", section: "Administration", icon: Settings },
  { href: "/admin/audit", label: "Journal d'audit", perm: "admin.audit.read", section: "Administration", icon: History },
  { href: "/admin/watch", label: "Dossiers d'ecoute", perm: "admin.watch.manage", section: "Administration", icon: FolderSync },
  { href: "/admin/backup", label: "Sauvegardes", perm: "admin.backup.manage", section: "Administration", icon: Archive },
];

export function Sidebar({ user }: { user: JwtPayload }) {
  const pathname = usePathname();
  const isAdmin = user.roles.includes("ADMIN");
  const visible = ITEMS.filter((i) => !i.perm || isAdmin || user.perms.includes(i.perm));

  const bySection = visible.reduce<Record<string, NavItem[]>>((acc, it) => {
    const s = it.section || "Autre";
    if (!acc[s]) acc[s] = [];
    acc[s].push(it);
    return acc;
  }, {});

  return (
    <aside className="w-64 shrink-0 flex flex-col h-screen sticky top-0 overflow-y-auto bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      <div className="p-5 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-md bg-sidebar-active flex items-center justify-center text-white font-bold shadow-sm">
            E
          </div>
          <div>
            <div className="font-semibold text-sm tracking-tight">ERP CMS</div>
            <div className="text-[11px] text-sidebar-muted">Cartes electroniques</div>
          </div>
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-5 text-sm">
        {Object.entries(bySection).map(([section, items]) => (
          <div key={section}>
            <div className="text-[10px] uppercase tracking-[0.12em] font-semibold text-sidebar-muted px-3 mb-1.5">
              {section}
            </div>
            <ul className="space-y-0.5">
              {items.map((it) => {
                const active = pathname === it.href || pathname.startsWith(it.href + "/");
                const Icon = it.icon;
                return (
                  <li key={it.href}>
                    <Link href={it.href} className={cn("sidebar-link", active && "active")}>
                      {Icon ? <Icon className="h-4 w-4 shrink-0" /> : null}
                      <span className="truncate">{it.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      <div className="p-3 border-t border-sidebar-border text-[11px] text-sidebar-muted">
        <div className="px-2 py-1">Connecte : {user.name}</div>
      </div>
    </aside>
  );
}
