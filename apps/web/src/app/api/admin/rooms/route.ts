import { NextResponse } from "next/server";

export async function GET() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
  
  try {
    const response = await fetch(`${apiUrl}/api/admin/rooms`, {
      cache: "no-store", // Always fetch fresh data
    });
    
    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch rooms" },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error proxying admin request:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

