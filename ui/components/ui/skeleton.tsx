import { cn } from './utils';

interface SkeletonProps extends React.ComponentProps<'div'> {
  /** Loading text for screen readers */
  loadingText?: string;
}

function Skeleton({ className, loadingText = 'Loading...', ...props }: SkeletonProps) {
  return (
    <div
      data-slot="skeleton"
      className={cn('bg-accent animate-pulse rounded-md', className)}
      role="status"
      aria-label={loadingText}
      {...props}
    />
  );
}

// Predefined skeleton components for common use cases
function SkeletonText({ lines = 1, className, ...props }: { lines?: number } & SkeletonProps) {
  return (
    <div className="space-y-2" {...props}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn(
            'h-4',
            i === lines - 1 && lines > 1 ? 'w-3/4' : 'w-full',
            className
          )}
          loadingText={`Loading text line ${i + 1}`}
        />
      ))}
    </div>
  );
}

function SkeletonCard({ className, ...props }: SkeletonProps) {
  return (
    <div className={cn('p-6 space-y-4', className)} {...props}>
      <div className="flex items-center space-x-4">
        <Skeleton className="h-12 w-12 rounded-full" loadingText="Loading avatar" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-1/2" loadingText="Loading title" />
          <Skeleton className="h-4 w-1/4" loadingText="Loading subtitle" />
        </div>
      </div>
      <SkeletonText lines={3} loadingText="Loading content" />
    </div>
  );
}

function SkeletonTable({ rows = 5, columns = 4, className, ...props }: { rows?: number; columns?: number } & SkeletonProps) {
  return (
    <div className={cn('space-y-3', className)} {...props}>
      {/* Header */}
      <div className="flex space-x-4">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={`header-${i}`} className="h-4 flex-1" loadingText={`Loading column ${i + 1} header`} />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={`row-${rowIndex}`} className="flex space-x-4">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton 
              key={`cell-${rowIndex}-${colIndex}`} 
              className="h-4 flex-1" 
              loadingText={`Loading row ${rowIndex + 1}, column ${colIndex + 1}`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export { Skeleton, SkeletonText, SkeletonCard, SkeletonTable };
