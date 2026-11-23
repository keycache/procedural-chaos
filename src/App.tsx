import { HashRouter, Link, Route, Routes } from 'react-router-dom';
import { Shell } from './app/shell';
import { Home } from './app/home';
import { Button } from './components/ui/button';
import { MandalaStudio } from './studios/mandala';
import { VideoStudio } from './studios/video';
import { Library } from './studios/library';

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Shell />}>
          <Route index element={<Home />} />
          <Route path="mandala" element={<MandalaStudio />} />
          <Route path="video" element={<VideoStudio />} />
          <Route path="library" element={<Library />} />
          <Route
            path="*"
            element={
              <main className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center gap-5 p-8 text-center">
                <p className="eyebrow">404 / LOST IN THE PATTERN</p>
                <h1 className="text-3xl font-semibold">Page not found</h1>
                <p className="text-muted-foreground">
                  This route does not exist. Let&apos;s head back to the
                  studios.
                </p>
                <Button asChild>
                  <Link to="/">Back to home</Link>
                </Button>
              </main>
            }
          />
        </Route>
      </Routes>
    </HashRouter>
  );
}
