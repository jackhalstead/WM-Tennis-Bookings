"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

type Court = "Court 1" | "Court 2";

type Booking = {
  id: string;
  booking_date: string;
  court: Court;
  start_hour: number;
  end_hour: number;
  name: string;
};

const COURTS: readonly Court[] = ["Court 1", "Court 2"];
const START_HOUR = 8;
const END_HOUR = 20;
const DAYS_AHEAD = 14;
const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "West Meon Tennis Court Bookings";

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

function formatLongDate(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
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
  const bookingFormRef = useRef<HTMLDivElement | null>(null);

  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [selectedCourt, setSelectedCourt] = useState<Court>("Court 1");
  const [bookings, setBookings] = useState<Record<string, Booking>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [form, setForm] = useState({ name: "", website: "", court: "Court 1" as Court, startHour: 8 });

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
    setForm((current) => ({ ...current, court: selectedCourt }));
  }, [selectedCourt]);

  useEffect(() => {
    const currentSelection = bookings[getBookingKey(selectedDateKey, selectedCourt, Number(form.startHour))];
    if (!currentSelection) return;

    const firstFreeHour = hours.find((hour) => !bookings[getBookingKey(selectedDateKey, selectedCourt, hour)]);
    if (typeof firstFreeHour === "number") {
      setForm((current) => ({ ...current, court: selectedCourt, startHour: firstFreeHour }));
    }
  }, [bookings, form.startHour, hours, selectedCourt, selectedDateKey]);

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
      setForm((current) => ({ ...current, name: "", website: "" }));
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

  function slotIsBooked(court: Court, hour: number) {
    return bookings[getBookingKey(selectedDateKey, court, hour)];
  }

  function selectSlot(hour: number) {
    setForm((current) => ({ ...current, court: selectedCourt, startHour: hour }));
    setMessage(null);
    bookingFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const selectedSlotBooked = Boolean(slotIsBooked(selectedCourt, Number(form.startHour)));
  const allSlotsBookedForCourt = hours.every((hour) => Boolean(slotIsBooked(selectedCourt, hour)));
  const availableCount = hours.filter((hour) => !slotIsBooked(selectedCourt, hour)).length;

  return (
    <main className="page">
      <div className="shell mobile-shell">
        <section className="card header mobile-header">
          <div className="topbar topbar-mobile">
            <div>
              <h1>{APP_NAME}</h1>
              <p>Simple tennis court booking for members. Choose a day, choose a court, then tap a free time.</p>
            </div>
            <Link href="/admin" className="secondary nav-link">
              Admin
            </Link>
          </div>
        </section>

        <section className="card sticky-controls">
          <div className="day-strip day-strip-mobile">
            {days.map((day, index) => (
              <button
                key={formatStorageDate(day)}
                className={`day-button ${index === selectedDayIndex ? "active" : ""}`}
                onClick={() => setSelectedDayIndex(index)}
                type="button"
              >
                <span className="day-meta">{index === 0 ? "Today" : `Day ${index + 1}`}</span>
                <strong>{formatDisplayDate(day)}</strong>
              </button>
            ))}
          </div>

          <div className="court-toggle" role="tablist" aria-label="Choose court">
            {COURTS.map((court) => (
              <button
                key={court}
                type="button"
                className={`court-tab ${selectedCourt === court ? "active" : ""}`}
                onClick={() => {
                  setSelectedCourt(court);
                  setForm((current) => ({ ...current, court }));
                }}
              >
                {court}
              </button>
            ))}
          </div>
        </section>

        {message ? <div className={`notice ${message.type}`}>{message.text}</div> : null}

        <section className="card schedule-card">
          <div className="schedule-heading">
            <div>
              <h2>{selectedCourt}</h2>
              <p>{formatLongDate(selectedDate)}</p>
            </div>
            <span className="availability-pill">{loading ? "Loading..." : `${availableCount} free slots`}</span>
          </div>

          {loading ? (
            <div className="spinner">Loading availability...</div>
          ) : allSlotsBookedForCourt ? (
            <div className="empty-state">All slots are booked for {selectedCourt} on this date. Try the other court or another day.</div>
          ) : (
            <div className="slots mobile-slots">
              {hours.map((hour) => {
                const booking = slotIsBooked(selectedCourt, hour);
                const selected = !booking && form.court === selectedCourt && Number(form.startHour) === hour;

                return (
                  <button
                    key={`${selectedCourt}-${hour}`}
                    className={`slot mobile-slot ${booking ? "booked" : "available"} ${selected ? "selected" : ""}`}
                    disabled={Boolean(booking)}
                    onClick={() => selectSlot(hour)}
                    type="button"
                  >
                    <div className="slot-main">
                      <div className="slot-title">
                        {formatHour(hour)} to {formatHour(hour + 1)}
                      </div>
                      <div className="slot-subtitle">{booking ? `Booked by ${booking.name}` : "Tap to reserve"}</div>
                    </div>
                    <span className={`pill ${booking ? "booked" : selected ? "selected" : "free"}`}>
                      {booking ? "Booked" : selected ? "Selected" : "Free"}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <section className="card form-card" ref={bookingFormRef}>
          <h2>Reserve your selected slot</h2>
          <div className="selected-slot-summary">
            <strong>{selectedCourt}</strong>
            <span>{formatLongDate(selectedDate)}</span>
            <span>
              {formatHour(Number(form.startHour))} to {formatHour(Number(form.startHour) + 1)}
            </span>
          </div>

          <form className="form" onSubmit={handleSubmit}>
            <label className="label">
              Start time
              <select
                className="select"
                value={form.startHour}
                onChange={(event) => setForm((current) => ({ ...current, startHour: Number(event.target.value), court: selectedCourt }))}
                disabled={allSlotsBookedForCourt}
              >
                {hours.map((hour) => {
                  const booking = slotIsBooked(selectedCourt, hour);
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

            {!allSlotsBookedForCourt && selectedSlotBooked ? (
              <div className="notice error">That slot is no longer available. Please choose another time.</div>
            ) : null}

            <div className="actions actions-stacked-mobile">
              <button className="primary wide-button" disabled={submitting || allSlotsBookedForCourt || selectedSlotBooked} type="submit">
                {submitting ? "Booking..." : "Confirm booking"}
              </button>
              <button className="secondary wide-button" disabled={loading} type="button" onClick={loadBookings}>
                Refresh availability
              </button>
            </div>
          </form>
        </section>

        <section className="card info mobile-info">
          <p>Use the admin page to edit names, add contact details later, or cancel bookings when needed.</p>
        </section>
      </div>
    </main>
  );
}
