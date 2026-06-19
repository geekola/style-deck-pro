import { Resend } from "resend";

const FROM = process.env.FROM_EMAIL ?? "noreply@styledeck.com";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

// Lazily construct the Resend client so that builds (which collect route
// metadata without runtime env vars) don't throw on a missing API key.
let resendClient: Resend | null = null;
function getResend(): Resend {
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
}

// Resend's SDK doesn't throw on API errors -- it returns { data, error }.
// Without this check, a failed send (e.g. unverified domain, sandbox sender
// restrictions) is silently swallowed and the caller has no idea the email
// never went out. Log loudly so failures show up in server logs.
type SendEmailParams = Parameters<Resend["emails"]["send"]>[0];

async function sendEmail(params: SendEmailParams) {
  const { data, error } = await getResend().emails.send(params);
  if (error) {
    console.error("[email] Resend send failed", {
      to: "to" in params ? params.to : undefined,
      subject: "subject" in params ? params.subject : undefined,
      error,
    });
    return { success: false as const, error };
  }
  return { success: true as const, data };
}

export async function sendInviteEmail(params: {
  to: string;
  token: string;
  brandName?: string;
}) {
  const url = `${APP_URL}/invite/${params.token}`;
  const subject = params.brandName
    ? `You've been invited to StyleDeck by ${params.brandName}`
    : "You've been invited to StyleDeck";

  return sendEmail({
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

export async function sendBrandApplicationEmail(params: {
  to: string;
  brandName: string;
}) {
  return sendEmail({
    from: FROM,
    to: params.to,
    subject: "StyleDeck: We received your application",
    html: `
      <p>Hi,</p>
      <p>Thanks for applying to StyleDeck. We've received your application for <strong>${params.brandName}</strong> and our team will review it within 2–5 business days.</p>
      <p>We'll email you at this address once a decision has been made.</p>
      <p>— The StyleDeck team</p>
    `,
  });
}

export async function sendBrandStatusEmail(params: {
  to: string;
  brandName: string;
  status: "approved" | "rejected" | "suspended";
  reason?: string | null;
  reactivated?: boolean;
  tempPassword?: string;
}) {
  const loginUrl = `${APP_URL}/login`;
  const reasonHtml = params.reason
    ? `<p style="color:#555">Reason: ${params.reason}</p>`
    : "";

  let subject: string;
  let body: string;

  if (params.reactivated) {
    subject = "StyleDeck: Your brand account has been reactivated";
    body = `
      <p>Good news — <strong>${params.brandName}</strong> has been reactivated on StyleDeck.</p>
      <p>You can <a href="${loginUrl}">log in to your brand portal</a> as usual.</p>
    `;
  } else if (params.status === "approved") {
    subject = "StyleDeck: Your brand application has been approved";
    const credentialsHtml = params.tempPassword
      ? `
        <p>Your login credentials:</p>
        <ul>
          <li><strong>Email:</strong> ${params.to}</li>
          <li><strong>Temporary password:</strong> <code>${params.tempPassword}</code></li>
        </ul>
        <p><strong>Please change your password after your first login.</strong></p>
      `
      : "";
    body = `
      <p>Congratulations — <strong>${params.brandName}</strong> has been approved on StyleDeck.</p>
      ${credentialsHtml}
      <p><a href="${loginUrl}">Log in to your brand portal →</a></p>
    `;
  } else if (params.status === "suspended") {
    subject = "StyleDeck: Your brand account has been suspended";
    body = `
      <p>Your brand account for <strong>${params.brandName}</strong> has been temporarily suspended. Your products are no longer visible to customers and portal access is paused.</p>
      ${reasonHtml}
      <p>If you have questions, please contact StyleDeck support.</p>
    `;
  } else {
    subject = "StyleDeck: Your brand application has been reviewed";
    body = `
      <p>Thank you for applying. After review, we're unable to approve <strong>${params.brandName}</strong> at this time.</p>
      ${reasonHtml}
    `;
  }

  return sendEmail({
    from: FROM,
    to: params.to,
    subject,
    html: body,
  });
}

export async function sendPasswordResetEmail(params: { to: string; url: string }) {
  return sendEmail({
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
  return sendEmail({
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
  return sendEmail({
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
  return sendEmail({
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
