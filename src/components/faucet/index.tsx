import { ClawFaucetCard } from "./ClawFaucetCard";
import { MonadFaucetCard } from "./MonadFaucetCard";
import { UsdcFaucetCard } from "./UsdcFaucetCard";

export function FaucetSection() {
  return (
    <div className="grid gap-6 md:grid-cols-3">
      <MonadFaucetCard />
      <UsdcFaucetCard />
      <ClawFaucetCard />
    </div>
  );
}

export { ClawFaucetCard } from "./ClawFaucetCard";
export { MonadFaucetCard } from "./MonadFaucetCard";
export { UsdcFaucetCard } from "./UsdcFaucetCard";
