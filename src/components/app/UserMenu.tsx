import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Languages, LogOut, Moon, Sun, UserRound } from 'lucide-react';
import { useTheme } from 'next-themes';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { useI18n } from '@/i18n';
import { useAuth } from '@/services/auth';
import { cn } from '@/lib/utils';

export function UserMenu({ variant = 'light' }: { variant?: 'light' | 'dark' }) {
  const { user, mode, signOut, renameLocalUser } = useAuth();
  const { t, lang, setLang } = useI18n();
  const { resolvedTheme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [name, setName] = useState(user?.name ?? '');

  if (!user) return null;
  const initial = user.name.trim().charAt(0).toUpperCase() || 'ಸು';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={user.name}
          className={cn(
            'flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold',
            variant === 'dark' ? 'bg-white/20 text-white hover:bg-white/30' : 'bg-primary text-primary-foreground',
          )}
        >
          {initial}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>
          <div className="font-medium">{user.name}</div>
          {user.email && <div className="text-xs font-normal text-muted-foreground">{user.email}</div>}
        </DropdownMenuLabel>
        {mode === 'local' && (
          <div className="px-2 pb-2" onKeyDown={(e) => e.stopPropagation()}>
            <label className="mb-1 flex items-center gap-1 text-xs text-muted-foreground">
              <UserRound className="h-3 w-3" />
              {t('dash.yourName')}
            </label>
            <Input className="h-8" value={name} onChange={(e) => setName(e.target.value)} onBlur={() => name.trim() && renameLocalUser(name.trim())} />
          </div>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => setLang(lang === 'kn' ? 'en' : 'kn')}>
          <Languages className="mr-2 h-4 w-4" />
          {t('common.uiLanguage')}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}>
          {resolvedTheme === 'dark' ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
          {t('view.dark')}
          {resolvedTheme === 'dark' && <Check className="ml-auto h-4 w-4" />}
        </DropdownMenuItem>
        {mode === 'cloud' && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={async () => {
                await signOut();
                navigate('/');
              }}
            >
              <LogOut className="mr-2 h-4 w-4" />
              {t('common.signOut')}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
