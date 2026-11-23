import { useEffect, useState } from 'react';
import {
  CircleCheck,
  Flower2,
  FolderOpen,
  HardDrive,
  LoaderCircle,
  ShieldCheck,
  TriangleAlert,
  Video,
} from 'lucide-react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Badge } from '../components/ui/badge';
import { Toaster } from '../components/ui/sonner';
import { getBrowserCapabilities } from '../shared/capabilities';
import { openDatabase } from '../shared/storage';
import type { ShellContext } from './context';

const navigation = [
  { to: '/mandala', label: 'Mandala Studio', icon: Flower2, shortcut: '1' },
  { to: '/video', label: 'Video Studio', icon: Video, shortcut: '2' },
  { to: '/library', label: 'Library', icon: FolderOpen, shortcut: '3' },
];

export function Shell() {
  const navigate = useNavigate();
  const [capabilities] = useState(getBrowserCapabilities);
  const [storageStatus, setStorageStatus] =
    useState<ShellContext['storageStatus']>('loading');

  useEffect(() => {
    let active = true;
    openDatabase()
      .then((database) => {
        database.close();
        if (active) setStorageStatus('ready');
      })
      .catch((error: unknown) => {
        console.error('Could not initialize local storage.', error);
        if (active) {
          setStorageStatus('unavailable');
          toast.error(
            'Local storage is unavailable. Check your browser settings.',
          );
        }
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      if (!event.altKey || event.ctrlKey || event.metaKey) return;
      const destination = navigation.find(
        (item) => item.shortcut === event.key,
      );
      if (destination) {
        event.preventDefault();
        navigate(destination.to);
      }
    }
    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, [navigate]);

  const missingFeatures = [
    !capabilities.workers && 'Web Workers',
    !capabilities.localStorage && 'IndexedDB',
    !capabilities.offscreenCanvas && 'OffscreenCanvas',
    !capabilities.videoEncoder && 'WebCodecs video encoding',
    !capabilities.secureContext && 'a secure context (HTTPS)',
  ].filter(Boolean);

  return (
    <div className="flex min-h-svh flex-col">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex min-h-18 max-w-360 flex-wrap items-center justify-between gap-4 px-6 py-4 lg:px-10">
          <Link to="/" className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Flower2 className="size-5" />
            </span>
            <span className="text-base font-semibold tracking-tight">
              procedural<span className="text-primary">.</span>chaos
            </span>
          </Link>
          <nav aria-label="Main navigation" className="flex flex-wrap gap-1">
            {navigation.map(({ to, label, icon: Icon, shortcut }) => (
              <NavLink
                key={to}
                to={to}
                title={`Alt+${shortcut}`}
                className={({ isActive }) =>
                  `flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                    isActive
                      ? 'bg-secondary text-foreground'
                      : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
                  }`
                }
              >
                <Icon className="size-4" />
                {label}
              </NavLink>
            ))}
          </nav>
          <Badge variant="outline" className="gap-2 px-3 py-1.5">
            <span className="size-1.5 rounded-full bg-primary" />
            Phase 0
          </Badge>
        </div>
      </header>

      {missingFeatures.length > 0 && (
        <div
          role="alert"
          className="border-b border-amber-500/20 bg-amber-500/10 px-6 py-3 text-sm text-amber-200"
        >
          <div className="mx-auto flex max-w-340 items-start gap-3">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            <p>
              Some features are unavailable: {missingFeatures.join(', ')}. Use
              desktop Chrome or Edge over HTTPS for the full experience.
            </p>
          </div>
        </div>
      )}
      {storageStatus === 'unavailable' && (
        <div
          role="alert"
          className="border-b border-destructive/20 bg-destructive/10 px-6 py-3 text-sm text-destructive"
        >
          Your browser could not open the local library. Saving is unavailable;
          check storage permissions and reload.
        </div>
      )}

      <div className="flex-1">
        <Outlet
          context={{ capabilities, storageStatus } satisfies ShellContext}
        />
      </div>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-360 flex-wrap items-center justify-between gap-3 px-6 py-4 text-xs text-muted-foreground lg:px-10">
          <span className="flex items-center gap-2">
            <ShieldCheck className="size-3.5" />
            Private by design. No uploads. No accounts.
          </span>
          <span className="flex items-center gap-2" role="status">
            {storageStatus === 'loading' ? (
              <LoaderCircle className="size-3.5 animate-spin" />
            ) : storageStatus === 'ready' ? (
              <CircleCheck className="size-3.5 text-emerald-400" />
            ) : (
              <HardDrive className="size-3.5 text-destructive" />
            )}
            {storageStatus === 'ready'
              ? 'Local library ready'
              : storageStatus === 'loading'
                ? 'Opening local library'
                : 'Local library unavailable'}
          </span>
        </div>
      </footer>
      <Toaster theme="dark" richColors closeButton />
    </div>
  );
}
