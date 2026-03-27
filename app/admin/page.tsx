"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type AdminBooking = {
  id: string;
  booking_date: string;
  court: string;
  start_hour: number;
  end_hour: number;
  name: string;
  contact: string | null;
  created_at: string;
};

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
    year: "numeric",
  }).format(date);
}

function formatHour(hour: number) {
  const suffix = hour >= 12 ? "pm" : "am";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:00${suffix}`;
}

function buildDayRange() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(today);
  end.setDate(today.getDate() + 14);
  return {
    start: formatStorageDate(today),
    end: formatStorageDate(end),
  };
}

export default function AdminPage() {
  const range = useMemo(() => buildDayRange(), []);
  const [adminKey, setAdminKey] = useState("");
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  async function loadBookings() {
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/bookings?start=${range.start}&end=${range.end}`, {
        cache: "no-store",
        headers: { "x-admin-key": adminKey },
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not load bookings.");

      setBookings(payload.bookings as AdminBooking[]);
      setMessage({ type: "success", text: "Admin bookings loaded." });
    } catch (error) {
      setBookings([]);
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Could not load bookings.",
      });
    } finally {
      setLoading(false);
    }
  }

  function updateBookingField(id: string, field: "name" | "contact", value: string) {
    setBookings((current) =>
      current.map((booking) => (booking.id === id ? { ...booking, [field]: value } : booking)),
    );
  }

  async function saveBooking(id: string) {
    if (!adminKey) {
      setMessage({ type: "error", text: "Enter the admin key first." });
      return;
    }

    const booking = bookings.find((item) => item.id === id);
    if (!booking) return;

    setSavingId(id);
    setMessage(null);

    try {
      const response = await fetch(`/api/bookings/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": adminKey,
        },
        body: JSON.stringify({
          name: booking.name,
          contact: booking.contact || "",
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not save booking.");

      setBookings((current) => current.map((item) => (item.id === id ? (payload.booking as AdminBooking) : item)));
      setMessage({ type: "success", text: "Booking updated." });
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Could not save booking.",
      });
    } finally {
      setSavingId(null);
    }
  }

  async function deleteBooking(id: string) {
    if (!adminKey) {
      setMessage({ type: "error", text: "Enter the admin key first." });
      return;
    }

    const confirmed = window.confirm("Delete this booking?");
    if (!confirmed) return;

    setDeletingId(id);
    setMessage(null);

    try {
      const response = await fetch(`/api/bookings/${id}`, {
        method: "DELETE",
        headers: { "x-admin-key": adminKey },
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not delete booking.");

      setBookings((current) => current.filter((booking) => booking.id !== id));
      setMessage({ type: "success", text: "Booking deleted." });
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Could not delete booking.",
      });
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <main className="page">
      <div className="shell admin-shell">
        <section className="card header">
          <div className="topbar">
            <div>
              <h1>Booking Admin</h1>
              <p>Load bookings for today plus 14 days ahead and edit contact details or delete bookings when needed.</p>
            </div>
            <Link href="/" className="secondary nav-link">
              Back to booking page
            </Link>
          </div>
        </section>

        {message ? <div className={`notice ${message.type}`}>{message.text}</div> : null}

        <section className="card form-card">
          <h2>Admin access</h2>
          <p className="muted">Enter the same ADMIN_DELETE_KEY value you added in Vercel and your local environment file.</p>
          <div className="form">
            <label className="label">
              Admin key
              <input
                className="input"
                type="password"
                value={adminKey}
                onChange={(event) => setAdminKey(event.target.value)}
                placeholder="Enter admin key"
              />
            </label>
            <div className="actions">
              <button className="primary" type="button" onClick={loadBookings} disabled={loading || !adminKey}>
                {loading ? "Loading..." : "Load bookings"}
              </button>
            </div>
          </div>
        </section>

        <section className="card form-card">
          <h2>Bookings</h2>
          <p className="muted">Showing bookings from {formatDisplayDate(new Date(`${range.start}T00:00:00`))} to {formatDisplayDate(new Date(`${range.end}T00:00:00`))}.</p>

          {bookings.length === 0 ? (
            <div className="empty-state">No bookings loaded yet.</div>
          ) : (
            <div className="admin-list">
              {bookings.map((booking) => (
                <article key={booking.id} className="admin-booking admin-booking-editable">
                  <div className="admin-booking-main">
                    <h3>
                      {booking.court} · {formatDisplayDate(new Date(`${booking.booking_date}T00:00:00`))}
                    </h3>
                    <p>
                      {formatHour(booking.start_hour)} to {formatHour(booking.end_hour)}
                    </p>
                    <label className="label compact-label">
                      Name
                      <input
                        className="input"
                        maxLength={80}
                        value={booking.name}
                        onChange={(event) => updateBookingField(booking.id, "name", event.target.value)}
                      />
                    </label>
                    <label className="label compact-label">
                      Contact
                      <input
                        className="input"
                        maxLength={120}
                        value={booking.contact || ""}
                        onChange={(event) => updateBookingField(booking.id, "contact", event.target.value)}
                        placeholder="Optional phone number"
                      />
                    </label>
                  </div>
                  <div className="admin-actions">
                    <button
                      className="secondary"
                      type="button"
                      onClick={() => saveBooking(booking.id)}
                      disabled={savingId === booking.id}
                    >
                      {savingId === booking.id ? "Saving..." : "Save changes"}
                    </button>
                    <button
                      className="danger"
                      type="button"
                      onClick={() => deleteBooking(booking.id)}
                      disabled={deletingId === booking.id}
                    >
                      {deletingId === booking.id ? "Deleting..." : "Delete booking"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
