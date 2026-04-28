import { Mascot } from "./Mascot";

export const LoadingSpinner = ({ message = "Kit is exploring..." }: { message?: string }) => (
  <div className="flex flex-col items-center justify-center py-12 gap-4">
    <div className="animate-wiggle">
      <Mascot size="md" />
    </div>
    <p className="display text-lg text-secondary">{message}</p>
  </div>
);
