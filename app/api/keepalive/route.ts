import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    return NextResponse.json({ ok: false });
  }

  const supabase = createClient(url, key);

  // simple query to keep Supabase awake
  await supabase.from("bookings").select("id").limit(1);

  return NextResponse.json({ ok: true });
}
