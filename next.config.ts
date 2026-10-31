import type { NextConfig } from "next";

// GitHub Pages: статическая выгрузка в out/, сайт живёт по адресу /neuropilot
const isPages = process.env.GITHUB_ACTIONS === "true";

const config: NextConfig = {
  output: "export",
  basePath: isPages ? "/neuropilot" : "",
  images: { unoptimized: true },
};

export default config;
