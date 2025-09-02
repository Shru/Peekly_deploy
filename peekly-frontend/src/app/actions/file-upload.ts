"use server";
import {
  Synapse,
  RPC_URLS,
  CONTRACT_ADDRESSES,
  TOKENS,
} from "@filoz/synapse-sdk";
import { ethers } from "ethers";
import { prisma } from "../../../lib/prisma";

export interface FileUploadData {
  fileData: string; // Base64 encoded file data
  description: string;
  price: number;
  userId: string; // Add userId to identify the user creating the post
  creatorAddress?: string; // Optional creator address
}

export interface CreatePostData {
  userId: string;
  ipfs: string; // This will store the filecoinId
  description: string;
  price: number;
  creatorAddress?: string;
}

export async function createPost(data: CreatePostData) {
  try {
    // First verify the user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: data.userId },
    });

    if (!existingUser) {
      return {
        success: false,
        error: `User with ID ${data.userId} not found in database`,
      };
    }

    const post = await prisma.post.create({
      data: {
        userId: data.userId,
        ipfs: data.ipfs,
        description: data.description,
        price: data.price,
        creatorAddress: data.creatorAddress,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            address: true,
          },
        },
      },
    });

    return {
      success: true,
      post,
      message: "Post created successfully!",
    };
  } catch (error) {
    console.error("Failed to create post:", error);

    if (error instanceof Error) {
      if (error.message.includes("Foreign key constraint")) {
        return {
          success: false,
          error:
            "User not found in database. Please sign out and sign in again.",
        };
      }
    }

    return {
      success: false,
      error: "Failed to create post in database",
    };
  }
}

export async function createPostOnly(data: CreatePostData) {
  try {
    // First verify the user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: data.userId },
    });

    if (!existingUser) {
      return {
        success: false,
        error: `User with ID ${data.userId} not found in database`,
      };
    }

    const post = await prisma.post.create({
      data: {
        userId: data.userId,
        ipfs: data.ipfs,
        description: data.description,
        price: data.price,
        creatorAddress: data.creatorAddress,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            address: true,
          },
        },
      },
    });

    return {
      success: true,
      post,
      message: "Post created successfully!",
    };
  } catch (error) {
    console.error("Failed to create post:", error);

    if (error instanceof Error) {
      if (error.message.includes("Foreign key constraint")) {
        return {
          success: false,
          error:
            "User not found in database. Please sign out and sign in again.",
        };
      }
    }

    return {
      success: false,
      error: "Failed to create post in database",
    };
  }
}

