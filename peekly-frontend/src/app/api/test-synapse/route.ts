import { NextRequest, NextResponse } from "next/server";
import { Synapse } from "@filoz/synapse-sdk";

export async function GET(request: NextRequest) {
  try {
    console.log("Testing Synapse SDK initialization...");
    
    // Test 1: Check if private key is available
    if (!process.env.SYNAPSE_PRIVATE_KEY) {
      throw new Error("SYNAPSE_PRIVATE_KEY environment variable is not set");
    }
    console.log("Private key is available");

    // Test 2: Try to create Synapse instance
    console.log("Creating Synapse instance...");
    const synapse = await Synapse.create({
      privateKey: process.env.SYNAPSE_PRIVATE_KEY,
      rpcURL: "https://api.calibration.node.glif.io/rpc/v1",
    });
    console.log("Synapse instance created successfully");

    // Test 3: Get network info
    const network = synapse.getNetwork();
    console.log("Network:", network);

    return NextResponse.json({
      success: true,
      network,
      message: "Synapse SDK test successful"
    });
  } catch (error) {
    console.error("Synapse test error:", error);
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
