import { Title } from "@solidjs/meta";
import { A } from "@solidjs/router";
import { Show, createMemo } from "solid-js";
import { useSession } from "~/lib/auth-client";
import { Header } from "~/components/Header";
import { FeaturedProjectViewer } from "~/components/FeaturedProjectViewer";

/**
 * Home page - public landing page.
 */
export default function Home() {
  const sessionSignal = useSession();
  const session = createMemo(() => sessionSignal());
  const isLoggedIn = createMemo(() => session()?.data != null);

  return (
    <main class="min-h-screen app-container">
      <Title>Floorplan - Design Beautiful Spaces</Title>

      <Header variant="transparent" />

      <div class="hero min-h-screen px-4 pt-24 pb-12 relative overflow-hidden">
        <div class="absolute inset-0 opacity-20 pointer-events-none" style={{
          background: `radial-gradient(circle at 50% 30%, oklch(75% 0.18 195 / 0.3) 0%, transparent 50%)`
        }} />
        
        <div class="max-w-7xl mx-auto w-full grid lg:grid-cols-2 gap-12 items-center relative z-10">
          {/* Left Column: Text Content */}
          <div class="text-center lg:text-left">
            <h1 class="text-5xl sm:text-6xl md:text-8xl tracking-wide leading-none mb-6" style={{ "font-family": "'Bebas Neue', sans-serif" }}>
              ARCHITECTURAL
              <span class="block text-gradient-primary">FLOORPLAN DESIGN</span>
            </h1>
            <p class="py-6 text-lg sm:text-xl text-base-content/70 max-w-xl mx-auto lg:mx-0 leading-relaxed" style={{ "font-family": "'DM Sans', sans-serif" }}>
              Create, visualize, and share architectural floorplans with our 
              intuitive DSL-powered 3D designer. Write simple text, see stunning results.
            </p>
            
            <div class="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start w-full sm:w-auto">
              <Show
                when={isLoggedIn()}
                fallback={
                  <>
                    <A href="/login" class="btn btn-primary btn-lg w-full sm:w-auto glow-accent">
                      Get Started
                    </A>
                    <a href="#demo" class="btn btn-outline btn-lg w-full sm:w-auto border-glow">
                      Learn More
                    </a>
                  </>
                }
              >
                <A href="/dashboard" class="btn btn-primary btn-lg w-full sm:w-auto glow-accent">
                  Go to Dashboard
                </A>
                <A href="/new" class="btn btn-outline btn-lg w-full sm:w-auto border-glow">
                  Create New Project
                </A>
              </Show>
            </div>
          </div>

          {/* Right Column: 3D Viewer */}
          <div class="w-full h-[500px] lg:h-[600px] perspective-1000">
            <FeaturedProjectViewer />
          </div>
        </div>
      </div>

      <section class="py-16 sm:py-24 px-4 relative" id="demo">
        <div class="max-w-6xl mx-auto">
          <h2 class="text-3xl sm:text-4xl text-center mb-12 sm:mb-16 tracking-wide" style={{ "font-family": "'Bebas Neue', sans-serif" }}>
            POWERFUL FEATURES
          </h2>
          
          <div class="grid gap-6 md:gap-8 md:grid-cols-3">
            <div class="project-card p-6 sm:p-8 card-hover">
              <div class="w-12 h-12 rounded-lg flex items-center justify-center mb-4" style={{ background: "oklch(75% 0.18 195 / 0.15)" }}>
                <svg class="w-6 h-6" style={{ color: "oklch(75% 0.18 195)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
              </div>
              <h3 class="text-xl font-semibold mb-2" style={{ "font-family": "'DM Sans', sans-serif" }}>Simple DSL</h3>
              <p class="text-base-content/60">
                Write floorplans using an intuitive domain-specific language. 
                No complex CAD software needed.
              </p>
            </div>

            <div class="project-card p-6 sm:p-8 card-hover">
              <div class="w-12 h-12 rounded-lg flex items-center justify-center mb-4" style={{ background: "oklch(75% 0.18 195 / 0.15)" }}>
                <svg class="w-6 h-6" style={{ color: "oklch(75% 0.18 195)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />
                </svg>
              </div>
              <h3 class="text-xl font-semibold mb-2" style={{ "font-family": "'DM Sans', sans-serif" }}>3D Visualization</h3>
              <p class="text-base-content/60">
                See your designs come to life with real-time 3D rendering. 
                Explore from any angle.
              </p>
            </div>

            <div class="project-card p-6 sm:p-8 card-hover">
              <div class="w-12 h-12 rounded-lg flex items-center justify-center mb-4" style={{ background: "oklch(75% 0.18 195 / 0.15)" }}>
                <svg class="w-6 h-6" style={{ color: "oklch(75% 0.18 195)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                </svg>
              </div>
              <h3 class="text-xl font-semibold mb-2" style={{ "font-family": "'DM Sans', sans-serif" }}>Cloud Storage</h3>
              <p class="text-base-content/60">
                Save your projects to the cloud. Share with clients or 
                collaborate with your team.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section class="py-16 sm:py-24 px-4 relative bg-base-200">
        <div class="max-w-4xl mx-auto text-center">
          <h2 class="text-3xl sm:text-4xl mb-4 tracking-wide" style={{ "font-family": "'Bebas Neue', sans-serif" }}>
            READY TO DESIGN YOUR SPACE?
          </h2>
          <p class="mb-8 text-base-content/60 max-w-xl mx-auto" style={{ "font-family": "'DM Sans', sans-serif" }}>
            Sign up for free and start creating beautiful floorplans today.
          </p>
          <Show
            when={!isLoggedIn()}
            fallback={
              <A href="/dashboard" class="btn btn-primary btn-lg glow-accent">
                Go to Dashboard
              </A>
            }
          >
            <A href="/login" class="btn btn-primary btn-lg glow-accent">
              Sign Up Free
            </A>
          </Show>
        </div>
      </section>
    </main>
  );
}
