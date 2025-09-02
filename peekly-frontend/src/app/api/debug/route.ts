import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    // Check environment variables (without exposing sensitive values)
    const envCheck = {
      hasSynapseKey: !!process.env.SYNAPSE_PRIVATE_KEY,
      hasDatabaseUrl: !!process.env.DATABASE_URL,
      hasPrivyAppId: !!process.env.NEXT_PUBLIC_PRIVY_APP_ID,
      hasClientId: !!process.env.NEXT_PUBLIC_CLIENT_ID,
      nodeEnv: process.env.NODE_ENV,
      synapseKeyLength: process.env.SYNAPSE_PRIVATE_KEY?.length || 0,
      databaseUrlPrefix: process.env.DATABASE_URL?.substring(0, 20) || 'not set'
    };

    return NextResponse.json({
      success: true,
      environment: envCheck,
      message: "Environment check completed"
    });
  } catch (error) {
    console.error("Debug endpoint error:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
