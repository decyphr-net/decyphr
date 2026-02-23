import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { FocusSession } from './focus-session.entity';
import { Goal } from './goal.entity';
import { GoalEntry } from './goal-entry.entity';
import {
  AdjustFocusSessionDto,
  CreateFocusSessionDto,
  CreateGoalDto,
  GoalCheckoffDto,
  UpdateGoalDto,
} from './focus.dto';

@Injectable()
export class FocusService {
  constructor(
    @InjectRepository(FocusSession)
    private readonly focusRepo: Repository<FocusSession>,
    @InjectRepository(Goal)
    private readonly goalRepo: Repository<Goal>,
    @InjectRepository(GoalEntry)
    private readonly goalEntryRepo: Repository<GoalEntry>,
  ) {}

  private toDate(input?: string): Date | undefined {
    if (!input) return undefined;
    const parsed = new Date(input);
    if (Number.isNaN(parsed.getTime())) throw new BadRequestException('Invalid date');
    return parsed;
  }

  private computeActualSeconds(session: FocusSession, now = new Date()): number {
    const end = session.endedAt ?? (session.status === 'paused' ? session.pausedAt ?? now : now);
    const total = Math.max(0, Math.floor((end.getTime() - session.startedAt.getTime()) / 1000));
    return Math.max(0, total - session.pauseAccumulatedSeconds);
  }

  private serializeSession(session: FocusSession) {
    const actualSeconds = this.computeActualSeconds(session);
    const remainingSeconds =
      session.mode === 'time' && session.plannedSeconds != null
        ? Math.max(0, session.plannedSeconds - actualSeconds)
        : null;

    return {
      ...session,
      actualSeconds,
      remainingSeconds,
    };
  }

  async createSession(clientId: string, dto: CreateFocusSessionDto) {
    const active = await this.focusRepo.findOne({
      where: [
        { clientId, status: 'running' as any },
        { clientId, status: 'paused' as any },
      ],
      order: { startedAt: 'DESC' },
    });

    if (active) {
      throw new BadRequestException('Active session already exists');
    }

    if (dto.mode === 'time' && (dto.plannedSeconds == null || dto.plannedSeconds <= 0)) {
      throw new BadRequestException('plannedSeconds is required for time mode');
    }

    const session = this.focusRepo.create({
      id: randomUUID(),
      userId: dto.userId ?? null,
      clientId,
      mode: dto.mode,
      activityType: dto.activityType ?? 'course_material',
      goalText: dto.goalText ?? null,
      plannedSeconds: dto.mode === 'time' ? dto.plannedSeconds ?? null : null,
      actualSeconds: 0,
      status: 'running',
      startedAt: new Date(),
      endedAt: null,
      pausedAt: null,
      pauseAccumulatedSeconds: 0,
      metadataJson: dto.metadataJson ?? null,
    });

    const saved = await this.focusRepo.save(session);
    return this.serializeSession(saved);
  }

  async getActiveSession(clientId: string) {
    const session = await this.focusRepo.findOne({
      where: [
        { clientId, status: 'running' as any },
        { clientId, status: 'paused' as any },
      ],
      order: { startedAt: 'DESC' },
    });

    return session ? this.serializeSession(session) : null;
  }

  async pauseSession(clientId: string, id: string) {
    const session = await this.getOwnedSession(clientId, id);
    if (session.status !== 'running') return this.serializeSession(session);

    session.status = 'paused';
    session.pausedAt = new Date();
    const saved = await this.focusRepo.save(session);
    return this.serializeSession(saved);
  }

  async resumeSession(clientId: string, id: string) {
    const session = await this.getOwnedSession(clientId, id);
    if (session.status !== 'paused') return this.serializeSession(session);

    const now = new Date();
    if (session.pausedAt) {
      const pauseDelta = Math.max(
        0,
        Math.floor((now.getTime() - session.pausedAt.getTime()) / 1000),
      );
      session.pauseAccumulatedSeconds += pauseDelta;
    }

    session.pausedAt = null;
    session.status = 'running';
    const saved = await this.focusRepo.save(session);
    return this.serializeSession(saved);
  }

