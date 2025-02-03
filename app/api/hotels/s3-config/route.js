export async function GET() {
  const config = {
    environment: process.env.NODE_ENV,
    region: process.env.NEXT_PUBLIC_AWS_REGION,
    bucketName: process.env.NEXT_PUBLIC_AWS_BUCKET_NAME,
    amplifyRole: process.env.AWS_ROLE_ARN || 'Not configured',
    isAmplify: !!process.env.AWS_EXECUTION_ENV?.includes('AWS_Lambda_'),
    isDev: process.env.NODE_ENV === 'development'
  };

  return Response.json(config);
} 