/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    DB_HOST: process.env.DB_HOST,
    DB_PORT: process.env.DB_PORT,
    DB_NAME: process.env.DB_NAME,
    DB_USER: process.env.DB_USER,
    DB_PASSWORD: process.env.DB_PASSWORD,
    NEXT_PUBLIC_AWS_REGION: process.env.NEXT_PUBLIC_AWS_REGION || 'eu-central-1',
    NEXT_PUBLIC_AWS_BUCKET_NAME: process.env.NEXT_PUBLIC_AWS_BUCKET_NAME,
    DELPHI_AWS_ACCESS_KEY: process.env.DELPHI_AWS_ACCESS_KEY,
    DELPHI_AWS_SECRET_KEY: process.env.DELPHI_AWS_SECRET_KEY,
    HUBSPOT_API_KEY: process.env.HUBSPOT_API_KEY,
    HUBSPOT_EMAIL_TEMPLATE_ID: process.env.HUBSPOT_EMAIL_TEMPLATE_ID,
    EMAIL_FROM_ADDRESS: process.env.EMAIL_FROM_ADDRESS,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET
  }
}

module.exports = nextConfig