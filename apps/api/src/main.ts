import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { AppModule, ObserveInstrument } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    instrument: ObserveInstrument,
  });
  const trustedProxyIps = process.env.TRUSTED_PROXY_IPS
    ?.split(',')
    .map((ip) => ip.trim())
    .filter(Boolean);

  if (trustedProxyIps?.length) {
    app.getHttpAdapter().getInstance().set('trust proxy', trustedProxyIps);
  }

  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.enableCors({
    origin: process.env.WEB_ORIGIN || 'http://localhost:3000',
    credentials: true,
  });
  await app.listen(process.env.PORT ?? 4000);
}
await bootstrap();
