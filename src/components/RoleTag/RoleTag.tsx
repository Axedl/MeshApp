import { getRoleTag } from '../../lib/roleUtils';

interface RoleTagProps {
  role: string | null | undefined;
}

export function RoleTag({ role }: RoleTagProps) {
  const info = getRoleTag(role);
  if (!info) return null;

  return (
    <span
      style={{
        fontSize: '9px',
        letterSpacing: '1px',
        color: info.colour,
        border: `1px solid ${info.border}`,
        padding: '1px 4px',
        background: 'none',
        fontFamily: 'inherit',
        lineHeight: 1,
        flexShrink: 0,
        userSelect: 'none',
      }}
    >
      {info.tag}
    </span>
  );
}
