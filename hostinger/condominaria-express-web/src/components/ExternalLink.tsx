import type {
  AnchorHTMLAttributes,
  ReactNode,
} from 'react';
import { ExternalLink as ExternalLinkIcon } from 'lucide-react';

type ExternalLinkProps =
  AnchorHTMLAttributes<HTMLAnchorElement> & {
    children: ReactNode;
    showIcon?: boolean;
  };

export function ExternalLink({
  children,
  showIcon = true,
  className = '',
  target = '_blank',
  rel = 'noreferrer noopener',
  ...props
}: ExternalLinkProps) {
  return (
    <a
      {...props}
      target={target}
      rel={rel}
      className={[
        'inline-flex items-center gap-1.5 font-bold text-orange-700 underline decoration-orange-200 underline-offset-4 transition hover:text-orange-800',
        className,
      ].join(' ')}
    >
      <span>{children}</span>

      {showIcon ? (
        <ExternalLinkIcon
          aria-hidden="true"
          className="h-3.5 w-3.5 shrink-0"
        />
      ) : null}
    </a>
  );
}
