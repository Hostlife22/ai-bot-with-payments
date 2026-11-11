# Usage and administration

**English** · [Русский](../ru/administration.md) · [简体中文](../zh/administration.md)

[Documentation](../../README.md#documentation)

## User commands and menus

| Action                            | Behavior                                                         |
| --------------------------------- | ---------------------------------------------------------------- |
| `/start`                          | Register, process a referral, and request acceptance of terms.   |
| `/buy` or the profile shop button | Select a package and payment method.                             |
| Profile                           | View balances and progress; claim a bonus or enter a promo code. |
| AI settings                       | Choose a role or a custom prompt up to 1000 characters.          |
| Clear context                     | Delete the user's `messages` history.                            |
| Referrals                         | Show `https://t.me/<bot>?start=ref_<ID>`.                        |
| Help                              | Show FAQ, support, agreement, and privacy policy.                |

The current service interface is primarily Russian. Changing roles clears history. If no prompt was selected, `application/ai.ts` starts with `flirt` and fixes `flirthot` after history reaches at least six messages.

Incoming photos, videos, documents, and animations support administrator broadcast preparation. User media is not analyzed by the model. Voice responses are not generated.

## Administrator access

Set a numeric Telegram ID in `ADMIN_ID`, then use `/admin`. Authorization uses the ID, not the username. The administrator bypasses terms acceptance, the five-second user cooldown, and ordinary query length checks; the AI service's separate 10-request minute window still applies.

Statistics display users, revenue by currency, and a funnel. Some metrics are approximations: free usage is inferred from current balance `< 10`, rather than an event ledger. Text cost uses provider data or adapter coefficients; image cost is recorded when returned by the provider.

## Users and balances

Find a user by ID or list page. Available actions include blocking, replacing balances, granting a package, viewing payment history, and sending an administrator message.

Balance editing replaces a value; a package grant adds resources. VIP adds 9999 messages and 9999 photos without creating a subscription period. Manual package grants also set `has_purchased` and clear the discount.

The global reset action replaces every user's balances with 10 messages and 1 photo, including paid balances. Use it only when that replacement is intended. Free Mode separately disables text-balance checks and debits while retaining photo limits.

## Prices, content, and channels

Package editing accepts four nonnegative integers:

```text
Stars RUB Messages Photos
65 80 50 5
```

Prices must be positive and at least one resource must be included. Already issued invoices retain their snapshots.

The content section edits policy, agreement, FAQ, and links. Policy/agreement use HTML. FAQ is escaped, so tags appear as text. Administrator messages use HTML; broadcasts use Telegram Markdown. Check previews because these formatting paths differ.

`bonus_channel_id` accepts `@username` or a numeric channel ID; `bonus_channel_url` supplies the button URL. Add the bot as a channel administrator and test with an ordinary user. Membership-check errors prevent bonus credit.

## Rewards and promo codes

The starting balance is 10 messages and 1 photo. A first registration through a valid other user's referral grants the referrer 10 messages and the new user another 5. Repeated `/start` for an existing account does not grant again.

Daily rewards give 1–3 messages once per rolling 24 hours, optionally after channel membership checks. A conditional SQL update prevents concurrent duplicate claims.

Create a promo draft, set resources/discount/usage limit, then save it. Unsaved drafts live in memory. User input is uppercased; spaces in a newly created code become `_`.

Activation checks status, global remaining uses, per-user uses, and the first-purchase condition. Discounts range from 0 to 100. “New user” means `has_purchased` is false, not that registration is recent.

## Broadcasts and reminders

Send text or media, choose a button, review the preview, and confirm. Queueing a broadcast is not proof that every recipient received it. Delivery errors are logged and are not automatically retried by the broadcast handler.

Every five minutes:

- Users whose last ordinary text activity was 24–48 hours ago receive a reminder if not previously flagged.
- Users who opened the shop over two hours ago and have not purchased receive a one-use code for 20% off and 5 messages.
- Users eligible for a daily bonus receive a notification if not already flagged.

There is no general administrator toggle for these campaigns. Retargeting flags are stored and do not reset on every visit. Cart codes contain the recipient ID, but activation does not enforce ownership or expiry; they are not technically restricted to that account.
