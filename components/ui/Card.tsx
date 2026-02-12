export type CardProps = {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  footer?: React.ReactNode;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
  className?: string;
};

const paddingStyles = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

export function Card({
  children,
  title,
  subtitle,
  footer,
  padding = 'md',
  hover = false,
  className = '',
}: CardProps) {
  const baseStyles = 'bg-white rounded-xl shadow-sm border border-gray-100';
  const hoverStyles = hover ? 'hover:shadow-md transition-shadow' : '';

  return (
    <div className={`${baseStyles} ${hoverStyles} ${className}`}>
      {title && (
        <div className={`${paddingStyles[padding]} border-b border-gray-100`}>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          {subtitle && (
            <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
          )}
        </div>
      )}

      <div className={paddingStyles[padding]}>
        {children}
      </div>

      {footer && (
        <div className={`${paddingStyles[padding]} border-t border-gray-100 bg-gray-50 rounded-b-xl`}>
          {footer}
        </div>
      )}
    </div>
  );
}

export default Card;

