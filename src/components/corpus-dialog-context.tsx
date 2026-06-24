"use client";

import { createContext, useContext, useMemo, useState } from "react";

type CorpusDialogContextValue = {
  openCreateDialog: () => void;
  open: boolean;
  setOpen: (open: boolean) => void;
};

const CorpusDialogContext = createContext<CorpusDialogContextValue | null>(null);

export function CorpusDialogProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const value = useMemo(
    () => ({
      openCreateDialog: () => setOpen(true),
      open,
      setOpen,
    }),
    [open],
  );

  return <CorpusDialogContext.Provider value={value}>{children}</CorpusDialogContext.Provider>;
}

export function useCorpusDialog() {
  const context = useContext(CorpusDialogContext);
  if (!context) {
    throw new Error("useCorpusDialog must be used within CorpusDialogProvider");
  }
  return context;
}
