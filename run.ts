import { bootstrap } from './src/bootstrap.ts';
import { getAvailablePort } from "jsr:@std/net";
import { Command, EnumType } from "@cliffy/command";
import { HelpCommand } from "@cliffy/command/help";
import { CompletionsCommand } from "@cliffy/command/completions";
import { cursorTo, eraseDown, image, link } from "@cliffy/ansi/ansi-escapes";
import i18next from 'i18next';
import Backend from 'i18next-fs-backend';

i18next.use(Backend).init({
    backend: {
        loadPath: '/locales/{{lng}}/{{ns}}.json',
        addPath: '/locales/{{lng}}/{{ns}}.missing.json',
    },
});

const logLevelType = new EnumType(["debug", "info", "warn", "error"]);
const denoConfig = JSON.parse(Deno.readTextFileSync('deno.json'));
const currentVersion = denoConfig.version;

await new Command()
    .name("server")
    .version(currentVersion)
    .description("Lethean CLI Server")
    .env("EXAMPLE_ENVIRONMENT_VARIABLE=<value:boolean>", "Environment variable description ...")
    .env("DEBUG=<enable:boolean>", "Enable debug output.")
    .option("-d, --debug", "Enable debug output.")
    .option("-l, --log-level <level:log-level>", "Set log level.", {
        default: "info",
    })
    .type("log-level", logLevelType)
    .action(async (options, ...args) => {
        console.log('Run "server help" for more information, or visit our website for guides: ' + link("https://lt.hn/server", "https://lt.hn/server"));
    })
    .command("help", new HelpCommand().global())
    .command("completions", new CompletionsCommand())
    .command("start", new Command()
        .description("Start the server")
        .option("-p, --port <port:number>", "Port to listen on.", {
            default: 36911,
        })
        .action(async (options) => {
            const application = await bootstrap();
            await application.listen(getAvailablePort({preferredPort:options.port}));
        })
    )


    .parse(Deno.args);



