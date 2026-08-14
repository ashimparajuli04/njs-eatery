import { Coffee } from "lucide-react";

type LoadingViewProps = {
  label?: string;
};

export function LoadingView({ label = "" }: LoadingViewProps) {
  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 flex items-center justify-center">
      <div className="text-center space-y-4">
        <Coffee className="h-10 w-10 mx-auto text-stone-800 dark:text-stone-300 animate-pulse" />
        <p className="text-stone-600 dark:text-stone-400">
          Loading {label && `${label} `}...
        </p>
      </div>
    </div>
  );
}
