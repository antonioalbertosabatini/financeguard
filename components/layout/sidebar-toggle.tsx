"use client";

import { PanelLeft, PanelLeftClose } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/hooks/use-sidebar";

export function SidebarToggle() {
  const { sidebarOpen, toggleSidebar } = useSidebar();

  const label = sidebarOpen ? "Chiudi menu" : "Apri menu";

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
