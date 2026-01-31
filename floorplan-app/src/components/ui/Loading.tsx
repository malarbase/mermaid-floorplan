import { Show, type JSX } from "solid-js";

export type LoadingSize = "xs" | "sm" | "md" | "lg";
export type LoadingVariant = "spinner" | "dots" | "ring" | "ball" | "bars" | "infinity";

export interface LoadingProps {
  /** Size of the loading indicator */
  size?: LoadingSize;
  /** Visual variant of the loading indicator */
  variant?: LoadingVariant;
  /** Custom text to display below the loading indicator */
  text?: string;
  /** Additional CSS classes */
  class?: string;
  /** Whether to show in a full-page centered container */
  fullPage?: boolean;
  /** Whether to show in a card container */
  card?: boolean;
  /** Primary color (uses DaisyUI color classes) */
  color?: "primary" | "secondary" | "accent" | "info" | "success" | "warning" | "error";
}

/**
 * Loading component - displays various loading indicators.
 * 
 * Uses DaisyUI loading styles for consistency.
 * 
 * @example
 * // Simple spinner
 * <Loading />
 * 
 * @example
 * // Full-page loading with text
 * <Loading fullPage text="Loading your projects..." />
 * 
 * @example
 * // Custom size and variant
 * <Loading size="lg" variant="dots" color="primary" />
 */
export function Loading(props: LoadingProps) {
  const size = () => props.size ?? "md";
  const variant = () => props.variant ?? "spinner";
  const color = () => props.color ?? "primary";

  const loadingClasses = () => {
    const classes = ["loading"];
    
    // Size classes
    classes.push(`loading-${size()}`);
    
    // Variant classes
    classes.push(`loading-${variant()}`);
    
    // Color classes
    classes.push(`text-${color()}`);
    
    return classes.join(" ");
  };

  const LoadingIndicator = () => (
    <div class={`flex flex-col items-center justify-center gap-3 ${props.class ?? ""}`}>
      <span class={loadingClasses()}></span>
      <Show when={props.text}>
        <p class="text-base-content/70 text-sm">{props.text}</p>
      </Show>
    </div>
  );

  // Full page variant
  if (props.fullPage) {
    return (
      <div class="min-h-screen flex items-center justify-center bg-base-200">
        <LoadingIndicator />
      </div>
    );
  }

  // Card variant
  if (props.card) {
    return (
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body items-center">
          <LoadingIndicator />
        </div>
      </div>
    );
  }

  // Default inline variant
  return <LoadingIndicator />;
}

/**
 * LoadingSkeleton - placeholder content while loading.
 * 
 * @example
 * <LoadingSkeleton lines={3} />
 */
export interface LoadingSkeletonProps {
  /** Number of skeleton lines to display */
  lines?: number;
  /** Whether to show an avatar placeholder */
  avatar?: boolean;
  /** Whether to show a card skeleton */
  card?: boolean;
  /** Additional CSS classes */
  class?: string;
}

export function LoadingSkeleton(props: LoadingSkeletonProps) {
  const lines = () => props.lines ?? 2;

  if (props.card) {
    return (
      <div class={`card bg-base-100 shadow animate-pulse ${props.class ?? ""}`}>
        <div class="card-body">
          <Show when={props.avatar}>
            <div class="flex items-center gap-3 mb-4">
              <div class="skeleton w-10 h-10 rounded-full"></div>
              <div class="flex-1">
                <div class="skeleton h-4 w-24 mb-2"></div>
                <div class="skeleton h-3 w-16"></div>
              </div>
            </div>
          </Show>
          <div class="skeleton h-4 w-3/4 mb-2"></div>
          <div class="skeleton h-4 w-1/2"></div>
          {Array.from({ length: Math.max(0, lines() - 2) }).map(() => (
            <div class="skeleton h-3 w-full mt-2"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div class={`space-y-2 ${props.class ?? ""}`}>
      <Show when={props.avatar}>
        <div class="flex items-center gap-3 mb-4">
          <div class="skeleton w-10 h-10 rounded-full"></div>
          <div class="flex-1">
            <div class="skeleton h-4 w-24 mb-2"></div>
            <div class="skeleton h-3 w-16"></div>
          </div>
        </div>
      </Show>
      {Array.from({ length: lines() }).map((_, i) => (
        <div class={`skeleton h-4 ${i === 0 ? "w-3/4" : i === lines() - 1 ? "w-1/2" : "w-full"}`}></div>
      ))}
    </div>
  );
}

/**
 * PageLoading - standard full-page loading state.
 */
export function PageLoading(props: { text?: string }) {
  return (
    <div class="flex justify-center items-center min-h-[60vh]">
      <Loading size="lg" text={props.text ?? "Loading..."} />
    </div>
  );
}

/**
 * InlineLoading - small inline loading indicator.
 */
export function InlineLoading(props: { class?: string }) {
  return <span class={`loading loading-spinner loading-xs ${props.class ?? ""}`}></span>;
}

/**
 * ButtonLoading - loading state specifically for buttons.
 */
export function ButtonLoading(props: { size?: LoadingSize }) {
  return <span class={`loading loading-spinner loading-${props.size ?? "xs"}`}></span>;
}

export default Loading;