export async function uploadFileToFilecoin(data: FileUploadData) {
  try {
    console.log("Starting uploadFileToFilecoin with data:", {
      hasFileData: !!data.fileData,
      description: data.description,
      price: data.price,
      userId: data.userId,
      creatorAddress: data.creatorAddress,
      fileDataLength: data.fileData?.length || 0
    });

    // Check if private key is available
    if (!process.env.SYNAPSE_PRIVATE_KEY) {
      throw new Error("SYNAPSE_PRIVATE_KEY environment variable is not set");
    }

    // Convert base64 data back to buffer
    const fileBuffer = Buffer.from(data.fileData, "base64");
    console.log("File buffer created, size:", fileBuffer.length);

    console.log("Creating Synapse instance...");
    // Create Synapse instance
    const synapse = await Synapse.create({
      withCDN: true,
      privateKey: process.env.SYNAPSE_PRIVATE_KEY,
      rpcURL: "https://api.calibration.node.glif.io/rpc/v1",
    });
    console.log("Synapse instance created successfully");
    // const amount = ethers.parseUnits("8", 18); // 8 USDFC
    // await synapse.payments.deposit(amount, TOKENS.USDFC);

    // Check current allowance
    console.log("Checking current allowance...");
    const paymentsContract = CONTRACT_ADDRESSES.PAYMENTS[synapse.getNetwork()];
    const currentAllowance = await synapse.payments.allowance(
      TOKENS.USDFC,
      paymentsContract
    );
    console.log("Current allowance", currentAllowance);

    // 2. Approve the Pandora service for automated payments
    console.log("Approving Pandora service...");
    const pandoraAddress =
      CONTRACT_ADDRESSES.PANDORA_SERVICE[synapse.getNetwork()];
    await synapse.payments.approveService(
      pandoraAddress,
      ethers.parseUnits("10", 18), // Rate allowance: 10 USDFC per epoch
      ethers.parseUnits("1000", 18) // Lockup allowance: 1000 USDFC total
    );
    console.log("Pandora service approved");

    // Create storage service
    console.log("Creating storage service...");
    const storage = await synapse.createStorage();
    console.log("Storage service created");

    // Upload file to Filecoin
    console.log("Uploading file to Filecoin...");
    const uploadResult = await storage.upload(fileBuffer);
    console.log("Upload result", uploadResult);
    const fileCoinCid = String(uploadResult.commp);
    console.log("Filecoin CID", fileCoinCid);

    // Generate a unique file ID
    const fileId = `file_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    // Ensure commp is converted to string
    const commp = String(uploadResult.commp);

    // Create post in database with the filecoinId as IPFS
    const postResult = await createPost({
      userId: data.userId,
      ipfs: commp, // Store the filecoinId as IPFS
      description: data.description,
      price: data.price,
      creatorAddress: data.creatorAddress,
    });

    if (!postResult.success) {
      throw new Error("Failed to create post in database");
    }

    return {
      success: true,
      fileId,
      commp,
      post: postResult.post,
      message: "File uploaded to Filecoin and post created successfully!",
    };
  } catch (error) {
    console.error("Server-side file upload failed:", error);
    console.error("Error details:", {
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined
    });

    let errorMessage = "File upload failed";

    if (error instanceof Error) {
      if (error.message.includes("SYNAPSE_PRIVATE_KEY environment variable is not set")) {
        errorMessage = "Filecoin service not configured. Please contact support.";
      } else if (error.message.includes("No Pandora service address configured")) {
        errorMessage =
          "Network configuration error. Please use calibration testnet or configure a valid RPC URL with Pandora service.";
      } else if (error.message.includes("RetCode=33")) {
        errorMessage =
          "Insufficient testnet FIL tokens or account not initialized. Please get testnet FIL from a faucet.";
      } else if (error.message.includes("Failed to create proof set")) {
        errorMessage =
          "Storage service creation failed. This usually means insufficient testnet FIL tokens or network issues.";
      } else if (error.message.includes("Failed to send transaction")) {
        errorMessage =
          "Transaction failed. Check your private key and ensure you have testnet FIL tokens.";
      } else if (error.message.includes("Failed to create post in database")) {
        errorMessage =
          "File uploaded but failed to create post in database. Please try again.";
      } else if (error.message.includes("User with ID")) {
        errorMessage = error.message;
      } else {
        errorMessage = `Upload failed: ${error.message}`;
      }
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
}

export async function getUserContent(userId: string) {
  try {
    // First verify the user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      return {
        success: false,
        error: `User with ID ${userId} not found in database`,
      };
    }

    // Fetch all posts created by the user with related data
    const userPosts = await prisma.post.findMany({
      where: {
        userId: userId,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            address: true,
          },
        },
        Like: {
          select: {
            id: true,
            userId: true,
            createdAt: true,
          },
        },
        View: {
          select: {
            id: true,
            userId: true,
            amount: true,
            isBasePay: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            Like: true,
            View: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Calculate total earnings from views
    const totalEarnings = userPosts.reduce((total, post) => {
      const postEarnings = post.View.reduce(
        (sum, view) => sum + view.amount,
        0
      );
      return total + postEarnings;
    }, 0);

    // Calculate total likes received
    const totalLikes = userPosts.reduce(
      (total, post) => total + post._count.Like,
      0
    );

    // Calculate total views received
    const totalViews = userPosts.reduce(
      (total, post) => total + post._count.View,
      0
    );

    return {
      success: true,
      data: {
        posts: userPosts,
        stats: {
          totalPosts: userPosts.length,
          totalEarnings,
          totalLikes,
          totalViews,
        },
        user: {
          id: existingUser.id,
          username: existingUser.username,
          address: existingUser.address,
        },
      },
      message: "User content fetched successfully!",
    };
  } catch (error) {
    console.error("Failed to fetch user content:", error);

    return {
      success: false,
      error: "Failed to fetch user content from database",
    };
  }
}

export async function getUserContentSummary(userId: string) {
  try {
    // First verify the user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      return {
        success: false,
        error: `User with ID ${userId} not found in database`,
      };
    }

    // Get aggregated stats without fetching all post details
    const [postCount, totalEarnings, totalLikes, totalViews] =
      await Promise.all([
        prisma.post.count({
          where: { userId: userId },
        }),
        prisma.view.aggregate({
          where: {
            post: { userId: userId },
          },
          _sum: {
            amount: true,
          },
        }),
        prisma.like.count({
          where: {
            post: { userId: userId },
          },
        }),
        prisma.view.count({
          where: {
            post: { userId: userId },
          },
        }),
      ]);

    return {
      success: true,
      data: {
        stats: {
          totalPosts: postCount,
          totalEarnings: totalEarnings._sum.amount || 0,
          totalLikes,
          totalViews,
        },
        user: {
          id: existingUser.id,
          username: existingUser.username,
          address: existingUser.address,
        },
      },
      message: "User content summary fetched successfully!",
    };
  } catch (error) {
    console.error("Failed to fetch user content summary:", error);

    return {
      success: false,
      error: "Failed to fetch user content summary from database",
    };
  }
}
