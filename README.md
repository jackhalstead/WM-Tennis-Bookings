# Community Tennis Court Booking App

A tiny public booking app for two community tennis courts.

## What it does

- Shows availability for today plus 14 days ahead
- Uses hourly slots from 8am to 8pm
- Lets anyone reserve a slot without creating an account
- Contact details are optional for public bookings
- Includes a simple admin page for editing booking details and deleting or cancelling bookings
- Prevents double-booking at the database level
- Works well on mobile screens
- Ready to deploy on Vercel

## Tech stack

- Next.js
- Vercel
- Supabase Postgres

## 1. Create a Supabase project

Create a Supabase project, then open the SQL editor and run the contents of `supabase/schema.sql`.

## 2. Add environment variables

Copy `.env.example` to `.env.local` and fill in your values.

Required:

- `NEXT_PUBLIC_APP_NAME`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ADMIN_DELETE_KEY`

## 3. Run locally

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

## 4. Use the admin page

Open `/admin` on your site, enter the `ADMIN_DELETE_KEY`, then load bookings and delete the ones you want to cancel.

## 5. Deploy to Vercel

1. Create a GitHub repository and upload this project.
2. In Vercel, import the GitHub repository.
3. Add the same environment variables in the Vercel project settings.
4. Deploy.

Your app will then be available via a public link.

## Notes

- Booking creation is handled by secure Next.js API routes.
- The Supabase service role key is used only on the server.
- The database unique index prevents two people from taking the same slot.
- A hidden honeypot field is included to block basic spam bots.
- The public booking page does not expose contact details.
- Members can book with just a name. Contact details are optional.
- The admin page reveals contact details only when the correct admin key is supplied and lets you edit them.

## Optional next improvements

- Add email confirmation or cancellation links
- Add rate limiting
- Add resident rules such as one booking per person per day
- Add a simple audit log for admin deletes


## Mobile UI update

This version uses a mobile-first layout:
- one court at a time on phones
- larger tap targets for each slot
- sticky date and court controls
- selected slot summary above the booking form
