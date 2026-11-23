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
  const src = `/brand/illustrations/${scene}.svg`;
  if (scene === "welcome" || scene === "gift" || scene === "help") {
    return (
      <picture className={className}>
        <source
          media="(prefers-reduced-motion: no-preference)"
          srcSet={`/brand/illustrations/${scene}-animated.svg`}
        />
        <Image
          src={src}
          alt=""
          width={width}
          height={height}
          loading={priority ? "eager" : undefined}
          fetchPriority={priority ? "high" : undefined}
          className="size-full object-contain"
        />
      </picture>
    );
  }

  return (
    <Image
      src={src}
      alt=""
      width={width}
      height={height}
      priority={priority}
      className={className}
    />
  );
}
