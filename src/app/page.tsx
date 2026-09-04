import { GhostTerminal } from "@/components/GhostTerminal";
import { createIdentity } from "@/lib/identity";

/** Rendered per request so every visit boots a different-looking node. */
export const dynamic = "force-dynamic";

export default function Page() {
  const { host, session } = createIdentity();
  return <GhostTerminal host={host} session={session} />;
}
