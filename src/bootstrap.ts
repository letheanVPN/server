import '@std/dotenv/load';
import { dirname } from "jsr:@std/path";
import { AppModule } from './app.module.ts';
import { DanetApplication } from '@danet/core';
import { loggerMiddleware } from './logger.middleware.ts';
import { SpecBuilder, SwaggerModule } from '@danet/swagger';
export const bootstrap = async () => {
  const application = new DanetApplication();
  await application.init(AppModule);

  const staticAssetsPath = `${dirname(import.meta.dirname?import.meta.dirname:Deno.cwd())}/include`;
  application.useStaticAssets(staticAssetsPath);
  const spec = new SpecBuilder()
    .setTitle('Todo')
    .setDescription('The todo API')
    .setVersion('1.0')
    .build();
  const document = await SwaggerModule.createDocument(application, spec);
  await SwaggerModule.setup('api', application, document);
  application.addGlobalMiddlewares(loggerMiddleware);
  return application;
};
