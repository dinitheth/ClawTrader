import { ClawFaucetCard } from "./ClawFaucetCard";
import { MonadFaucetCard } from "./MonadFaucetCard";

export function FaucetSection() {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <MonadFaucetCard />
      <ClawFaucetCard />
    </div>
  );
}

export { ClawFaucetCard } from "./ClawFaucetCard";
export { MonadFaucetCard } from "./MonadFaucetCard";
