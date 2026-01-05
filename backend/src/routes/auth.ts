import { Router, Request, Response } from 'express';
import { CognitoIdentityProviderClient, GlobalSignOutCommand } from "@aws-sdk/client-cognito-identity-provider";

export const authRouter = Router();

const cognitoClient = new CognitoIdentityProviderClient({ region: process.env.AWS_REGION });

// Exchange auth code for tokens
authRouter.post('/token', async (req: Request, res: Response) => {
    try {
        const { code, redirect_uri } = req.body;

        if (!code || !redirect_uri) {
            res.status(400).json({ error: 'Code and redirect_uri are required' });
            return;
        }

        const cognitoDomain = process.env.COGNITO_DOMAIN;
        const awsRegion = process.env.AWS_REGION;

        console.log('Auth Debug:', {
            hasDomain: !!cognitoDomain,
            hasRegion: !!awsRegion,
            domain: cognitoDomain,
            region: awsRegion,
            client_id: process.env.COGNITO_CLIENT_ID
        });

        if (!cognitoDomain || !awsRegion) {
            console.error('Missing configuration:', { cognitoDomain, awsRegion });
            res.status(500).json({ error: 'Server configuration error: Missing Cognito settings' });
            return;
        }

        const params = new URLSearchParams();
        params.append('grant_type', 'authorization_code');
        params.append('client_id', process.env.COGNITO_CLIENT_ID || '');
        params.append('code', code);
        params.append('redirect_uri', redirect_uri);

        // Construct token endpoint, handling both full domain and prefix-only configurations
        const domain = process.env.COGNITO_DOMAIN || '';
        const region = process.env.AWS_REGION || 'us-east-1';

        let baseUrl = domain;
        // Remove protocol if present
        baseUrl = baseUrl.replace(/^https?:\/\//, '');
        // Remove trailing slash if present
        baseUrl = baseUrl.replace(/\/$/, '');

        // If the domain doesn't end with amazoncognito.com, assume it's a prefix
        if (!baseUrl.includes('amazoncognito.com')) {
            baseUrl = `${baseUrl}.auth.${region}.amazoncognito.com`;
        }

        const tokenEndpoint = `https://${baseUrl}/oauth2/token`;

        console.log('Auth Debug: Using token endpoint:', tokenEndpoint);
        console.log('Auth Debug: Request params:', {
            client_id: process.env.COGNITO_CLIENT_ID,
            redirect_uri: redirect_uri,
            code_length: code.length
        });

        // Direct call to Cognito Token Endpoint
        const response = await fetch(tokenEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: params
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Cognito token exchange failed. Status:', response.status);
            console.error('Cognito Error Body:', errorText);
            res.status(response.status).json({ error: 'Failed to exchange token', details: errorText });
            return;
        }

        const data = await response.json();
        console.log('Auth Debug: Token exchange successful');
        res.json(data);

    } catch (error) {
        console.error('Token exchange error:', error);
        res.status(500).json({ error: 'Internal server error while exchanging token' });
    }
});

// Refresh tokens
authRouter.post('/refresh', async (req: Request, res: Response) => {
    try {
        const { refresh_token } = req.body;

        if (!refresh_token) {
            res.status(400).json({ error: 'Refresh token is required' });
            return;
        }

        const params = new URLSearchParams();
        params.append('grant_type', 'refresh_token');
        params.append('client_id', process.env.COGNITO_CLIENT_ID || '');
        params.append('refresh_token', refresh_token);

        // Reuse logic for domain construction
        const domain = process.env.COGNITO_DOMAIN || '';
        const region = process.env.AWS_REGION || 'us-east-1';

        let baseUrl = domain;
        baseUrl = baseUrl.replace(/^https?:\/\//, '');
        baseUrl = baseUrl.replace(/\/$/, '');

        if (!baseUrl.includes('amazoncognito.com')) {
            baseUrl = `${baseUrl}.auth.${region}.amazoncognito.com`;
        }

        const tokenEndpoint = `https://${baseUrl}/oauth2/token`;

        const response = await fetch(tokenEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: params
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Cognito token refresh failed:', errorText);
            res.status(response.status).json({ error: 'Failed to refresh token', details: errorText });
            return;
        }

        const data = await response.json();
        res.json(data);

    } catch (error) {
        console.error('Token refresh error:', error);
        res.status(500).json({ error: 'Internal server error while refreshing token' });
    }
});

// Logout (optional - mostly handled by frontend redirect)
authRouter.post('/logout', async (req: Request, res: Response) => {
    try {
        const { access_token } = req.body;

        if (access_token) {
            const command = new GlobalSignOutCommand({
                AccessToken: access_token
            });
            await cognitoClient.send(command);
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Logout error:', error);
        // Don't fail the request if logout fails, just log it
        res.json({ success: true });
    }
});
