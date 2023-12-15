import {defineConfig, UserConfigExport} from 'vite';

const config: UserConfigExport = {
  base: "/webgpu-raymarching/",
  build: {
    target: "esnext",
  },
};

export default defineConfig(config);
