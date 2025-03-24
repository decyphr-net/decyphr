import { LanguageSetting } from '@/app/models/LanguageSetting';
import { User } from '@/app/models/User';
import { NextApiRequest, NextApiResponse } from 'next';
import { cookies } from "next/headers";
import { getDataSource } from "../../../lib/db";


export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const db = await getDataSource();
    const { firstLanguage, targetLanguage, immersionLevel } = JSON.parse(req.body);
    try {
      const session = cookies().get("session");

      if (!session) {
        return res.status(401).json({ message: 'No token provided, unauthorized' });
      }

      const userRepository = await db.getRepository(User);
      const user = await userRepository.findOne({ where: { id: session.email } });

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      const languageSettingRepository = await db.getRepository(LanguageSetting);
      const languageSetting = languageSettingRepository.create({
        firstLanguage,
        targetLanguage,
        immersionLevel,
        user,
      });

      await languageSettingRepository.save(languageSetting);

      return res.status(200).json({ message: 'Settings saved' });
    } catch (error) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }

  } else {
    return res.status(405).json({ message: 'Method not allowed' });
  }
}
