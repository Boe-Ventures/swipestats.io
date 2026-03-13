import Image from "next/image";

interface ImageGridProps {
  images: {
    src: string;
    alt: string;
  }[];
}

const gridClass: Record<number, string> = {
  1: "grid-cols-1 max-w-[250px]",
  2: "grid-cols-2 max-w-lg",
  3: "grid-cols-2 sm:grid-cols-3 max-w-2xl",
};

export function ImageGrid({ images }: ImageGridProps) {
  const cols = Math.min(images.length, 3) as 1 | 2 | 3;

  return (
    <div
      className={`not-prose my-6 mx-auto grid gap-4 ${gridClass[cols]}`}
    >
      {images.map((img, i) => (
        <div key={i} className="overflow-hidden rounded-lg border border-gray-200">
          <Image
            src={img.src}
            alt={img.alt}
            width={300}
            height={600}
            className="h-auto w-full"
          />
        </div>
      ))}
    </div>
  );
}
