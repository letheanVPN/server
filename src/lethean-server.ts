import { ServerService } from "./services/server.service.ts";

console.log("Starting Lethean Server");
const letheanServer = new ServerService();

letheanServer.warmUpServer().then(() => {
  try {
    if (Deno.args.length) {
      console.log(`Command to run: ${Deno.args.join(" ")}`);
      letheanServer.processCommand(Deno.args).catch((err) => console.log(err));
    } else {
      letheanServer.startServer();
    }
  } catch (e) {
    console.log(e);
  }
}).catch((err) => console.error(err)).finally(() =>
  console.log("Lethean Server Loaded: http://127.0.0.1:36911")
);