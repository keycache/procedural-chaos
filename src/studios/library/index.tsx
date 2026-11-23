import { useEffect, useState } from 'react';
import { Flower2, FolderOpen, Image, Video } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { openDatabase } from '../../shared/storage';

const collections = [
  { store: 'mandalas', label: 'Mandalas', icon: Flower2 },
  { store: 'artworks', label: 'Imported artwork', icon: Image },
  { store: 'videoProjects', label: 'Video projects', icon: Video },
] as const;

export function Library() {
  const [counts, setCounts] = useState<number[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadCounts() {
      const database = await openDatabase();
      try {
        const values = await Promise.all(
          collections.map(({ store }) => database.count(store)),
        );
        if (active) setCounts(values);
      } finally {
        database.close();
      }
    }
    loadCounts().catch((error: unknown) => {
      console.error('Could not read the local library.', error);
      if (active) {
        setFailed(true);
        toast.error('Could not read the local library.');
      }
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <main id="main-content" className="mx-auto max-w-340 px-6 py-10 lg:px-10">
      <p className="eyebrow mb-3">STAYS ON YOUR DEVICE</p>
      <h1 className="text-3xl font-semibold tracking-tight">
        Your local library
      </h1>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
        A home for your mandalas, imported artwork, and video recipes. The
        browser database is set up; project saving arrives with the studio
        editors.
      </p>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {collections.map(({ store, label, icon: Icon }, index) => (
          <Card key={store} className="border border-border">
            <CardContent className="flex items-center gap-4 px-5 py-2">
              <Icon className="size-5 text-primary" />
              <div>
                <p className="text-sm font-medium">{label}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {failed
                    ? 'Unavailable'
                    : counts
                      ? `${counts[index]} saved`
                      : 'Loading...'}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="mt-8 flex min-h-72 flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border px-6 text-center">
        <FolderOpen className="size-9 text-muted-foreground" />
        <h2 className="font-medium">
          {failed
            ? 'Local storage is unavailable'
            : 'Room for your next experiment'}
        </h2>
        <p className="max-w-md text-sm text-muted-foreground">
          {failed
            ? 'Check your browser storage settings and reload to try again.'
            : 'Explore the studio shells while the creative engines take shape.'}
        </p>
        <Button asChild variant="outline">
          <Link to="/mandala">Explore Mandala Studio</Link>
        </Button>
      </div>
    </main>
  );
}
