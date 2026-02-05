import { LoginCard } from "@/components/login-card";

export default function Dashboard() {
  return (
    <div className="h-screen w-screen relative">
      
      {/* Background layer */}
      <div
        className="
          absolute inset-0
          bg-[url('/food-doodle.svg')]
          bg-repeat
          bg-center
          filter blur-[3px]
          bg-nj-offwhite
        "
      />

      {/* Card layer */}
      <div className="relative flex h-full w-full items-center justify-center">
        <LoginCard />
      </div>
    </div>
  );
}
