import bcrypt from "bcryptjs";
import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { v4 as uuidv4 } from 'uuid';
import { getDataSource } from "../../../lib/db";
import { MagicLink } from "../../../models/MagicLink";
import { User } from "../../../models/User";

export async function POST(req: NextRequest) {
  const db = await getDataSource();
  const { email, locale } = await req.json();

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  // Check if the user exists, if not create them
  let user = await db.getRepository(User).findOne({ where: { email } });

  if (!user) {
    user = db.getRepository(User).create({ email, clientId: uuidv4() });
    await db.getRepository(User).save(user);
  } else if (!user.clientId) {
    user.clientId = uuidv4();
    await db.getRepository(User).save(user);
  }

  // Generate a secure token
  const token = crypto.randomBytes(32).toString("hex");
  const hashedToken = await bcrypt.hash(token, 10);
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // Token expires in 15 minutes

  // Store the token in the database
  const magicLink = db.getRepository(MagicLink).create({
    user,
    token: hashedToken,
    expiresAt,
  });
  await db.getRepository(MagicLink).save(magicLink);

  // Create the magic link URL
  const magicLinkUrl = `${process.env.NEXT_PUBLIC_APP_URL}/${locale}/auth/verify-request?token=${token}&email=${email}`;

  console.log(magicLinkUrl)

  // Set up Nodemailer
  const transporter = nodemailer.createTransport({
    host: 'mail.protonmail.com',
    port: 465,
    secure: true,
    auth: {
      user: process.env.SMTP_EMAIL,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  // Send email
  await transporter.sendMail({
    from: process.env.SMTP_EMAIL,
    to: email,
    subject: "Your Magic Login Link",
    text: `Click here to login: ${magicLinkUrl}`,
    html: `<p>Click <a href="${magicLinkUrl}">here</a> to login.</p>`,
  });

  return NextResponse.json({ message: "Magic link sent!" });
}
