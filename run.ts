import { bootstrap } from './src/bootstrap.ts';
import { getAvailablePort } from 'jsr:@std/net';
import { Command, EnumType } from '@cliffy/command';
import { HelpCommand } from '@cliffy/command/help';
import { CompletionsCommand } from '@cliffy/command/completions';

import i18next from 'i18next';
import Backend, { FsBackendOptions } from 'i18next-fs-backend';

await i18next
  .use(Backend)
  .init<FsBackendOptions>({
    ns: ['cli'],
    debug: false,
    defaultNS: 'cli',
    fallbackLng: 'en', // use en if detected lng is not available
    saveMissing: Deno.env.has('DEV'), // Save missing if in DEV mode
    backend: {
      loadPath: 'locales/{{lng}}/{{ns}}.json',
      addPath: 'locales/{{lng}}/{{ns}}.missing.json',
    },
  });

const logLevelType = new EnumType(['debug', 'info', 'warn', 'error']);
const denoConfig = JSON.parse(Deno.readTextFileSync('deno.json'));
const currentVersion = denoConfig.version;

await new Command()
  .name('server')
  .version(currentVersion)
  .description('Lethean CLI Server')
  .env('DEV=<enable:boolean>', i18next.t('option.dev'))
  .option('-d, --debug', i18next.t('option.debug'))
  .option('-l, --log-level <level:log-level>', i18next.t('option.log-level'), {
    default: 'info',
  })
  .type('log-level', logLevelType)
  .action(async (options, ...args) => {
    console.log(i18next.t('help.no-command'));
  })
  .command('help', new HelpCommand().global())
  .command('completions', new CompletionsCommand())
  .command(
    'start',
    new Command()
      .description(i18next.t('command.start.description'))
      .option('-p, --port <port:number>', i18next.t('option.port-listen'), {
        default: 36911,
      })
      .action(async (options) => {
        const application = await bootstrap();
        await application.listen(
          getAvailablePort({ preferredPort: options.port }),
        );
      }),
  )
  .parse(Deno.args);
