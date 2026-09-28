/**
 * Proxy /api/* to the Express server so the browser never talks to GitHub or sees the token.
 * API_URL is read at build time: set it to the Express service's public URL on Render.
 */
const API_URL = (process.env.API_URL || "http://localhost:4000").replace(/\/$/, "");

const nextConfig = {
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${API_URL}/api/:path*` }];
  },
};

export default nextConfig;
