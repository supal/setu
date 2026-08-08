import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const sites = await prisma.site.findMany({
    where: { imageUrl: { not: null }, files: { none: {} } },
    select: { id: true, imageUrl: true, imageMetadata: true },
  });

  for (const site of sites) {
    await prisma.file.create({
      data: { siteId: site.id, url: site.imageUrl!, metadata: site.imageMetadata ?? undefined },
    });
  }

  console.log(`Backfilled ${sites.length} file(s) from sites.image_url.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
