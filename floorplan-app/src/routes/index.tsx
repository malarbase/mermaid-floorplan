import { Title } from "@solidjs/meta";
import { A } from "@solidjs/router";
import { Show, createMemo } from "solid-js";
import { useSession } from "~/lib/auth-client";
import { Header } from "~/components/Header";

/**
 * Home page - public landing page.
 */
export default function Home() {
  const sessionSignal = useSession();
  const session = createMemo(() => sessionSignal());
  const isLoggedIn = createMemo(() => session()?.data != null);

  return (
    <main class="min-h-screen bg-base-200">
      <Title>Floorplan - Design Beautiful Spaces</Title>

      {/* Header */}
      <Header variant="transparent" />

      {/* Hero Section */}
      <div class="hero min-h-[80vh] md:min-h-[70vh] px-4">
        <div class="hero-content text-center">
          <div class="max-w-2xl">
            <h1 class="text-3xl sm:text-4xl md:text-5xl font-bold">
              Design Beautiful Floorplans
            </h1>
            <p class="py-4 sm:py-6 text-base sm:text-lg text-base-content/70">
              Create, visualize, and share architectural floorplans with our 
              intuitive DSL-powered 3D designer. Write simple text, see stunning results.
            </p>
            
            <div class="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center w-full sm:w-auto">
              <Show
                when={isLoggedIn()}
                fallback={
                  <>
                    <A href="/login" class="btn btn-primary btn-md sm:btn-lg w-full sm:w-auto">
                      Get Started
                    </A>
                    <a href="#demo" class="btn btn-outline btn-md sm:btn-lg w-full sm:w-auto">
                      See Demo
                    </a>
                  </>
                }
              >
                <A href="/dashboard" class="btn btn-primary btn-md sm:btn-lg w-full sm:w-auto">
                  Go to Dashboard
                </A>
                <A href="/new" class="btn btn-outline btn-md sm:btn-lg w-full sm:w-auto">
                  Create New Project
                </A>
              </Show>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <section class="py-10 sm:py-16 px-4" id="demo">
        <div class="max-w-6xl mx-auto">
          <h2 class="text-2xl sm:text-3xl font-bold text-center mb-8 sm:mb-12">
            Powerful Features
          </h2>
          
          <div class="grid gap-4 sm:gap-6 md:gap-8 md:grid-cols-3">
            <div class="card bg-base-100 shadow-xl">
              <div class="card-body p-5 sm:p-6">
                <h3 class="card-title text-base sm:text-lg">Simple DSL</h3>
                <p class="text-sm sm:text-base">
                  Write floorplans using an intuitive domain-specific language. 
                  No complex CAD software needed.
                </p>
              </div>
            </div>

            <div class="card bg-base-100 shadow-xl">
              <div class="card-body p-5 sm:p-6">
                <h3 class="card-title text-base sm:text-lg">3D Visualization</h3>
                <p class="text-sm sm:text-base">
                  See your designs come to life with real-time 3D rendering. 
                  Explore from any angle.
                </p>
              </div>
            </div>

            <div class="card bg-base-100 shadow-xl">
              <div class="card-body p-5 sm:p-6">
                <h3 class="card-title text-base sm:text-lg">Cloud Storage</h3>
                <p class="text-sm sm:text-base">
                  Save your projects to the cloud. Share with clients or 
                  collaborate with your team.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section class="py-10 sm:py-16 px-4 bg-primary text-primary-content">
        <div class="max-w-4xl mx-auto text-center">
          <h2 class="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4">
            Ready to design your space?
          </h2>
          <p class="mb-6 sm:mb-8 text-primary-content/80 text-sm sm:text-base">
            Sign up for free and start creating beautiful floorplans today.
          </p>
          <Show
            when={!isLoggedIn()}
            fallback={
              <A href="/dashboard" class="btn btn-md sm:btn-lg bg-base-100 text-base-content hover:bg-base-200 w-full sm:w-auto">
                Go to Dashboard
              </A>
            }
          >
            <A href="/login" class="btn btn-md sm:btn-lg bg-base-100 text-base-content hover:bg-base-200 w-full sm:w-auto">
              Sign Up Free
            </A>
          </Show>
        </div>
      </section>
    </main>
  );
}
