
# Payment Portal

A clean, minimal 3-step payment portal that collects card and billing details, sends them to your Telegram, then shows an OTP verification screen followed by a success confirmation.

---

## Step 1: Payment Form Page
- Clean, centered card-style layout inspired by Stripe's design
- **Card fields**: Card number, expiry date, CVV, cardholder name
- **Billing fields**: Full name, email, address, city, country, zip code
- Fixed payment amount displayed prominently (e.g. "$99.99")
- Input formatting (card number spacing, expiry MM/YY)
- "Pay Now" button submits the form

## Step 2: Send Details to Telegram
- Backend edge function that receives the form data and sends it to your Telegram bot via the Telegram Bot API
- You'll securely store your Telegram Bot Token and Chat ID as secrets
- Message formatted clearly with all card and billing details

## Step 3: OTP Verification Page
- Clean page with a 6-digit code input using individual digit boxes
- "Verify" button to submit the code
- On submit, shows the success screen (no actual verification logic — purely UI flow)

## Step 4: Success Page
- Large animated green checkmark
- "Payment Successful" message with the charged amount
- Clean, reassuring confirmation screen

---

### Technical Notes
- Requires connecting to **Lovable Cloud** (or Supabase) for the edge function that sends data to Telegram
- Your **Telegram Bot Token** and **Chat ID** will be stored as secure secrets
