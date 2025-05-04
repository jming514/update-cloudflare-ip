import Cloudflare from "cloudflare";
import { CronJob } from "cron";

const client = new Cloudflare({
  apiEmail: Bun.env.CLOUDFLARE_EMAIL!,
  apiToken: Bun.env.CLOUDFLARE_API_TOKEN!,
});

async function updateIp() {
  try {
    const publicIp = (await fetch("https://api.ipify.org?format=json").then(
      (res) => res.json(),
    )) as { ip: string };

    for await (const recordResponse of client.dns.records.list({
      zone_id: Bun.env.CLOUDFLARE_ZONE_ID!,
    })) {
      if (recordResponse.type === "A") {
        if (recordResponse.content !== publicIp.ip) {
          await client.dns.records.edit(recordResponse.id, {
            zone_id: Bun.env.CLOUDFLARE_ZONE_ID!,
            content: publicIp.ip,
          });
        }
      }
    }
  } catch (error) {
    console.error(error);
    throw error;
  }
}

const job = new CronJob(
  "0 * * * * *",
  async () => {
    await updateIp();
  },
  null,
  true,
);
job.start();
