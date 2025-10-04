# Environment Configuration

## API Base URL Configuration

The application uses environment variables to configure the API base URL for different environments.

### Development
Create a `.env` file in the `client` directory with:
```
VITE_API_BASE_URL=http://localhost:3000/api
```

### Production
For production deployment, set the environment variable:
```
VITE_API_BASE_URL=https://your-backend-url.com/api
```

### Vercel Deployment
If deploying to Vercel, add the environment variable in Vercel dashboard:
- Go to your project settings
- Navigate to Environment Variables
- Add: `VITE_API_BASE_URL` with your backend URL

## Default Behavior
If no environment variable is set, the application defaults to `http://localhost:3000/api` for development.
