# Quickstart: Slack Notification Button

**Feature**: 006-slack-notify
**Date**: 2026-05-04

---

## Prerequisites

- A Slack workspace where you have permission to create apps
- The project running locally (`pnpm dev` inside `nextjs/`)

---

## Step 1: Create a Slack Incoming Webhook

1. Go to [https://api.slack.com/apps](https://api.slack.com/apps) and click **Create New App** > **From scratch**.
2. Name the app (e.g., "ProspectNotifier") and select your workspace.
3. In the left sidebar click **Incoming Webhooks** and toggle **Activate Incoming Webhooks** to **On**.
4. Click **Add New Webhook to Workspace**.
5. Select the channel where urgent notifications should appear, then click **Allow**.
6. Copy the webhook URL — it looks like:
   ```
   https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX
   ```

---

## Step 2: Add the Environment Variable

Open `nextjs/.env.local` and add:

```env
PRIVATE_SLACK_WEBHOOK_URL=https://hooks.slack.com/services/T00000000/B00000000/XXXX
```

> The variable name must start with `PRIVATE_` — this ensures Next.js never exposes it to the browser.

For production, add the same variable to your hosting provider's secret manager (e.g., Vercel Environment Variables).

---

## Step 3: Verify It Works

1. Start the dev server: `pnpm dev` (inside `nextjs/`)
2. Open the app and navigate to the prospect list.
3. Open any prospect that has a quote total above $30,000.
4. Click **Notify on Slack** in the action modal.
5. The button briefly shows **Sent!** and a message appears in the configured Slack channel:
   > Urgent! Details on your email.

---

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| Button shows error "Slack webhook URL not configured." | `PRIVATE_SLACK_WEBHOOK_URL` missing or typo in `.env.local` | Add/correct the variable and restart `pnpm dev` |
| Button shows error "Slack notification failed: no_service" | Webhook was deleted or disabled in Slack | Re-create the webhook in Slack app settings |
| Button is disabled and can't be clicked | Quote total is $30,000 or less | Feature requires a quote with total > $30,000 |
| Button shows error "No quote to notify about" | Proposal has no quote generated yet | Generate a quote first via "Generate Quote" |

---

## Security Notes

- **Never commit** `PRIVATE_SLACK_WEBHOOK_URL` to version control. It is already listed in `.gitignore` via `.env.local`.
- If the webhook URL is accidentally exposed, revoke it immediately in your Slack app settings and generate a new one.
- The webhook URL encodes the target channel — changing the channel requires creating a new webhook.
