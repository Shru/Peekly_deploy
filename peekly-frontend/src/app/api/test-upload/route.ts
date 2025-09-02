import { NextRequest, NextResponse } from "next/server";
import { uploadFileToFilecoin } from "../../actions/file-upload";

export async function GET(request: NextRequest) {
  try {
    console.log("Testing file upload with small test data...");
    
    // Create a small test file (1KB of text)
    const testContent = "This is a test file for debugging the upload process. ".repeat(20);
    const testFileData = Buffer.from(testContent).toString('base64');
    
    console.log("Test file data created, size:", testFileData.length);

    // Test upload with minimal data
    const result = await uploadFileToFilecoin({
      fileData: testFileData,
      description: "Test upload for debugging",
      price: 0.001,
      userId: "test-user-id", // This will fail at user validation, but we'll see how far it gets
      creatorAddress: "0x1234567890123456789012345678901234567890",
    });

    console.log("Upload test result:", result);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Upload test error:", error);
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
