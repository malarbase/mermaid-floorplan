import type { JSX } from 'solid-js';

/**
 * A link-styled button that performs a full page navigation (hard reload)
 * instead of client-side SPA routing.
 *
 * Use this in error states, not-found pages, and access-denied screens where:
 * 1. The SPA router may be in a broken or stale state
 * 2. Old route effects could interfere with client-side navigation
 * 3. A clean page load is needed to reset all reactive state
 *
 * For normal in-app navigation, use `<A>` from @solidjs/router instead.
 */
export function HardNavigate(props: {
  /** Target URL to navigate to */
  href: string;
  /** Button style classes (e.g. "btn btn-primary") */
  class?: string;
  /** Button contents */
  children: JSX.Element;
}) {
  return (
    <button
      type="button"
      class={props.class}
      onClick={() => {
        window.location.href = props.href;
      }}
    >
      {props.children}
    </button>
  );
}
