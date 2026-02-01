export const CalendarSkeleton = () => (
  <div className="space-y-4 animate-pulse">
    {/* Back button skeleton */}
    <div className="h-5 w-24 bg-booking-border rounded" />
    
    {/* Calendar container */}
    <div className="bg-booking-surface rounded-sm p-3">
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-3">
        <div className="h-4 w-4 bg-booking-border rounded" />
        <div className="h-4 w-32 bg-booking-border rounded" />
        <div className="h-4 w-4 bg-booking-border rounded" />
      </div>
      
      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-4 bg-booking-border rounded mx-1" />
        ))}
      </div>
      
      {/* Calendar grid (5 weeks) */}
      <div className="grid grid-cols-7 gap-0.5">
        {Array.from({ length: 35 }).map((_, i) => (
          <div key={i} className="aspect-square bg-booking-border rounded-sm" />
        ))}
      </div>
    </div>
  </div>
);
