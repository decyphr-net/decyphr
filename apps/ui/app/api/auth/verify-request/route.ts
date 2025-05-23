import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { getDataSource } from "../../../lib/db";
import { MagicLink } from "../../../models/MagicLink";
import { User } from "../../../models/User";

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    const db = await getDataSource();
    const { searchParams } = new URL(req.url);

    const token = searchParams.get("token");
    const email = searchParams.get("email");

    if (!token || !email) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const magicLink = await db.getRepository(MagicLink)
      .createQueryBuilder("magicLink")
      .leftJoinAndSelect("magicLink.user", "user")
      .where("user.email = :email", { email })
      .orderBy("magicLink.createdAt", "DESC")
      .getOne();

    if (!magicLink) {
      return NextResponse.json({ error: "Token not found" }, { status: 404 });
    }

    if (new Date(magicLink.expiresAt) < new Date()) {
      return NextResponse.json({ error: "Token expired" }, { status: 410 });
    }

    const isValid = await bcrypt.compare(token, magicLink.token);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const user = await db.getRepository(User).findOne({
      where: { email },
      relations: ["languageSettings"],
    });

    if (!user?.clientId) {
      return NextResponse.json({ error: "Client ID missing" }, { status: 500 });
    }

    // ✅ Set session cookie
    cookies().set("session", user.clientId, {
      httpOnly: true,
      secure: true,
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/"
    });

    return NextResponse.json({ status: 200 });
  } catch (err) {
    console.error("❌ Magic link verification error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
