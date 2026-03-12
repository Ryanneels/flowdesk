/**
 * POST /api/gmail/watch — Register Gmail push notifications for the current user.
 * Calls Gmail users.watch with GMAIL_PUBSUB_TOPIC. Gmail will send notifications
 * to that topic when new mail arrives; your Pub/Sub push subscription calls /api/gmail/push.
 *
 * Watch expires in ~7 days; call this again (e.g. on next sign-in or via a weekly job) to renew.
 */

import { auth } from "@/auth";
import { getGoogleAccessToken } from "@/lib/google-token";
import { NextResponse } from "next/server";

const GMAIL_WATCH_URL = "https://gmail.googleapis.com/gmail/v1/users/me/watch";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const topicName = process.env.GMAIL_PUBSUB_TOPIC;
  if (!topicName) {
    return NextResponse.json(
      { error: "GMAIL_PUBSUB_TOPIC not set. Add it in Vercel env and set up Pub/Sub in Google Cloud." },
      { status: 500 }
    );
  }

  const token = await getGoogleAccessToken(session.user.id);
  if (!token) {
    return NextResponse.json({ error: "Google token missing" }, { status: 400 });
  }

  const res = await fetch(GMAIL_WATCH_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      topicName,
      labelIds: ["INBOX"],
      labelFilterBehavior: "include",
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json(
      { error: "Gmail watch failed", details: text },
      { status: res.status }
    );
  }

  const data = (await res.json()) as { historyId?: string; expiration?: string };
  return NextResponse.json({
    ok: true,
    historyId: data.historyId,
    expiration: data.expiration,
    message: "Gmail push is active. New mail will trigger label + archive.",
  });
}