  async adjustSession(clientId: string, id: string, dto: AdjustFocusSessionDto) {
    const session = await this.getOwnedSession(clientId, id);
    if (session.status !== 'paused' && session.status !== 'running') {
      return this.serializeSession(session);
    }

    if (session.mode !== 'time') {
      throw new BadRequestException('Adjust is only supported for time mode sessions');
    }

    if (dto.plannedSeconds != null) {
      session.plannedSeconds = dto.plannedSeconds;
    }

    if (dto.remainingSecondsDelta != null) {
      const actual = this.computeActualSeconds(session);
      const currentPlanned = session.plannedSeconds ?? 0;
      const currentRemaining = Math.max(0, currentPlanned - actual);
      const nextRemaining = Math.max(0, currentRemaining + dto.remainingSecondsDelta);
      session.plannedSeconds = actual + nextRemaining;
    }

    const saved = await this.focusRepo.save(session);
    return this.serializeSession(saved);
  }

  async completeSession(clientId: string, id: string) {
    const session = await this.getOwnedSession(clientId, id);
    if (session.status === 'completed' || session.status === 'cancelled') {
      return this.serializeSession(session);
    }

    const now = new Date();

    if (session.status === 'paused' && session.pausedAt) {
      const pauseDelta = Math.max(
        0,
        Math.floor((now.getTime() - session.pausedAt.getTime()) / 1000),
      );
      session.pauseAccumulatedSeconds += pauseDelta;
      session.pausedAt = null;
    }

    session.endedAt = now;
    session.status = 'completed';
    session.actualSeconds = this.computeActualSeconds(session, now);
    const saved = await this.focusRepo.save(session);

    await this.createDerivedGoalEntries(saved);

    return this.serializeSession(saved);
  }

  async cancelSession(clientId: string, id: string) {
    const session = await this.getOwnedSession(clientId, id);
    if (session.status === 'completed' || session.status === 'cancelled') {
      return this.serializeSession(session);
    }

    const now = new Date();
    if (session.status === 'paused' && session.pausedAt) {
      const pauseDelta = Math.max(
        0,
        Math.floor((now.getTime() - session.pausedAt.getTime()) / 1000),
      );
      session.pauseAccumulatedSeconds += pauseDelta;
      session.pausedAt = null;
    }

    session.endedAt = now;
    session.status = 'cancelled';
    session.actualSeconds = this.computeActualSeconds(session, now);
    const saved = await this.focusRepo.save(session);
    return this.serializeSession(saved);
  }

  async getHistory(
    clientId: string,
    query: {
      from?: string;
      to?: string;
      activityType?: string;
      mode?: string;
      page?: number;
      pageSize?: number;
    },
  ) {
    const page = Math.max(1, Number(query.page || 1));
    const pageSize = Math.max(1, Math.min(100, Number(query.pageSize || 20)));

    const qb = this.focusRepo
      .createQueryBuilder('s')
      .where('s.clientId = :clientId', { clientId });

    const from = this.toDate(query.from);
    const to = this.toDate(query.to);

    if (from) qb.andWhere('s.startedAt >= :from', { from });
    if (to) qb.andWhere('s.startedAt <= :to', { to });
    if (query.activityType) qb.andWhere('s.activityType = :activityType', { activityType: query.activityType });
    if (query.mode) qb.andWhere('s.mode = :mode', { mode: query.mode });

    qb.orderBy('s.startedAt', 'DESC').skip((page - 1) * pageSize).take(pageSize);

    const [items, total] = await qb.getManyAndCount();

    return {
      total,
      page,
      pageSize,
      data: items.map((item) => this.serializeSession(item)),
    };
  }

