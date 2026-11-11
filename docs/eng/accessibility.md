# Accessibility

**English** · [Русский](../ru/accessibility.md) · [简体中文](../zh/accessibility.md)

## Scope

The project interface consists of Telegram messages, inline buttons, and reply keyboards. Rendering, scaling, keyboard navigation, and assistive-technology interaction depend on the Telegram client and device. There is no standalone web interface.

This document describes current behavior and checks for interface changes. Manual screen-reader results and a formal standards assessment have not been published.

## Current behavior

- Primary actions have text labels: profile, shop, help, AI settings, and administrator menus.
- Balances, prices, and operation results are conveyed as text rather than images alone.
- Length limits, waiting periods, and insufficient balances have explanatory messages.
- AI text is split into messages up to 4096 characters; photos have text captions.
- Broadcast preparation includes a preview before confirmation.

Emoji appear in menus, profiles, and statuses. Some compact buttons contain emoji and a number; their meaning must be checked in the context of the complete menu.

## Limitations

- Service text is primarily Russian; there is no general localization system.
- Some actions edit an existing message, requiring client-specific checks of announcements and focus.
- Photos have no separate field guaranteeing an image description. An AI caption is not always meaningful alternative text.
- Voice responses and a separate audio mode are not implemented.
- Generated AI text is not checked by a dedicated accessibility validator.
- The fixed cooldown requires waiting; interaction pace has no separate user setting.

## Manual checks for menu changes

Before submitting interface changes, check:

1. Access to `/start`, profile, help, shop, and return navigation.
2. Button labels and action results with a screen reader available on the test device.
3. Meaning without relying solely on emoji, color, or position.
4. Keyboard navigation in a Telegram client that supports it.
5. Long names, large numbers, error messages, and photo captions.
6. Context after message edits, input cancellation, and role changes.

Use short action labels, explicit error explanations, and captions for meaningful images. Supplement type checks and handler tests with manual client testing.

## Reporting an issue

Create an [Issue](https://github.com/Hostlife22/ai-bot-with-payments/issues) describing the menu/action, Telegram client, operating system, navigation method, expected/actual behavior, and screen reader/version when relevant. Sanitized screenshots or recordings can help.

Medical information, credentials, payment data, and real conversations are not needed. If the issue also exposes a vulnerability or another user's information, use the private process in [SECURITY.md](security.md).
