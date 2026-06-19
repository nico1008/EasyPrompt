import { permanentRedirect } from "next/navigation";

// Folded into the unified My Library (authored templates → the "Templates"
// filter). The editor lives at /my/templates/new and /my/templates/[id]/edit.
export default function MyTemplatesRedirect() {
  permanentRedirect("/my?filter=templates");
}
