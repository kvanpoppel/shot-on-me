# 🚀 Deployment Guide

## Pre-Deployment Checklist

### 1. Environment Variables

Create `.env.production` file in the `backend` directory:

```bash
cp backend/.env.production.example backend/.env.production
```

Fill in all required values:
- ✅ MongoDB connection string
- ✅ JWT secret (generate a strong random string)
- ✅ Stripe keys (production keys)
- ✅ Twilio credentials
- ✅ Cloudinary credentials
- ✅ CORS origins

### 2. Security Checklist

- [ ] Change all default passwords/secrets
- [ ] Use strong JWT secret (32+ characters)
- [ ] Enable HTTPS/SSL
- [ ] Verify CORS origins are correct
- [ ] Review rate limiting settings
- [ ] Check security headers are enabled

### 3. Database Setup

- [ ] MongoDB Atlas cluster created
- [ ] Database user created with proper permissions
- [ ] IP whitelist configured
- [ ] Connection string tested
- [ ] Backup strategy configured

### 4. Third-Party Services

- [ ] Stripe account activated
- [ ] Stripe webhook endpoint configured
- [ ] Twilio account with credits
- [ ] Cloudinary account set up
- [ ] Google Maps API key (production)

## Deployment Options

### Option 1: Render.com (Recommended)

1. **Create Backend Service**
   - Connect your GitHub repository
   - Select "Web Service"
   - Build command: `cd backend && npm install && npm run build`
   - Start command: `cd backend && npm start`
   - Environment: Node.js
   - Add all environment variables from `.env.production`

2. **Create Frontend Services**
   - Shot On Me App: Next.js service
   - Venue Portal: Next.js service
   - Add environment variables for each

3. **Configure**
   - Set `NODE_ENV=production`
   - Enable auto-deploy from main branch
   - Set up custom domains

### Option 2: Vercel (For Frontend)

1. **Deploy Shot On Me App**
   ```bash
   cd shot-on-me
   vercel --prod
   ```

2. **Deploy Venue Portal**
   ```bash
   cd venue-portal
   vercel --prod
   ```

3. **Configure Environment Variables**
   - Add all `NEXT_PUBLIC_*` variables in Vercel dashboard

### Option 3: AWS/DigitalOcean

1. **Set up server**
   - Ubuntu 20.04+ recommended
   - Install Node.js 18+
   - Install PM2: `npm install -g pm2`

2. **Deploy Backend**
   ```bash
   cd backend
   npm install --production
   pm2 start server.js --name shot-on-me-api
   pm2 save
   pm2 startup
   ```

3. **Set up Nginx reverse proxy**
   - Configure SSL with Let's Encrypt
   - Proxy requests to Node.js app

## Post-Deployment

### 1. Verify Services

- [ ] Backend health check: `https://api.yourdomain.com/health`
- [ ] Frontend apps load correctly
- [ ] API endpoints respond
- [ ] Database connection works

### 2. Test Critical Flows

- [ ] User registration
- [ ] User login
- [ ] Payment sending
- [ ] Check-in functionality
- [ ] Venue creation
- [ ] Promotion creation

### 3. Monitoring Setup

- [ ] Set up error tracking (Sentry recommended)
- [ ] Configure uptime monitoring
- [ ] Set up log aggregation
- [ ] Configure alerts

### 4. Performance Testing

- [ ] Load test API endpoints
- [ ] Test rate limiting
- [ ] Verify database performance
- [ ] Check PWA functionality

## Environment-Specific Configuration

### Development
```bash
NODE_ENV=development
PORT=5000
# Use local MongoDB or development cluster
```

### Staging
```bash
NODE_ENV=staging
PORT=5000
# Use staging MongoDB cluster
# Use test Stripe keys
```

### Production
```bash
NODE_ENV=production
PORT=5000
# Use production MongoDB cluster
# Use live Stripe keys
# Enable all security features
```

## Security Best Practices

1. **Never commit `.env` files**
2. **Use strong, unique secrets**
3. **Enable HTTPS everywhere**
4. **Regular security updates**
5. **Monitor for suspicious activity**
6. **Regular backups**
7. **Access logging enabled**

## Troubleshooting

### Backend won't start
- Check environment variables
- Verify MongoDB connection
- Check port availability
- Review error logs

### Database connection fails
- Verify connection string
- Check IP whitelist
- Verify credentials
- Check network connectivity

### API errors
- Check rate limiting logs
- Verify authentication tokens
- Review error logs
- Check database status

## Support

For deployment issues:
1. Check logs: `pm2 logs` or service logs
2. Verify environment variables
3. Test database connection
4. Review error tracking service


