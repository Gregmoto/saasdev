import { and, eq } from "drizzle-orm";
import type { Db } from "../../db/client.js";
import {
  storeAccounts,
  storeMemberships,
  authUsers,
  platformMemberships,
} from "../../db/schema/index.js";
import { hashPassword } from "../../lib/password.js";
import { sendEmail } from "../../lib/email.js";
import { config } from "../../config.js";

// ── Public signup ─────────────────────────────────────────────────────────────

export interface SignupOpts {
  email: string;
  password: string;
  storeName: string;
  storeSlug: string;
}

export interface SignupResult {
  userId: string;
  storeAccountId: string;
  status: "pending";
}

/**
 * Creates a new Store Account in `pending` state and its initial admin user.
 *
 * The account cannot be accessed until a Platform Super Admin approves it via
 * POST /api/platform/store-accounts/:id/approve.
 */
export async function signupStoreAccount(db: Db, opts: SignupOpts): Promise<SignupResult> {
  const passwordHash = await hashPassword(opts.password);

  const result = await db.transaction(async (tx) => {
    const [store] = await tx
      .insert(storeAccounts)
      .values({
        slug: opts.storeSlug,
        name: opts.storeName,
        mode: "WEBSHOP",
        plan: "starter",
        status: "pending",
        isActive: false, // blocked until approved
        settings: {},
      })
      .returning({ id: storeAccounts.id });

    if (!store) throw new Error("Failed to create store account");

    // Create or find the user.
    const [existing] = await tx
      .select({ id: authUsers.id })
      .from(authUsers)
      .where(eq(authUsers.email, opts.email))
      .limit(1);

    let userId: string;
    if (existing) {
      userId = existing.id;
    } else {
      const [newUser] = await tx
        .insert(authUsers)
        .values({
          email: opts.email,
          passwordHash,
          homeStoreAccountId: store.id,
        })
        .returning({ id: authUsers.id });
      if (!newUser) throw new Error("Failed to create user");
      userId = newUser.id;
    }

    await tx.insert(storeMemberships).values({
      storeAccountId: store.id,
      userId,
      role: "store_admin",
      isActive: false, // membership inactive until account is approved
      acceptedAt: new Date(),
    });

    return { userId, storeAccountId: store.id };
  });

  // Notify Platform Super Admins that a new signup needs review.
  await notifyPlatformAdmins(db, opts.storeName, opts.storeSlug, opts.email);

  // Acknowledge signup to the applicant.
  await sendEmail({
    to: opts.email,
    subject: "Your store account application is under review",
    html: `
      <p>Thank you for signing up! Your store account <strong>${opts.storeSlug}</strong>
      has been created and is currently pending approval.</p>
      <p>You will receive an email when your account has been reviewed. This usually takes
      1–2 business days.</p>
    `,
    text: `Your store account ${opts.storeSlug} is pending approval. We'll email you when it's reviewed.`,
  });

  return { ...result, status: "pending" };
}

// ── Status check ──────────────────────────────────────────────────────────────

export async function getOnboardingStatus(db: Db, storeAccountId: string) {
  const [account] = await db
    .select({
      status: storeAccounts.status,
      approvedAt: storeAccounts.approvedAt,
      rejectionReason: storeAccounts.rejectionReason,
    })
    .from(storeAccounts)
    .where(eq(storeAccounts.id, storeAccountId))
    .limit(1);

  return account ?? null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function notifyPlatformAdmins(
  db: Db,
  storeName: string,
  storeSlug: string,
  applicantEmail: string,
): Promise<void> {
  // Find all active Platform Super Admins to notify.
  const admins = await db
    .select({ email: authUsers.email })
    .from(platformMemberships)
    .innerJoin(authUsers, eq(platformMemberships.userId, authUsers.id))
    .where(eq(platformMemberships.isActive, true));

  const reviewUrl = `${config.NODE_ENV === "production" ? "https" : "http"}://platform.${config.BASE_DOMAIN}/store-accounts?status=pending`;

  await Promise.allSettled(
    admins.map((admin) =>
      sendEmail({
        to: admin.email,
        subject: `New store account signup: ${storeSlug}`,
        html: `
          <p>A new store account has been created and is pending approval:</p>
          <ul>
            <li><strong>Store name:</strong> ${storeName}</li>
            <li><strong>Slug:</strong> ${storeSlug}</li>
            <li><strong>Applicant:</strong> ${applicantEmail}</li>
          </ul>
          <p><a href="${reviewUrl}">Review pending accounts</a></p>
        `,
        text: `New signup: ${storeName} (${storeSlug}) by ${applicantEmail}. Review: ${reviewUrl}`,
      }),
    ),
  );
}
