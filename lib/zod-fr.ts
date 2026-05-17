import { z, ZodError, ZodIssueCode, type ZodErrorMap } from "zod";

const FR_ERROR_MAP: ZodErrorMap = (issue, ctx) => {
  let message = ctx.defaultError;

  switch (issue.code) {
    case ZodIssueCode.invalid_type:
      if (issue.received === "undefined" || issue.received === "null") {
        message = "Champ obligatoire";
      } else {
        message = `Type invalide (attendu : ${issue.expected})`;
      }
      break;
    case ZodIssueCode.too_small: {
      const min = (issue as { minimum: number }).minimum;
      if (issue.type === "string") {
        message = min === 1 ? "Champ obligatoire" : `Au moins ${min} caracteres`;
      } else if (issue.type === "number") {
        message = `Doit etre superieur ou egal a ${min}`;
      } else if (issue.type === "array") {
        message = `Au moins ${min} element(s)`;
      } else {
        message = `Valeur trop petite (min ${min})`;
      }
      break;
    }
    case ZodIssueCode.too_big: {
      const max = (issue as { maximum: number }).maximum;
      if (issue.type === "string") {
        message = `${max} caracteres maximum`;
      } else if (issue.type === "number") {
        message = `Doit etre inferieur ou egal a ${max}`;
      } else if (issue.type === "array") {
        message = `${max} element(s) maximum`;
      } else {
        message = `Valeur trop grande (max ${max})`;
      }
      break;
    }
    case ZodIssueCode.invalid_string: {
      const validation = (issue as { validation: string }).validation;
      if (validation === "email") message = "Adresse email invalide";
      else if (validation === "url") message = "URL invalide";
      else if (validation === "uuid") message = "UUID invalide";
      else message = "Format invalide";
      break;
    }
    case ZodIssueCode.invalid_enum_value:
      message = "Valeur non autorisee";
      break;
    case ZodIssueCode.unrecognized_keys:
      message = "Cle(s) non reconnue(s)";
      break;
    case ZodIssueCode.invalid_date:
      message = "Date invalide";
      break;
    case ZodIssueCode.custom:
      message = issue.message ?? "Valeur invalide";
      break;
    default:
      break;
  }

  return { message };
};

let installed = false;
export function installZodFrench() {
  if (installed) return;
  z.setErrorMap(FR_ERROR_MAP);
  installed = true;
}

installZodFrench();

function humanizeField(path: (string | number)[]): string {
  if (!path.length) return "";
  const key = String(path[path.length - 1]);
  const map: Record<string, string> = {
    codeArticle: "Code article",
    mpn: "MPN",
    description: "Description",
    componentType: "Type",
    format: "Format",
    value: "Valeur",
    defaultUnitId: "Unite par defaut",
    stockAlert: "Seuil d'alerte",
    lastPurchasePrice: "Prix d'achat HT",
    notes: "Notes",
    name: "Nom",
    email: "Email",
    password: "Mot de passe",
    code: "Code",
    label: "Libelle",
    supplierId: "Fournisseur",
    customerId: "Client",
    articleId: "Article",
    productId: "Produit",
    priceHT: "Prix HT",
    qty: "Quantite",
    qtyOrdered: "Quantite commandee",
    qtyReceived: "Quantite recue",
    currency: "Devise",
    moq: "Quantite min",
    leadTimeDays: "Delai (jours)",
    isPreferred: "Prefere",
    vatRateId: "TVA",
    locationId: "Emplacement",
    lotNumber: "Lot",
    packaging: "Conditionnement",
    unitPriceHT: "Prix unitaire HT",
    siret: "SIRET",
    vatNumber: "TVA intracom",
    address: "Adresse",
    city: "Ville",
    zip: "Code postal",
    country: "Pays",
    phone: "Telephone",
  };
  return map[key] ?? key;
}

export function formatZodError(err: ZodError): string {
  const parts = err.issues.map((i) => {
    const field = humanizeField(i.path);
    return field ? `${field} : ${i.message}` : i.message;
  });
  return parts.join(" | ");
}

/**
 * Safely parse with French error messages.
 * Throws a standard `Error` with a readable French message instead of raw JSON.
 */
export function parseOrThrow<T extends z.ZodTypeAny>(schema: T, data: unknown): z.infer<T> {
  const r = schema.safeParse(data);
  if (!r.success) {
    throw new Error(formatZodError(r.error));
  }
  return r.data;
}
