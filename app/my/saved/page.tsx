import { permanentRedirect } from "next/navigation";

// Folded into the unified My Library (saved prompts → the "Prompts" filter).
export default function MySavedRedirect() {
  permanentRedirect("/my?filter=prompts");
}
