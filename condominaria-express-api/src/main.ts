import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';
import { ApiExceptionFilter } from './common/filters/api-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });

  

  const bodyLimit = process.env.API_BODY_LIMIT || '10mb';

  app.use(json({ limit: bodyLimit }));
  app.use(urlencoded({ extended: true, limit: bodyLimit }));
app.setGlobalPrefix('api');

  app.useGlobalFilters(new ApiExceptionFilter());

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidUnknownValues: false,
      validationError: {
        target: false,
        value: false,
      },
    }),
  );

  app.enableCors({
    origin: [
      'https://condominaria.bacuridigital.com',
      'https://www.condominaria.bacuridigital.com',
    ],
    credentials: true,
  });

  const port = Number(process.env.PORT ?? 3000);

  await app.listen(port, '0.0.0.0');

  console.log(
    `Condominaria Express API rodando em http://localhost:${port}/api`,
  );
}

void bootstrap();
