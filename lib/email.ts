import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.FROM_EMAIL ?? "noreply@styledeck.com";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export async function sendInviteEmail(params: {
  to: string;
  token: string;
  brandName?: string;
}) {
  const url = `${APP_URL}/invite/${params.token}`;
  const subject = params.brandName
    ? `You've been invited to StyleDeck by ${params.brandName}`
    : "You've been invited to StyleDeck";

  await resend.emails.send({
    from: FROM,
    to: params.to,
    subject,
    html: `
      <p>You've received an exclusive invitation to StyleDeck${params.brandName ? ` from <strong>${params.brandName}</strong>` : ""}.</p>
      <p><a href="${url}">Accept your invitation</a></p>
      <p>This link expires in 7 days.</p>
    `,
  });
}

export async function sendBrandStatusEmail(params: {
  to: string;
  brandName: string;
  status: "approved" | "rejected" | "suspended";
  reason?: string | null;
  reactivated?: boolean;
}) {
  const reasonHtml = params.reason
    ? `<p style="color:#555">Reason: ${params.reason}</p>`
    : "";

  let subject: string;
  let body: string;

  if (params.reactivated) {
    subject = "StyleDeck: Your brand account has been reactivated";
    body = `<p>Good news -- <strong>${params.brandName}</strong> has been reactivated on StyleDeck. You can log in to your brand portal as usual.</p>`;
  } else if (params.status === "approved") {
    subject = "StyleDeck: Your brand application has been approved";
    body = `<p>Congratulations -- <strong>${params.brandName}</strong> has been approved on StyleDeck. You can now log in and set up your brand portal.</p>`;
  } else if (params.status === "suspended") {
    subject = "StyleDeck: Your brand account has been suspended";
    body = `<p>Your brand account for <strong>${params.brandName}</strong> has been temporarily suspended. Your products are no longer visible to customers and portal access is paused.</p>${reasonHtml}<p>If you have questions, please contact StyleDeck support.</p>`;
  } else {
    subject = "StyleDeck: Your brand application has been reviewed";
    body = `<p>Thank you for applying. After review, we're unable to approve <strong>${params.brandName}</strong> at this time.</p>${reasonHtml}`;
  }

  await resend.emails.send({
    from: FROM,
    to: params.to,
    subject,
    html: body,
  });
}

export async function sendPasswordResetEmail(params: { to: string; url: string }) {
  await resend.emails.send({
    from: FROM,
    to: params.to,
    subject: "Reset your StyleDeck password",
    html: `
      <p>We received a request to reset your StyleDeck password.</p>
      <p><a href="${params.url}">Reset your password</a></p>
      <p>If you didn't request this, you can safely ignore this email. This link expires in 1 hour.</p>
    `,
  });
}

export async function sendVerificationEmail(params: { to: string; url: string }) {
  await resend.emails.send({
    from: FROM,
    to: params.to,
    subject: "Verify your StyleDeck email address",
    html: `
      <p>Welcome to StyleDeck -- please verify your email address to activate your account.</p>
      <p><a href="${params.url}">Verify email address</a></p>
      <p>If you didn't create this account, you can safely ignore this email.</p>
    `,
  });
}

export async function sendOrderShippedEmail(params: {
  to: string;
  customerName: string;
  productName: string;
  brandName: string;
  orderId: string;
  trackingNumber?: string | null;
}) {
  await resend.emails.send({
    from: FROM,
    to: params.to,
    subject: `Your ${params.brandName} order has shipped`,
    html: `
      <p>Hi ${params.customerName},</p>
      <p>Great news -- your <strong>${params.productName}</strong> from <strong>${params.brandName}</strong> is on its way.</p>
      ${params.trackingNumber ? `<p>Tracking number: <strong>${params.trackingNumber}</strong></p>` : ""}
      <p><a href="${APP_URL}/app/orders">View your orders</a></p>
    `,
  });
}

export async function sendOrderNotificationEmail(params: {
  to: string;
  orderId: string;
  customerName: string;
  productName: string;
  orderType: "purchase" | "gift";
  shippingAddress: object;
}) {
  await resend.emails.send({
    from: FROM,
    to: params.to,
    subject: `New ${params.orderType} order -- ${params.productName}`,
    html: `
      <p>A new ${params.orderType} order has been placed.</p>
      <ul>
        <li><strong>Order ID:</strong> ${params.orderId}</li>
        <li><strong>Customer:</strong> ${params.customerName}</li>
        <li><strong>Product:</strong> ${params.productName}</li>
        <li><strong>Shipping to:</strong> <pre>${JSON.stringify(params.shippingAddress, null, 2)}</pre></li>
      </ul>
      <p><a href="${APP_URL}/brand/orders/${params.orderId}">View order in portal</a></p>
    `,
  });
}
