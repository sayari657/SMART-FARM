import { createContext, useContext, useState } from 'react';

const SidebarCtx = createContext({ open: false, toggle: () => {}, close: () => {} });

export const useSidebar = () => useContext(SidebarCtx);

export function SidebarProvider({ children }) {
  const [open, setOpen] = useState(false);
  return (
    <SidebarCtx.Provider value={{
      open,
      toggle: () => setOpen(o => !o),
      close:  () => setOpen(false),
    }}>
      {children}
    </SidebarCtx.Provider>
  );
}
