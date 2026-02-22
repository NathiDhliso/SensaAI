/**
 * @file proxy.ts
 * @description Proxy routes for handling CORS-restricted external resources
 */
import { Router, Request, Response } from 'express';
import { logger } from '../../../shared/utils/logger.js';
import https from 'https';
import http from 'http';
export const proxyRouter = Router();
/**
 * GET /proxy/exam-objectives
 * Proxy exam objectives PDFs to avoid CORS issues
 */
proxyRouter.get('/exam-objectives', async (req: Request, res: Response) => {
 try {
 const targetUrl = req.query.url as string;
 if (!targetUrl) {
 res.status(400).json({ error: 'URL parameter is required' });
 return;
 }
 // Validate URL is from allowed domains
 const allowedDomains = [
 'awsstatic.com',
 'microsoft.com',
 'cms.rt.microsoft.com',
 'azureedge.net',
 'cloud.google.com',
 'comptia.org',
 'cisco.com'
 ];
 let url: URL;
 try {
 url = new URL(targetUrl);
 } catch (urlError) {
 logger.error('[Proxy] Invalid URL:', targetUrl);
 res.status(400).json({ error: 'Invalid URL' });
 return;
 }
 const isAllowed = allowedDomains.some(domain =>
 url.hostname === domain || url.hostname.endsWith('.' + domain)
 );
 if (!isAllowed) {
 res.status(403).json({ error: 'Domain not allowed' });
 return;
 }
 // Use native https/http module for better compatibility
 const protocol = url.protocol === 'https:' ? https : http;
 return new Promise<void>((resolve, reject) => {
 const request = protocol.get(targetUrl, {
 headers: {
 'User-Agent': 'SensaAI-Learning-Platform/1.0',
 'Accept': 'text/html,application/xhtml+xml,application/xml,text/plain,application/pdf,*/*'
 },
 timeout: 30000, // 30 second timeout
 }, (proxyRes) => {
 // Handle redirects
 if (proxyRes.statusCode === 301 || proxyRes.statusCode === 302 || proxyRes.statusCode === 307 || proxyRes.statusCode === 308) {
 const redirectUrl = proxyRes.headers.location;
 if (redirectUrl) {
 // Validate redirect target is also on the allowlist
 try {
 const redirectParsed = new URL(redirectUrl);
 const redirectAllowed = allowedDomains.some(domain =>
 redirectParsed.hostname === domain || redirectParsed.hostname.endsWith('.' + domain)
 );
 if (!redirectAllowed) {
 res.status(403).json({ error: 'Redirect target domain not allowed' });
 resolve();
 return;
 }
 } catch {
 res.status(400).json({ error: 'Invalid redirect URL' });
 resolve();
 return;
 }
 const redirectProtocol = redirectUrl.startsWith('https') ? https : http;
 const redirectReq = redirectProtocol.get(redirectUrl, {
 headers: {
 'User-Agent': 'SensaAI-Learning-Platform/1.0',
 'Accept': 'text/html,application/xhtml+xml,application/xml,text/plain,application/pdf,*/*'
 },
 timeout: 30000
 }, (redirectRes) => {
 if (redirectRes.statusCode !== 200) {
 logger.error('[Proxy] Redirect fetch failed:', redirectRes.statusCode);
 res.status(redirectRes.statusCode || 500).json({ 
 error: `Failed to fetch resource: ${redirectRes.statusMessage}` 
 });
 resolve();
 return;
 }
 const contentType = redirectRes.headers['content-type'] || 'text/plain';
 res.setHeader('Content-Type', contentType);
 res.setHeader('Cache-Control', 'public, max-age=3600');
 redirectRes.pipe(res);
 redirectRes.on('end', resolve);
 redirectRes.on('error', reject);
 });
 redirectReq.on('error', (err) => {
 logger.error('[Proxy] Redirect request error:', err);
 res.status(500).json({ error: 'Failed to proxy request' });
 resolve();
 });
 return;
 }
 }
 if (proxyRes.statusCode !== 200) {
 res.status(proxyRes.statusCode || 500).json({ 
 error: `Failed to fetch resource: ${proxyRes.statusMessage}` 
 });
 resolve();
 return;
 }
 // Get content type
 const contentType = proxyRes.headers['content-type'] || 'text/plain';
 // Set appropriate headers
 res.setHeader('Content-Type', contentType);
 res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
 // Stream the response
 proxyRes.pipe(res);
 proxyRes.on('end', resolve);
 proxyRes.on('error', reject);
 });
 request.on('error', () => {
 res.status(500).json({ error: 'Failed to proxy request' });
 resolve();
 });
 request.on('timeout', () => {
 logger.error('[Proxy] Request timeout');
 request.destroy();
 res.status(504).json({ error: 'Request timeout' });
 resolve();
 });
 });
 } catch (error) {
 logger.error('[Proxy] Error:', error);
 res.status(500).json({ error: 'Failed to proxy request' });
 }
});
