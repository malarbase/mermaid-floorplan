import { Component } from "solid-js";

export const ViewerSkeleton: Component = () => {
  return (
    <div class="absolute inset-0 flex items-center justify-center bg-base-300">
      <div class="text-center">
        <span class="loading loading-spinner loading-lg text-primary"></span>
        <p class="mt-4 text-base-content/70">Initializing Viewer...</p>
      </div>
    </div>
  );
};

export const ControlPanelsSkeleton: Component = () => {
  return (
    <div class="flex flex-col gap-4 p-4 h-full w-full opacity-50 pointer-events-none">
      <div class="h-8 bg-base-200 rounded w-1/3"></div>
      <div class="h-32 bg-base-200 rounded w-full"></div>
      <div class="h-32 bg-base-200 rounded w-full"></div>
    </div>
  );
};

export const EditorSkeleton: Component = () => {
  return (
    <div class="h-full w-full bg-base-100 flex flex-col p-4 gap-2 opacity-50">
      <div class="h-6 bg-base-200 rounded w-1/4"></div>
      <div class="flex-1 bg-base-200 rounded w-full"></div>
    </div>
  );
};
