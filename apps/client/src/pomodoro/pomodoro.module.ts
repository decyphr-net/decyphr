import { PomodoroController } from './pomodoro.controller';
/*
https://docs.nestjs.com/modules
*/

import { Module } from '@nestjs/common';

@Module({
    imports: [],
    controllers: [PomodoroController],
    providers: [],
})
export class PomodoroModule { }
