import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  outputFileTracingIncludes: {
    "/applicant/applications/*/special-order": ["./src/templates/special_order/so-template.docx"],
    "/sds/applications/*/special-order": ["./src/templates/special_order/so-template.docx"],
    "/applicant/pds/\\[versionId\\]/download": [
      "./src/templates/pds/pds-template.xlsx",
    ],
  },
  experimental: {
    agentFeedback: true,
    serverActions: { bodySizeLimit: "51mb" },
  },
};

export default nextConfig;
