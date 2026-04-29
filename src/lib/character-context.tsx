import { createContext, useContext, useMemo, type ReactNode } from "react";
import { type Character, pickCharacterForSession } from "./characters";

const Ctx = createContext<Character | null>(null);

export const CharacterProvider = ({ children }: { children: ReactNode }) => {
  // Picked once per app load (component mount). Cycles per reload via localStorage.
  const character = useMemo(() => pickCharacterForSession(), []);
  return <Ctx.Provider value={character}>{children}</Ctx.Provider>;
};

export const useCharacter = (): Character => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCharacter must be used inside CharacterProvider");
  return c;
};
