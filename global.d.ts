// Global declarations for static asset imports
declare module "*.css";
declare module "*.scss";
declare module "*.module.css";
declare module "*.module.scss";

// Static assets used by Next (images/fonts/icons)
declare module "*.svg" {
  const src: string;
  export default src;
}
declare module "*.png";
declare module "*.jpg";
declare module "*.jpeg";
declare module "*.gif";

// Font files
declare module "*.woff";
declare module "*.woff2";
declare module "*.ttf";
declare module "*.eot";

// Other binary assets
declare module "*.mp3";
declare module "*.webp";
