import { LoginCard } from "@/components/login-card";


export default function login() {
  return (
    <div className="h-screen w-screen relative overflow-hidden">
      
      {/* Background layer with gradient overlay */}
      <div className="absolute inset-0">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-linear-to-br from-amber-50 via-stone-50 to-orange-50" />
        
        {/* Food doodle pattern */}
        <div
          className="
            absolute inset-0
            bg-[url('/food-doodle.svg')]
            bg-repeat
            bg-center
            opacity-30
            animate-in fade-in duration-1000
          "
        />
        
        {/* Subtle noise texture for depth */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIiB4PSIwIiB5PSIwIj48ZmVUdXJidWxlbmNlIGJhc2VGcmVxdWVuY3k9Ii43NSIgc3RpdGNoVGlsZXM9InN0aXRjaCIgdHlwZT0iZnJhY3RhbE5vaXNlIi8+PGZlQ29sb3JNYXRyaXggdHlwZT0ic2F0dXJhdGUiIHZhbHVlcz0iMCIvPjwvZmlsdGVyPjxwYXRoIGQ9Ik0wIDBoMzAwdjMwMEgweiIgZmlsdGVyPSJ1cmwoI2EpIiBvcGFjaXR5PSIuMDUiLz48L3N2Zz4=')] opacity-40" />
      </div>
      
      {/* Card layer with animation */}
      <div className="relative flex h-full w-full items-center justify-center p-8 animate-in zoom-in-95 fade-in duration-500">
        <LoginCard />
      </div>
      
      {/* Floating decoration elements */}
    </div>
  );
}