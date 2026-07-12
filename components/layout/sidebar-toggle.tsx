"use client";

import { PanelLeft, PanelLeftClose } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/providers/i18n-provider";
import { useSidebar } from "@/providers/sidebar-provider";

export function SidebarToggle() {
  const { sidebarOpen, toggleSidebar } = useSidebar();
  const { t } = useI18n();

  const label = sidebarOpen ? t("common.closeMenu") : t("common.openMenu");

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={toggleSidebar}
      aria-label={label}
      aria-expanded={sidebarOpen}
      title={label}
      className="hidden size-9 rounded-xl md:inline-flex"
    >
      {sidebarOpen ? (
        <PanelLeftClose className="size-4" />
      ) : (
        <PanelLeft className="size-4" />
      )}
    </Button>
  );
}
