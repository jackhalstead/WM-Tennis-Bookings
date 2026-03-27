"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Booking = {
  id: string;
  booking_date: string;
  court: "Court 1" | "Court 2";
  start_hour: number;
  end_hour: number;
  name: string;
};

const COURTS = ["Court 1", "Court 2"] as const;
const START_HOUR = 8;
const END_HOUR = 20;
const DAYS_AHEAD = 14;
const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "Community Tennis Court Bookings";

function formatStorageDate(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(date);
}

function formatHour(hour: number) {
  const suffix = hour >= 12 ? "pm" : "am";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:00${suffix}`;
}

function buildDays() {
  const items: Date[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let index = 0; index <= DAYS_AHEAD; index += 1) {
    const date = new Date(today);
    date.setDate(today.getDate() + index);
    items.push(date);
  }

  return items;
}

function buildHours() {
  return Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);
}

function getBookingKey(date: string, court: string, hour: number) {
  return `${date}__${court}__${hour}`;
}

export default function HomePage() {
  const days = useMemo(() => buildDays(), []);
  const hours = useMemo(() => buildHours(), []);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [bookings, setBookings] = useState<Record<string, Booking>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [form, setForm] = useState({ name: "", contact: "", website: "", court: "Court 1", startHour: 8 });

  const startDate = formatStorageDate(days[0]);
  const endDate = formatStorageDate(days[days.length - 1]);
  const selectedDate = days[selectedDayIndex];
  const selectedDateKey = formatStorageDate(selectedDate);

  async function loadBookings() {
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/bookings?start=${startDate}&end=${endDate}`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not load bookings.");

      const nextState: Record<string, Booking> = {};
      for (const booking of payload.bookings as Booking[]) {
        nextState[getBookingKey(booking.booking_date, booking.court, booking.start_hour)] = booking;
      }
      setBookings(nextState);
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Could not load bookings.",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const currentSelection = bookings[getBookingKey(selectedDateKey, form.court, Number(form.startHour))];
    if (!currentSelection) return;

    const firstFreeHour = hours.find((hour) => !bookings[getBookingKey(selectedDateKey, form.court, hour)]);
    if (typeof firstFreeHour === "number") {
      setForm((current) => ({ ...current, startHour: firstFreeHour }));
    }
  }, [bookings, form.court, form.startHour, hours, selectedDateKey]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingDate: selectedDateKey,
          court: form.court,
          startHour: Number(form.startHour),
          endHour: Number(form.startHour) + 1,
          name: form.name,
          contact: form.contact,
          website: form.website,
        }),
      });

      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not create booking.");

      const booking: Booking = payload.booking;
      setBookings((current) => ({
        ...current,
        [getBookingKey(booking.booking_date, booking.court, booking.start_hour)]: booking,
      }));
      setForm({ name: "", contact: "", website: "", court: "Court 1", startHour: 8 });
      setMessage({ type: "success", text: "Booking confirmed." });
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Could not create booking.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  function slotIsBooked(court: string, hour: number) {
    return bookings[getBookingKey(selectedDateKey, court, hour)];
  }

  const selectedSlotBooked = Boolean(slotIsBooked(form.court, Number(form.startHour)));
  const allSlotsBookedForCourt = hours.every((hour) => Boolean(slotIsBooked(form.court, hour)));

  return (
    <main className="page">
      <div className="shell">
        <section className="card header">
          <div className="topbar">
            <div>
              <h1>{APP_NAME}</h1>
              <p>
                Book one-hour tennis court slots for today and the next 14 days. No account is needed.
              </p>
            </div>
            <Link href="/admin" className="secondary nav-link">
              Admin
            </Link>
          </div>
          <div className="badges">
            <span className="badge">2 courts</span>
            <span className="badge">8am to 8pm</span>
            <span className="badge">15-day rolling view</span>
            <span className="badge">Contact optional</span>
          </div>
        </section>

        <section className="card">
          <div className="day-strip">
            {days.map((day, index) => (
              <button
                key={formatStorageDate(day)}
                className={`day-button ${index === selectedDayIndex ? "active" : ""}`}
                onClick={() => setSelectedDayIndex(index)}
                type="button"
              >
                <span className="day-meta">Day {index + 1}</span>
                <strong>{formatDisplayDate(day)}</strong>
              </button>
            ))}
          </div>
        </section>

        {message ? <div className={`notice ${message.type}`}>{message.text}</div> : null}

        <section className="card form-card">
          <h2>Reserve a slot for {formatDisplayDate(selectedDate)}</h2>
          <p className="muted">Choose a court and a free one-hour slot, then enter your name. Contact details are optional.</p>
          <form className="form" onSubmit={handleSubmit}>
            <label className="label">
              Court
              <select
                className="select"
                value={form.court}
                onChange={(event) => setForm((current) => ({ ...current, court: event.target.value as "Court 1" | "Court 2" }))}
              >
                {COURTS.map((court) => (
                  <option key={court} value={court}>
                    {court}
                  </option>
                ))}
              </select>
            </label>

            <label className="label">
              Start time
              <select
                className="select"
                value={form.startHour}
                onChange={(event) => setForm((current) => ({ ...current, startHour: Number(event.target.value) }))}
                disabled={allSlotsBookedForCourt}
              >
                {hours.map((hour) => {
                  const booking = slotIsBooked(form.court, hour);
                  return (
                    <option key={hour} value={hour} disabled={Boolean(booking)}>
                      {formatHour(hour)} to {formatHour(hour + 1)}{booking ? " — booked" : ""}
                    </option>
                  );
                })}
              </select>
            </label>

            <label className="label">
              Your name
              <input
                className="input"
                required
                maxLength={80}
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="Enter your name"
              />
            </label>

            <label className="label">
              Phone or email
              <input
                className="input"
                maxLength={120}
                value={form.contact}
                onChange={(event) => setForm((current) => ({ ...current, contact: event.target.value }))}
                placeholder="Optional phone number or email"
              />
            </label>

            <label className="label" style={{ display: "none" }} aria-hidden="true">
              Website
              <input
                className="input"
                tabIndex={-1}
                autoComplete="off"
                value={form.website}
                onChange={(event) => setForm((current) => ({ ...current, website: event.target.value }))}
                placeholder="Leave empty"
              />
            </label>

            {allSlotsBookedForCourt ? (
              <div className="notice error">All slots for {form.court} are booked on this date. Please choose the other court or another day.</div>
            ) : null}
            {!allSlotsBookedForCourt && selectedSlotBooked ? (
              <div className="notice error">That slot is no longer available. Please choose another time.</div>
            ) : null}

            <div className="actions">
              <button className="primary" disabled={submitting || allSlotsBookedForCourt || selectedSlotBooked} type="submit">
                {submitting ? "Booking..." : "Confirm booking"}
              </button>
              <button className="secondary" disabled={loading} type="button" onClick={loadBookings}>
                Refresh availability
              </button>
            </div>
          </form>
        </section>

        <section className="courts">
          {COURTS.map((court) => (
            <section key={court} className="card court">
              <h2>{court}</h2>
              {loading ? (
                <div className="spinner">Loading availability...</div>
              ) : (
                <div className="slots">
                  {hours.map((hour) => {
                    const booking = slotIsBooked(court, hour);
                    return (
                      <button key={`${court}-${hour}`} className="slot" disabled type="button">
                        <div>
                          <div className="slot-title">
                            {formatHour(hour)} to {formatHour(hour + 1)}
                          </div>
                          <div className="slot-subtitle">
                            {booking ? `Booked by ${booking.name}` : "Available"}
                          </div>
                        </div>
                        <span className={`pill ${booking ? "booked" : ""}`}>{booking ? "Booked" : "Free"}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
          ))}
        </section>

        <section className="card info">
          <p>
            Bookings are stored in Supabase and served through secure server-side API routes, which makes this ready to deploy on Vercel.
          </p>
          <p>
            Need to cancel or remove a booking? Use the admin page with your admin key.
          </p>
        </section>
      </div>
    </main>
  );
}
