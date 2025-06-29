import Cloudflare from "cloudflare";
import { CronJob } from "cron";

const client = new Cloudflare({
  apiEmail: Bun.env.CLOUDFLARE_EMAIL!,
  apiToken: Bun.env.CLOUDFLARE_API_TOKEN!,
});

if (!Bun.env.CLOUDFLARE_EMAIL) {
  throw new Error("CLOUDFLARE_EMAIL is not set");
}
if (!Bun.env.CLOUDFLARE_API_TOKEN) {
  throw new Error("CLOUDFLARE_API_TOKEN is not set");
}
if (!Bun.env.CLOUDFLARE_ZONE_ID) {
  throw new Error("CLOUDFLARE_ZONE_ID is not set");
}

function timeLog(...message: string[]) {
  console.log(`[${new Date().toLocaleString()}] ${message.join(" ")}`);
}

async function updateIp() {
  try {
    timeLog("checking public ip...");
    const publicIp = (await fetch("https://api.ipify.org?format=json").then(
      (res) => res.json(),
    )) as { ip: string };

    timeLog("current public ip: ", publicIp.ip);

    for await (const recordResponse of client.dns.records.list({
      zone_id: Bun.env.CLOUDFLARE_ZONE_ID!,
    })) {
      if (recordResponse.type === "A") {
        if (recordResponse.content !== publicIp.ip) {
          await client.dns.records.edit(recordResponse.id, {
            zone_id: Bun.env.CLOUDFLARE_ZONE_ID!,
            content: publicIp.ip,
          });

          timeLog("cloudflare dns updated!");
        } else {
          timeLog(
            "no update needed. cloudflare dns record is the same as current ip address.",
          );
        }
      }
    }
  } catch (error) {
    console.error(`[${new Date().toLocaleTimeString()}] ${error}`);
    throw error;
  }
}

const job = new CronJob(
  "0 */5 * * * *",
  async () => {
    try {
      await updateIp();
    } catch (error) {
      console.error(`[${new Date().toLocaleTimeString()}] ${error}`);
    }
  },
  null,
  true,
);
job.start();
