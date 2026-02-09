// @refresh reload
import { createHandler, StartServer } from "@solidjs/start/server";

export default createHandler(() => (
  <StartServer
    document={({ assets, children, scripts }) => (
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <link rel="icon" href="/favicon.ico" />
          
          {/* Preload critical fonts to prevent FOUC */}
          {/* These load immediately, before CSS is parsed */}
          <link rel="preload" href="/fonts/dm-sans-v17-latin-regular.woff2" as="font" type="font/woff2" crossorigin="" />
          <link rel="preload" href="/fonts/bebas-neue-v16-latin-regular.woff2" as="font" type="font/woff2" crossorigin="" />
          
          {assets}
        </head>
        <body>
          <div id="app">{children}</div>
          {scripts}
        </body>
      </html>
    )}
  />
));
