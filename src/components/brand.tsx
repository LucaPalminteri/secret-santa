import Image from "next/image";
export function BrandIllustration({
  scene,
  className,
  priority = false,
}: {
  scene: "welcome" | "gift" | "envelope" | "mail" | "help";
  className?: string;
  priority?: boolean;
}) {
  const dimensions = {
    welcome: [360, 260],
    gift: [100, 110],
    envelope: [160, 115],
    mail: [250, 165],
    help: [360, 220],
  };
  const [width, height] = dimensions[scene];
  return (
    <Image
      src={`/brand/illustrations/${scene}.svg`}
      alt=""
      width={width}
      height={height}
      priority={priority}
      className={className}
    />
  );
}
