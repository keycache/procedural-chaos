import { useEffect, useState } from 'react';
import { Flower2, FolderOpen, Image, Video } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { openDatabase } from '../../shared/storage';
import { readMandalaProject, type MandalaProject } from '../mandala/projects';
import { useMandalaStore } from '../mandala/store';
import { errorMessage } from '../../shared/errors';

const collections = [
  { store: 'mandalas', label: 'Mandalas', icon: Flower2 },
  { store: 'artworks', label: 'Imported artwork', icon: Image },
  { store: 'videoProjects', label: 'Video projects', icon: Video },
] as const;

export function Library() {
  const [counts, setCounts] = useState<number[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [projects, setProjects] = useState<MandalaProject[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    async function loadCounts() {
      const database = await openDatabase();
      try {
        const [values, saved] = await Promise.all([
          Promise.all(collections.map(({ store }) => database.count(store))),
          database.getAll('mandalas'),
        ]);
        const parsed = saved
          .map(readMandalaProject)
          .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
        if (active) {
          setCounts(values);
          setProjects(parsed);
        }
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
        mandalas can be reopened in the editor. Export JSON recipes as portable
        backups; clearing site data removes the local library.
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
      {projects.length > 0 && !failed ? (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Card
              key={project.id}
              className="overflow-hidden border border-border"
            >
              <img
                src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(project.data.svg)}`}
                alt={`${project.name} preview`}
                className="aspect-square w-full bg-white object-contain p-3"
              />
              <CardContent className="space-y-3 px-5 pb-5">
                <h2 className="font-medium">{project.name}</h2>
                <p className="text-xs text-muted-foreground">
                  Seed: {project.data.recipe.seed}
                  <br />
                  Updated {new Date(project.updatedAt).toLocaleString()}
                </p>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    try {
                      useMandalaStore
                        .getState()
                        .openProject(project.data.document, project.id);
                      navigate('/mandala');
                    } catch (error) {
                      console.error('Could not reopen mandala:', error);
                      toast.error(errorMessage(error));
                    }
                  }}
                >
                  Open in Mandala Studio
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="mt-8 flex min-h-72 flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border px-6 text-center">
          <FolderOpen className="size-9 text-muted-foreground" />
          <h2 className="font-medium">
            {failed
              ? 'Local storage is unavailable'
              : counts
                ? 'Room for your next experiment'
                : 'Opening your library...'}
          </h2>
          <p className="max-w-md text-sm text-muted-foreground">
            {failed
              ? 'Check your browser storage settings and reload to try again.'
              : 'Save a mandala in the studio to keep its exact recipe and editor settings here.'}
          </p>
          <Button asChild variant="outline">
            <Link to="/mandala">Explore Mandala Studio</Link>
          </Button>
        </div>
      )}
    </main>
  );
}