  async createGoal(clientId: string, dto: CreateGoalDto) {
    const periodStart = this.toDate(dto.periodStart);
    const periodEnd = this.toDate(dto.periodEnd);
    if (!periodStart || !periodEnd || periodStart >= periodEnd) {
      throw new BadRequestException('periodStart must be before periodEnd');
    }

    const goal = this.goalRepo.create({
      id: randomUUID(),
      userId: dto.userId ?? null,
      clientId,
      title: dto.title,
      description: dto.description ?? null,
      periodType: dto.periodType,
      periodStart,
      periodEnd,
      targetType: dto.targetType,
      targetValue: String(dto.targetValue),
      activityType: dto.activityType ?? null,
      status: dto.status ?? 'active',
    });

    return this.goalRepo.save(goal);
  }

  async getGoals(clientId: string, query: Record<string, string | undefined>) {
    const qb = this.goalRepo
      .createQueryBuilder('g')
      .where('g.clientId = :clientId', { clientId })
      .orderBy('g.createdAt', 'DESC');

    if (query.status) qb.andWhere('g.status = :status', { status: query.status });
    if (query.periodType) qb.andWhere('g.periodType = :periodType', { periodType: query.periodType });
    if (query.activityType) qb.andWhere('g.activityType = :activityType', { activityType: query.activityType });

    const from = this.toDate(query.from);
    const to = this.toDate(query.to);
    if (from) qb.andWhere('g.periodEnd >= :from', { from });
    if (to) qb.andWhere('g.periodStart <= :to', { to });

    const goals = await qb.getMany();
    const withProgress = await Promise.all(goals.map((goal) => this.getGoalProgress(clientId, goal.id)));
    return withProgress;
  }

  async getGoal(clientId: string, id: string) {
    const goal = await this.getOwnedGoal(clientId, id);
    const progress = await this.computeGoalProgress(goal);
    return { ...goal, progress };
  }

  async updateGoal(clientId: string, id: string, dto: UpdateGoalDto) {
    const goal = await this.getOwnedGoal(clientId, id);

    if (dto.title !== undefined) goal.title = dto.title;
    if (dto.description !== undefined) goal.description = dto.description;
    if (dto.targetValue !== undefined) goal.targetValue = String(dto.targetValue);
    if (dto.status !== undefined) goal.status = dto.status;
    if (dto.activityType !== undefined) goal.activityType = dto.activityType;

    if (dto.periodStart) goal.periodStart = this.toDate(dto.periodStart)!;
    if (dto.periodEnd) goal.periodEnd = this.toDate(dto.periodEnd)!;

    if (goal.periodStart >= goal.periodEnd) {
      throw new BadRequestException('periodStart must be before periodEnd');
    }

    const saved = await this.goalRepo.save(goal);
    const progress = await this.computeGoalProgress(saved);
    return { ...saved, progress };
  }

  async archiveGoal(clientId: string, id: string) {
    const goal = await this.getOwnedGoal(clientId, id);
    goal.status = 'archived';
    const saved = await this.goalRepo.save(goal);
    const progress = await this.computeGoalProgress(saved);
    return { ...saved, progress };
  }

  async checkoffGoal(clientId: string, id: string, dto: GoalCheckoffDto) {
    const goal = await this.getOwnedGoal(clientId, id);

    const entry = this.goalEntryRepo.create({
      id: randomUUID(),
      goalId: goal.id,
      clientId,
      entryType: 'manual_checkoff',
      value: String(dto.value ?? 1),
      note: dto.note ?? null,
      focusSessionId: null,
      occurredAt: this.toDate(dto.occurredAt) ?? new Date(),
    });

    await this.goalEntryRepo.save(entry);
    await this.refreshGoalStatus(goal.id);

    return this.getGoal(clientId, id);
  }

  async getGoalProgress(clientId: string, id: string) {
    const goal = await this.getOwnedGoal(clientId, id);
    const progress = await this.computeGoalProgress(goal);
    return { goalId: id, ...progress };
  }

