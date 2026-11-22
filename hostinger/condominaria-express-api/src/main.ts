import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { existsSync } from 'node:fs';
import { extname, join } from 'node:path';
import { json, static as serveStatic, urlencoded } from 'express';
import type { NextFunction, Request, Response } from 'express';
import { AppModule } from './app.module';
import { ApiExceptionFilter } from './common/filters/api-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });

  const portalDirectory = join(__dirname, 'portal');
  const portalIndex = join(portalDirectory, 'index.html');

  if (existsSync(portalIndex)) {
    app.use('/portal/demo-config.json', (request: Request, response: Response, next: NextFunction) => {
      if (request.method !== 'GET' || request.path !== '/') return next();

      const roles = ['ADMIN', 'SINDICO', 'FINANCEIRO', 'PORTARIA', 'MANUTENCAO', 'COMUNICACAO', 'CONSELHO', 'MORADOR', 'MORADOR_2'];
      const emails = Object.fromEntries(roles.flatMap((role) => {
        const email = process.env[`VITE_DEMO_EMAIL_${role}`]?.trim();
        return email ? [[role, email]] : [];
      }));

      return response.set('Cache-Control', 'no-store').json({
        emails,
        password: Object.keys(emails).length ? process.env.VITE_PUBLIC_DEMO_PASSWORD ?? '' : '',
      });
    });


    app.use('/portal', serveStatic(portalDirectory));
    app.use('/portal', (request: Request, response: Response, next: NextFunction) => {
      if (
        (request.method !== 'GET' && request.method !== 'HEAD') ||
        request.path.startsWith('/assets/') ||
        extname(request.path) ||
        !request.accepts('html')
      ) {
        return next();
      }

      return response.sendFile(portalIndex);
    });
    app.use((request: Request, response: Response, next: NextFunction) => {
      if (request.method === 'GET' && request.path === '/') {
        return response.redirect('/portal/');
      }

      return next();
    });
  }

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
