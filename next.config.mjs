/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // The JSON store is read/written with node:fs at request time.
    // Keep these out of the bundle trace optimisation so the files stay on disk.
    outputFileTracingIncludes: { '/api/**/*': ['./data/**/*'] },

    // Next spawns parallel workers for static generation. On Windows those
    // workers abort with STATUS_STACK_BUFFER_OVERRUN (0xC0000409) partway
    // through this build; generating in-process is slower but completes.
    workerThreads: false,
    cpus: 1,
  },
};

export default nextConfig;
