import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import compression from "compression";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { requestSafetyMiddleware } from "./security/request-safety.middleware";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Use Nest's built-in shutdown hooks
  app.enableShutdownHooks();

  app.setGlobalPrefix("api/v1");

  const configService = app.get(ConfigService);

  const corsOrigins = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
    configService.get<string>("FRONTEND_URL"),
  ].filter((url): url is string => Boolean(url));

  app.use(compression({ threshold: 512 }));
  app.use(helmet());
  app.use(cookieParser());
  app.use(requestSafetyMiddleware);
  app.enableCors({ origin: corsOrigins, credentials: true });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle("Shoe Store API")
    .setDescription("Backend API documentation for the Shoe Store")
    .setVersion("1.0")
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("api/docs", app, document, { useGlobalPrefix: false });

  const port = configService.get<number>("PORT", 3001);

  await app.listen(port);
}

void bootstrap();