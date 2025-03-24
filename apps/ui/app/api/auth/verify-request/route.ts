import { LanguageSetting } from "@/app/models/LanguageSetting";
import { User } from "@/app/models/User";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { getDataSource } from "../../../lib/db";
import { MagicLink } from "../../../models/MagicLink";

export async function GET(req: NextRequest) {
  const db = await getDataSource();

  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  const email = url.searchParams.get("email");

  if (!token || !email) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  // Retrieve the stored token from the database
  const magicLink = await db.getRepository(MagicLink)
    .createQueryBuilder("magicLink")
    .leftJoinAndSelect("magicLink.user", "user")
    .where("user.email = :email", { email })
    .orderBy("magicLink.createdAt", "DESC")
    .getOne();

  if (!magicLink) {
    return NextResponse.json({ error: "Token not found" }, { status: 400 });
  }

  // Check if token is expired
  if (new Date(magicLink.expiresAt) < new Date()) {
    return NextResponse.json({ error: "Token expired" }, { status: 400 });
  }

  // Compare token
  const isValid = await bcrypt.compare(token, magicLink.token);
  if (!isValid) {
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  }

  const userRepository = await db.getRepository(User);
  const languageSettingRepository = await db.getRepository(LanguageSetting);

  const user = await userRepository.findOne({ where: { email: email }, relations: ['languageSettings'] });
  // Set session cookie
  cookies().set("session", user?.clientId, { httpOnly: true, secure: true, maxAge: 7 * 24 * 60 * 60 });

  return NextResponse.json({ status: 200 })
}
