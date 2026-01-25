import * as React from 'react';
import { cn } from '../../lib/utils';
import { User } from 'lucide-react';

const sizeStyles = {
  xs: 'h-6 w-6 text-xs',
  sm: 'h-8 w-8 text-sm',
  md: 'h-10 w-10 text-base',
  lg: 'h-12 w-12 text-lg',
  xl: 'h-16 w-16 text-xl',
  '2xl': 'h-20 w-20 text-2xl',
};

const iconSizes = {
  xs: 12,
  sm: 14,
  md: 18,
  lg: 22,
  xl: 28,
  '2xl': 36,
};

// Generate consistent color based on name
function getColorFromName(name) {
  const colors = [
    'bg-primary-500',
    'bg-emerald-500',
    'bg-blue-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-indigo-500',
    'bg-teal-500',
    'bg-cyan-500',
  ];
  
  if (!name) return colors[0];
  
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

// Get initials from name
function getInitials(name, maxLength = 2) {
  if (!name) return '';
  
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].substring(0, maxLength).toUpperCase();
  }
  
  return parts
    .slice(0, maxLength)
    .map(part => part[0])
    .join('')
    .toUpperCase();
}

export const Avatar = React.forwardRef(
  (
    {
      className,
      size = 'md',
      src,
      alt,
      name,
      fallback,
      showStatus,
      status = 'offline',
      ...props
    },
    ref
  ) => {
    const [imgError, setImgError] = React.useState(false);
    const showImage = src && !imgError;
    const initials = fallback || getInitials(name);
    const bgColor = getColorFromName(name);

    const statusColors = {
      online: 'bg-success-500',
      offline: 'bg-gray-400',
      busy: 'bg-danger-500',
      away: 'bg-warning-500',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'relative inline-flex items-center justify-center rounded-full font-medium text-white',
          sizeStyles[size],
          !showImage && bgColor,
          className
        )}
        {...props}
      >
        {showImage ? (
          <img
            src={src}
            alt={alt || name || 'Avatar'}
            className="h-full w-full rounded-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : initials ? (
          <span className="select-none">{initials}</span>
        ) : (
          <User size={iconSizes[size]} />
        )}
        
        {showStatus && (
          <span
            className={cn(
              'absolute bottom-0 right-0 block rounded-full ring-2 ring-white dark:ring-slate-800',
              statusColors[status],
              size === 'xs' && 'h-1.5 w-1.5',
              size === 'sm' && 'h-2 w-2',
              size === 'md' && 'h-2.5 w-2.5',
              size === 'lg' && 'h-3 w-3',
              size === 'xl' && 'h-3.5 w-3.5',
              size === '2xl' && 'h-4 w-4'
            )}
          />
        )}
      </div>
    );
  }
);

Avatar.displayName = 'Avatar';

// Avatar Group component
export const AvatarGroup = ({ children, max = 4, size = 'md', className }) => {
  const childArray = React.Children.toArray(children);
  const visibleChildren = childArray.slice(0, max);
  const remainingCount = childArray.length - max;

  return (
    <div className={cn('flex -space-x-2', className)}>
      {visibleChildren.map((child, index) => (
        <div
          key={index}
          className="ring-2 ring-white dark:ring-slate-800 rounded-full"
          style={{ zIndex: visibleChildren.length - index }}
        >
          {React.cloneElement(child, { size })}
        </div>
      ))}
      {remainingCount > 0 && (
        <div
          className={cn(
            'flex items-center justify-center rounded-full bg-gray-200 dark:bg-slate-600 text-gray-600 dark:text-gray-300 font-medium ring-2 ring-white dark:ring-slate-800',
            sizeStyles[size]
          )}
          style={{ zIndex: 0 }}
        >
          +{remainingCount}
        </div>
      )}
    </div>
  );
};

AvatarGroup.displayName = 'AvatarGroup';

export default Avatar;
