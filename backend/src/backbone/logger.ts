import type { BaseLogger, Bindings, LevelWithSilent, LogFn, Logger as PinoInstance } from "pino";
import pino from "pino";

export interface ILogger extends BaseLogger {
  child(bindings?: Bindings): ILogger;
}

function loggerOptions() {
  const environment = process.env["NODE_ENV"] || "development";
  const found = envToLogger[environment];
  const level = process.env["LOG_LEVEL"];
  if (level) {
    return {
      ...found,
      level: level
    };
  }
  return found;
}

const envToLogger: Record<string, any> = {
  development: {
    level: "info",
    transport: {
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "HH:MM:ss Z",
        ignore: "pid,hostname"
      }
    }
  },
  production: {
    level: "info"
  },
  test: {
    level: "silent"
  }
};

export class Logger implements ILogger {
  readonly level: LevelWithSilent | string;
  readonly debug: LogFn;
  readonly error: LogFn;
  readonly fatal: LogFn;
  readonly info: LogFn;
  readonly silent: LogFn;
  readonly trace: LogFn;
  readonly warn: LogFn;

  constructor(private readonly instance: PinoInstance = pino(loggerOptions())) {
    this.level = instance.level;
    this.debug = instance.debug.bind(instance);
    this.error = instance.error.bind(instance);
    this.fatal = instance.fatal.bind(instance);
    this.info = instance.info.bind(instance);
    this.silent = instance.silent.bind(instance);
    this.trace = instance.trace.bind(instance);
    this.warn = instance.warn.bind(instance);
  }

  child(bindings: Bindings = {}): ILogger {
    return new Logger(this.instance.child(bindings));
  }
}
