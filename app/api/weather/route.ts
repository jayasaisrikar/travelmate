import { NextResponse } from "next/server"; export async function GET(){ return NextResponse.json({ temp: 24, feels_like: 24, description: "Clear", icon: "01d", humidity: 50, wind_speed: 4 }); }
