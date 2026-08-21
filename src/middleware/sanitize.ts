import { Request, Response, NextFunction } from "express";

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const clean = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(clean);
  }
  if (isPlainObject(value)) {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      if (key.startsWith("$") || key.includes(".")) continue;
      result[key] = clean(val);
    }
    return result;
  }
  return value;
};

const sanitizeValue = (value: unknown): unknown => clean(value);

const noSqlSanitizer = (req: Request, _res: Response, next: NextFunction) => {
  try {
    if (req.query && Object.keys(req.query).length > 0) {
      const sanitizedQuery = sanitizeValue(req.query);
      Object.defineProperty(req, "query", {
        value: sanitizedQuery,
        writable: true,
        configurable: true,
      });
    }

    if (req.body && isPlainObject(req.body)) {
      req.body = sanitizeValue(req.body) as typeof req.body;
    }

    if (req.params && Object.keys(req.params).length > 0) {
      for (const key of Object.keys(req.params)) {
        const val = req.params[key];
        if (typeof val === "string" && (val.includes("$") || val.includes("."))) {
          req.params[key] = val.replace(/\$/g, "").replace(/\./g, "");
        }
      }
    }
  } catch {
    // never block the request because of sanitization
  }
  next();
};

export default noSqlSanitizer;
