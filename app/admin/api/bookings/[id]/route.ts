import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function hasValidAdminKey(request: NextRequest) {
  const adminKey = request.headers.get("x-admin-key") || "";
  const expectedKey = process.env.ADMIN_DELETE_KEY || "";
  return Boolean(expectedKey) && adminKey === expectedKey;
}

function sanitizeText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";
  return value.trim().replace(/\s+/g, " ").slice(0, maxLength);
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  if (!hasValidAdminKey(request)) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const body = await request.json();
  const { id } = await context.params;
  const name = sanitizeText(body?.name, 80);
  const contact = sanitizeText(body?.contact, 120);

  if (!name) {
    return NextResponse.json({ error: "Name is required." }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("bookings")
    .update({ name, contact: contact || null })
    .eq("id", id)
    .select("id, booking_date, court, start_hour, end_hour, name, contact, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ booking: data });
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  if (!hasValidAdminKey(request)) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const { id } = await context.params;

  const { error } = await supabaseAdmin.from("bookings").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
