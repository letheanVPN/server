import { bootstrap } from './src/bootstrap.ts';
import { getAvailablePort } from "jsr:@std/net";

const application = await bootstrap();
await application.listen(Number(Deno.env.get('PORT') || getAvailablePort({preferredPort:36911})));
