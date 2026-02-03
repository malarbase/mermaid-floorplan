import { useParams } from "@solidjs/router";
import { Show, Suspense, createMemo } from "solid-js";
import { useQuery } from "convex-solidjs";
import type { FunctionReference } from "convex/server";
import { FloorplanEmbed } from "~/components/FloorplanEmbed";

const api = {
  projects: {
    getPublic: "projects:getPublic" as unknown as FunctionReference<"query">,
  },
};

interface ProjectData {
  snapshot: {
    content: string;
  };
}

/**
 * Embed page for public projects.
 * Route: /embed/:projectId
 *
 * Renders a fullscreen 3D viewer in Basic mode for embedding public floorplans.
 * No authentication required - project must be publicly accessible.
 */
export default function EmbedPage() {
  const params = useParams();

  const projectQuery = useQuery(api.projects.getPublic, () => ({
    projectId: params.projectId,
  }));

  const projectData = createMemo(() => {
    const data = projectQuery.data() as ProjectData | null | undefined;
    return data;
  });

  return (
    <div class="w-screen h-screen bg-base-300">
      <Suspense
        fallback={
          <div class="flex items-center justify-center w-full h-full">
            <div class="text-center">
              <span class="loading loading-spinner loading-lg"></span>
              <p class="mt-4 text-base-content/70">Loading floorplan...</p>
            </div>
          </div>
        }
      >
        <Show
          when={projectData() as ProjectData | null}
          keyed={true}
          fallback={
            <div class="flex items-center justify-center w-full h-full">
              <div class="card bg-base-100 shadow-xl max-w-md">
                <div class="card-body text-center">
                  <h2 class="card-title text-error justify-center">
                    Floorplan Not Found
                  </h2>
                  <p class="text-base-content/60">
                    This floorplan is not available or is not public.
                  </p>
                </div>
              </div>
            </div>
          }
        >
          {(project: ProjectData) => (
            <FloorplanEmbed
              dsl={project.snapshot.content}
              theme="dark"
              withUI={false}
            />
          )}
        </Show>
      </Suspense>
    </div>
  );
}
