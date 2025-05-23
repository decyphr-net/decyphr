import { cookies } from 'next/headers';
import { getDataSource } from '../../../lib/db';
import { LanguageSetting } from '../../../models/LanguageSetting';
import { User } from '../../../models/User';

/**
 * POST /api/auth/first-login
 *
 * Saves the user's initial language settings (first language, target language, and immersion level)
 * after their first login. Requires a valid session cookie to identify the user.
 *
 * Request body (JSON):
 * {
 *   "firstLanguage": string,
 *   "targetLanguage": string,
 *   "immersionLevel": number
 * }
 *
 * Responses:
 * - 200: Settings saved successfully
 * - 401: Unauthorized (no session or invalid session)
 * - 404: User not found
 * - 405: Method not allowed (if not a POST request)
 */
export async function POST(req: Request) {
  try {
    const db = await getDataSource();
    const body = await req.json();
    const { firstLanguage, targetLanguage, immersionLevel } = body;

    const session = cookies().get("session");

    if (!session) {
      return new Response(JSON.stringify({ message: 'No token provided, unauthorized' }), { status: 401 });
    }

    const userRepository = db.getRepository(User);
    const user = await userRepository.findOne({ where: { clientId: session.value } });

    if (!user) {
      return new Response(JSON.stringify({ message: 'User not found' }), { status: 404 });
    }

    const languageSettingRepository = db.getRepository(LanguageSetting);
    const languageSetting = languageSettingRepository.create({
      firstLanguage,
      targetLanguage,
      immersionLevel,
      user,
    });

    await languageSettingRepository.save(languageSetting);

    return new Response(JSON.stringify({ message: 'Settings saved' }), { status: 200 });

  } catch (error) {
    return new Response(JSON.stringify({ message: 'Invalid or expired token' }), { status: 401 });
  }
}
