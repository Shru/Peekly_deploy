import { NextRequest, NextResponse } from "next/server";
import { uploadFileToFilecoin } from "../../actions/file-upload";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fileData, description, price, userId, creatorAddress } = body;

    console.log("Upload request received:", {
      hasFileData: !!fileData,
      description,
      price,
      userId,
      creatorAddress,
      fileDataLength: fileData?.length || 0
    });

    // Validate required fields
    if (!fileData || !description || !price || !userId) {
      const missingFields = [];
      if (!fileData) missingFields.push("fileData");
      if (!description) missingFields.push("description");
      if (!price) missingFields.push("price");
      if (!userId) missingFields.push("userId");
      
      console.error("Missing required fields:", missingFields);
      return NextResponse.json(
        { success: false, error: `Missing required fields: ${missingFields.join(", ")}` },
        { status: 400 }
      );
    }

    // Check if SYNAPSE_PRIVATE_KEY is available
    if (!process.env.SYNAPSE_PRIVATE_KEY) {
      console.error("SYNAPSE_PRIVATE_KEY environment variable is not set");
      return NextResponse.json(
        { success: false, error: "Filecoin service not configured. Please contact support." },
        { status: 500 }
      );
    }

    console.log("Starting file upload to Filecoin...");
    
    // Call the existing server action
    const result = await uploadFileToFilecoin({
      fileData,
      description,
      price: parseFloat(price),
      userId,
      creatorAddress,
    });

    console.log("Upload result:", { success: result.success, error: result.error });

    if (result.success) {
      return NextResponse.json(result);
    } else {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("API route error:", error);
    
    let errorMessage = "Internal server error";
    if (error instanceof Error) {
      errorMessage = error.message;
      console.error("Error details:", {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
    }
    
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
