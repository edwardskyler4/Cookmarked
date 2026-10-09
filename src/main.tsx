import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { supabase } from "./data/supabaseClient";
import { SupabaseAuthRepository } from "./data/repositories/SupabaseAuthRepository";
import { createAuthService } from "./services/authService";

const authService = createAuthService(new SupabaseAuthRepository(supabase));

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App authService={authService} />
  </StrictMode>,
);
