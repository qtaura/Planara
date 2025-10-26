import { Request, Response, NextFunction } from 'express';
import querystring from 'querystring';

// Middleware to capture raw body bytes for strict HMAC verification
// Supports JSON, URL-encoded (Slack slash commands), and text/calendar payloads
export function rawBodyCapture(
  req: Request & { rawBody?: Buffer },
  res: Response,
  next: NextFunction
) {
  const contentType = req.headers['content-type'] || '';

  // Only manually capture for types where providers sign exact bytes
  const isJson = contentType.includes('application/json');
  const isForm = contentType.includes('application/x-www-form-urlencoded');
  const isText = contentType.includes('text/plain') || contentType.includes('text/calendar');

  if (isJson || isForm || isText) {
    let data = '';
    req.setEncoding('utf8');

    req.on('data', (chunk: string) => {
      data += chunk;
    });

    req.on('end', () => {
      req.rawBody = Buffer.from(data, 'utf8');
      try {
        if (isJson) {
          req.body = JSON.parse(data);
        } else if (isForm) {
          req.body = querystring.parse(data);
        } else if (isText) {
          // Provide raw text in body for convenience; keep rawBody for HMAC
          (req as any).text = data;
        }
      } catch (error) {
        req.body = {};
      }
      next();
    });
  } else {
    // For other content types, pass through to default body parser
    next();
  }
}
