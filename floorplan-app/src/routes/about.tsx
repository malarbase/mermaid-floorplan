import { Title } from '@solidjs/meta';
import { Header } from '~/components/Header';

/**
 * About page - information about the Floorplan app.
 */
export default function About() {
  return (
    <main class="min-h-screen bg-base-200">
      <Title>About - Floorplan</Title>

      {/* Header */}
      <Header />

      {/* Content */}
      <div class="p-8">
        <div class="max-w-3xl mx-auto">
          <h1 class="text-3xl font-bold mb-4">About Floorplan</h1>
          <p class="text-base-content/70 mb-6">
            Floorplan is a powerful tool for designing and visualizing architectural floorplans
            using an intuitive domain-specific language (DSL).
          </p>

          <div class="card bg-base-100 shadow-xl mb-6">
            <div class="card-body">
              <h2 class="card-title">Features</h2>
              <ul class="list-disc list-inside space-y-2 text-base-content/70">
                <li>Simple text-based DSL for defining floorplans</li>
                <li>Real-time 3D visualization</li>
                <li>Cloud storage and sharing</li>
                <li>Version control with snapshots and permalinks</li>
                <li>Collaboration tools</li>
              </ul>
            </div>
          </div>

          <div class="card bg-base-100 shadow-xl">
            <div class="card-body">
              <h2 class="card-title">Technology</h2>
              <p class="text-base-content/70">
                Built with SolidStart, Three.js, and Convex for a modern, real-time web experience.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
