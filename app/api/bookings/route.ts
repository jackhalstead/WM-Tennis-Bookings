import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const COURTS = ["Court 1", "Court 2"];
const START_HOUR = 8;
const END_HOUR = 20;

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function sanitizeText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";
  return value.trim().replace(/\s+/g, " ").slice(0, maxLength);
}

function hasValidAdminKey(request: NextRequest) {
  const providedKey = request.headers.get("x-admin-key") || "";
  const expectedKey = process.env.ADMIN_DELETE_KEY || "";
  return Boolean(expectedKey) && providedKey === expectedKey;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const start = searchParams.get("start");
  const end = searchParams.get("end");
  const isAdmin = hasValidAdminKey(request);

  if (!isIsoDate(start) || !isIsoDate(end)) {
    return NextResponse.json({ error: "Valid start and end dates are required." }, { status: 400 });
  }

  const selectColumns = isAdmin
    ? "id, booking_date, court, start_hour, end_hour, name, contact, created_at"
    : "id, booking_date, court, start_hour, end_hour, name";

  const { data, error } = await supabaseAdmin
    .from("bookings")
    .select(selectColumns)
    .gte("booking_date", start)
    .lte("booking_date", end)
    .order("booking_date", { ascending: true })
    .order("court", { ascending: true })
    .order("start_hour", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ bookings: data ?? [] });
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  const bookingDate = body?.bookingDate;
  const court = sanitizeText(body?.court, 30);
  const name = sanitizeText(body?.name, 80);
  const contact = sanitizeText(body?.contact, 120);
  const honeypot = sanitizeText(body?.website, 100);
  const startHour = Number(body?.startHour);
  const endHour = Number(body?.endHour);

  if (honeypot) {
    return NextResponse.json({ error: "Booking rejected." }, { status: 400 });
  }

  if (!isIsoDate(bookingDate)) {
    return NextResponse.json({ error: "A valid booking date is required." }, { status: 400 });
  }

  if (!COURTS.includes(court)) {
    return NextResponse.json({ error: "Invalid court." }, { status: 400 });
  }

  if (!name) {
    return NextResponse.json({ error: "Name is required." }, { status: 400 });
  }

  if (!Number.isInteger(startHour) || !Number.isInteger(endHour) || endHour !== startHour + 1) {
    return NextResponse.json({ error: "Invalid time slot." }, { status: 400 });
  }

  if (startHour < START_HOUR || endHour > END_HOUR) {
    return NextResponse.json({ error: "Booking is outside available hours." }, { status: 400 });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const latest = new Date(today);
  latest.setDate(today.getDate() + 14);

  const selectedDate = new Date(`${bookingDate}T00:00:00`);
  if (Number.isNaN(selectedDate.getTime())) {
    return NextResponse.json({ error: "Invalid booking date." }, { status: 400 });
  }

  if (selectedDate < today || selectedDate > latest) {
    return NextResponse.json({ error: "Bookings are limited to today plus 14 days ahead." }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("bookings")
    .insert({
      booking_date: bookingDate,
      court,
      start_hour: startHour,
      end_hour: endHour,
      name,
      contact: contact || null,
    })
    .select("id, booking_date, court, start_hour, end_hour, name")
    .single();

  if (error) {
    const isConflict = error.code === "23505";
    return NextResponse.json(
      { error: isConflict ? "That slot has already been booked." : error.message },
      { status: isConflict ? 409 : 500 },
    );
  }

  return NextResponse.json({ booking: data }, { status: 201 });
}