  async getProgressSummary(clientId: string, query: Record<string, string | undefined>) {
    const now = new Date();
    const yearStart = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const day = now.getUTCDay();
    const offset = day === 0 ? 6 : day - 1;
    const weekStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - offset));

    const customFrom = this.toDate(query.from);
    const customTo = this.toDate(query.to);

    const sessions = await this.focusRepo.find({ where: { clientId, status: 'completed' as any } });
    const minutesInRange = (from: Date, to: Date) =>
      sessions
        .filter((s) => s.endedAt && s.endedAt >= from && s.endedAt <= to)
        .reduce((sum, s) => sum + this.computeActualSeconds(s), 0) / 60;

    const goals = await this.goalRepo.find({ where: { clientId } });
    const goalProgress = await Promise.all(goals.map((g) => this.computeGoalProgress(g)));
    const activeGoals = goals.filter((g) => g.status !== 'archived').length;
    const completedGoals = goals.filter((g, idx) => g.status === 'completed' || goalProgress[idx].isComplete).length;

    return {
      weeklyMinutes: minutesInRange(weekStart, now),
      monthlyMinutes: minutesInRange(monthStart, now),
      yearlyMinutes: minutesInRange(yearStart, now),
      customMinutes:
        customFrom && customTo ? minutesInRange(customFrom, customTo) : null,
      goals: {
        total: goals.length,
        active: activeGoals,
        completed: completedGoals,
      },
    };
  }

  private async getOwnedSession(clientId: string, id: string) {
    const session = await this.focusRepo.findOne({ where: { id, clientId } });
    if (!session) throw new NotFoundException('Session not found');
    return session;
  }

  private async getOwnedGoal(clientId: string, id: string) {
    const goal = await this.goalRepo.findOne({ where: { id, clientId } });
    if (!goal) throw new NotFoundException('Goal not found');
    return goal;
  }

  private async computeGoalProgress(goal: Goal) {
    const sumRaw = await this.goalEntryRepo
      .createQueryBuilder('e')
      .select('COALESCE(SUM(e.value), 0)', 'sum')
      .where('e.goalId = :goalId', { goalId: goal.id })
      .getRawOne<{ sum: string }>();

    const achieved = Number(sumRaw?.sum || 0);
    const target = Number(goal.targetValue);
    const pct = target > 0 ? Math.min(100, (achieved / target) * 100) : 0;

    return {
      achieved,
      target,
      remaining: Math.max(0, target - achieved),
      percent: pct,
      isComplete: achieved >= target,
    };
  }

  private async refreshGoalStatus(goalId: string) {
    const goal = await this.goalRepo.findOne({ where: { id: goalId } });
    if (!goal) return;

    const progress = await this.computeGoalProgress(goal);
    if (progress.isComplete && goal.status === 'active') {
      goal.status = 'completed';
      await this.goalRepo.save(goal);
    }
  }

  private async createDerivedGoalEntries(session: FocusSession) {
    if (session.status !== 'completed' || !session.endedAt) return;

    const goals = await this.goalRepo.find({
      where: {
        clientId: session.clientId,
        status: 'active' as any,
        periodStart: LessThanOrEqual(session.endedAt),
        periodEnd: MoreThanOrEqual(session.endedAt),
      },
    });

    for (const goal of goals) {
      if (goal.activityType && goal.activityType !== session.activityType) continue;

      const existing = await this.goalEntryRepo.findOne({
        where: {
          goalId: goal.id,
          focusSessionId: session.id,
        },
      });
      if (existing) continue;

      let value = 1;
      if (goal.targetType === 'time_minutes') {
        value = Number((session.actualSeconds / 60).toFixed(2));
      } else if (goal.targetType === 'session_count') {
        value = 1;
      } else if (goal.targetType === 'unit_count') {
        value = 1;
      }

      const entry = this.goalEntryRepo.create({
        id: randomUUID(),
        goalId: goal.id,
        clientId: session.clientId,
        entryType: 'focus_session',
        value: String(value),
        note: null,
        focusSessionId: session.id,
        occurredAt: session.endedAt,
      });

      await this.goalEntryRepo.save(entry);
      await this.refreshGoalStatus(goal.id);
    }
  }
}
