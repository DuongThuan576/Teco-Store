import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  app.use(cookieParser());

  app.enableCors({
    origin : ['http://localhost:5173', 'http://localhost:3000'],
    methods : ['GET', 'POST', 'PATCH', 'PUT', 'DELETE']
  });

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true
    }),
  );

  await app.listen(Number(process.env.PORT ?? 5000));
}
void bootstrap();
