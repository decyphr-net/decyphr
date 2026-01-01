import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { Response } from 'express';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { Resend } from 'resend';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { MagicLink } from './entities/MagicLink';
import { User } from './entities/User';
import { AuthenticatedRequest } from './types/request';

// TODO: Read these from the i18n service
const translations = {
  en: {
    subject: 'Your Magic Login Link',
    greeting: 'Welcome to Misneach!',
    intro: 'Click the button below to access your account securely.',
    button: 'Login Now',
    note: 'If you didn’t request this link, you can safely ignore this email.',
    footer: '© 2025 Misneach. All rights reserved.',
  },
  ga: {
    subject: 'Do Nasc Draíochta Logála Isteach',
    greeting: 'Fáilte go Misneach!',
    intro: 'Cliceáil an cnaipe thíos chun rochtain shlán a fháil ar do chuntas.',
    button: 'Logáil Isteach Anois',
    note: 'Mura ndearna tú iarratas ar an nasc seo, is féidir leat neamhaird a dhéanamh de.',
    footer: '© 2025 Misneach. Gach ceart ar cosaint.',
  },
  pt: {
    subject: 'Seu Link Mágico de Login',
    greeting: 'Bem-vindo ao Misneach!',
    intro: 'Clique no botão abaixo para acessar sua conta com segurança.',
    button: 'Entrar Agora',
    note: 'Se você não solicitou este link, pode ignorar este e-mail com segurança.',
    footer: '© 2025 Misneach. Todos os direitos reservados.',
  },
};

@Injectable()
export class AuthService {
  private resend;
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    @InjectRepository(MagicLink)
    private readonly magicLinkRepo: Repository<MagicLink>,

    private readonly config: ConfigService,
  ) {
    this.resend = new Resend(this.config.get<string>('RESEND_API_KEY'));
  }

  async loadLoginPage(): Promise<string> {
    const loginPath = join(__dirname, '..', '..', 'public', 'pages', 'auth', 'login.html');
    return readFile(loginPath, 'utf-8');
  }

  async loadLayoutWithPartial(partialRoute: string): Promise<string> {
    const layoutPath = join(__dirname, '..', '..', 'public', 'layout.html');
    const layoutHtml = await readFile(layoutPath, 'utf-8');
    return layoutHtml.replace('{{PARTIAL_ROUTE}}', partialRoute);
  }

  async loadPartial(relativePath: string): Promise<string> {
    const partialPath = join(
      __dirname,
      '..',
      '..',
      'public',
      'pages',
      relativePath,
    );
    return await readFile(partialPath, 'utf-8');
  }

  async handleMagicLink(email: string): Promise<{ message: string }> {
    if (!email) {
      throw new Error('Email is required');
    }

    let user = await this.userRepo.findOne({ where: { email } });
    if (!user) {
      user = this.userRepo.create({ email, clientId: uuidv4() });
      await this.userRepo.save(user);
    } else if (!user.clientId) {
      user.clientId = uuidv4();
      await this.userRepo.save(user);
    }

    const token = crypto.randomBytes(32).toString('hex');
    const hashedToken = await bcrypt.hash(token, 10);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    const magicLink = this.magicLinkRepo.create({
      user,
      token: hashedToken,
      expiresAt,
    });
    await this.magicLinkRepo.save(magicLink);

    const appUrl = this.config.get<string>('APP_URL');
    const verifyUrl = `${appUrl}/auth/verify-request?token=${token}&email=${email}`;

    const userLang = user.languageSettings?.[0]?.firstLanguage || 'en';
    const selectedTranslations = translations[userLang] || translations.en;

    const emailTemplatePath = join(__dirname, '..', '..', 'public', 'email', 'magic-link.html');
    let emailHtml = await readFile(emailTemplatePath, 'utf-8');

    emailHtml = emailHtml
      .replace(/{{verifyUrl}}/g, verifyUrl)
      .replace(/{{t\.subject}}/g, selectedTranslations.subject)
      .replace(/{{t\.greeting}}/g, selectedTranslations.greeting)
      .replace(/{{t\.intro}}/g, selectedTranslations.intro)
      .replace(/{{t\.button}}/g, selectedTranslations.button)
      .replace(/{{t\.note}}/g, selectedTranslations.note)
      .replace(/{{t\.footer}}/g, selectedTranslations.footer);

    const deliveryMode = this.config.get<string>('EMAIL_DELIVERY', 'send');

    if (deliveryMode === 'log') {
      // Clear, grep-friendly logs
      console.log('—— MAGIC LINK (EMAIL DELIVERY DISABLED) ——');
      console.log('To:', email);
      console.log('Verify URL:', verifyUrl);
      console.log('———————————————');

      return {
        message: 'Magic link generated (email delivery disabled)',
      };
    }

    await this.resend.emails.send({
      from: this.config.get<string>('EMAIL_FROM'),
      to: email,
      subject: selectedTranslations.subject,
      html: emailHtml,
    });

    return { message: 'Magic link sent!' };
  }

  async verifyMagicLink(token: string, email: string, res: Response) {
    const dbUser = await this.userRepo.findOne({
      where: { email },
      relations: ['languageSettings'],
    });

    if (!token || !email) {
      throw new BadRequestException('Invalid request');
    }

    const magicLink = await this.magicLinkRepo
      .createQueryBuilder('magicLink')
      .leftJoinAndSelect('magicLink.user', 'user')
      .where('user.email = :email', { email })
      .orderBy('magicLink.createdAt', 'DESC')
      .getOne();

    if (!magicLink) throw new NotFoundException('Token not found');

    if (new Date(magicLink.expiresAt) < new Date()) {
      throw new UnauthorizedException('Token expired');
    }

    const isValid = await bcrypt.compare(token, magicLink.token);
    if (!isValid) throw new UnauthorizedException('Invalid token');

    const user = await this.userRepo.findOne({ where: { email } });
    if (!user?.clientId)
      throw new InternalServerErrorException('Client ID missing');

    res.cookie('session', user.clientId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7 * 1000, // 7 days
      path: '/',
      sameSite: 'lax',
    });

    if (!dbUser) throw new Error('User not found');

    res.cookie('session', dbUser.clientId, {
      httpOnly: true,
      secure: true,
      maxAge: 1000 * 60 * 60 * 24 * 7,
      path: '/',
    });

    return dbUser;
  }

  async findUserByClientId(clientId: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { clientId }, relations: ['languageSettings'], });
  }

  async getClientIdFromSession(req: AuthenticatedRequest): Promise<string> {
    const sessionUser = req.session?.user;
    if (!sessionUser) {
      throw new Error('User session not found');
    }

    const dbUser = await this.userRepo.findOne({
      where: { id: sessionUser.id },
    });

    if (!dbUser) {
      throw new Error('User not found');
    }

    return dbUser.clientId;
  }

  async getUserFromSession(req: AuthenticatedRequest): Promise<User> {
    const sessionUser = req.session?.user;
    if (!sessionUser) {
      throw new Error('User session not found');
    }

    const dbUser = await this.userRepo.findOne({
      where: { id: sessionUser.id },
      relations: ['languageSettings'],
    });

    if (!dbUser) {
      throw new Error('User not found');
    }

    return dbUser;
  }
}
