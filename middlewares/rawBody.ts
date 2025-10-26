import { Request, Response, NextFunction } from 'express';

// Middleware to capture raw body bytes for strict HMAC verification
// This is essential for GitHub, Slack, and other providers that sign the exact payload bytes
export function rawBodyCapture(
  req: Request & { rawBody?: Buffer },
  res: Response,
  next: NextFunction
) {
  if (req.headers['content-type']?.includes('application/json')) {
    let data = '';
    req.setEncoding('utf8');

    req.on('data', (chunk: string) => {
      data += chunk;
    });

    req.on('end', () => {
      req.rawBody = Buffer.from(data, 'utf8');
      try {
        req.body = JSON.parse(data);
      } catch (error) {
        req.body = {};
      }
      next();
    });
  } else {
    // For non-JSON content types, pass through to default body parser
    next();
  }
}
