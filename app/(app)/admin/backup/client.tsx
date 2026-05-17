"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function BackupClient() {
  const [loading, setLoading] = useState(false);
  async function download() {
    setLoading(true);
    const r = await fetch("/api/admin/backup", { method: "POST" });
    setLoading(false);
    if (!r.ok) {
      alert("Echec de la sauvegarde");
      return;
    }
    const blob = await r.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `erp-backup-${new Date().toISOString().replace(/[:.]/g, "-")}.zip`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }
  return (
    <Button onClick={download} disabled={loading}>
      {loading ? "Generation..." : "Telecharger la sauvegarde ZIP"}
    </Button>
  );
}
