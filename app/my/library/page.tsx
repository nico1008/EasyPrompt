import { permanentRedirect } from "next/navigation";

// Folded into the unified My Library (bookmarked catalog templates → the
// "Favorites" filter).
export default function MyLibraryRedirect() {
  permanentRedirect("/my?filter=favorites");
}
