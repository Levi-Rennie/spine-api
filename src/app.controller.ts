import {
  Controller,
  Get,
  Param,
  Post,
  Delete,
  Patch,
  Body,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { z } from 'zod';
import { AppService } from './app.service';
import { DatabaseService } from './database.service';

const createItemSchema = z.object({
  member_id: z.number().int().positive(),
  book_title: z.string().min(1),
  borrowed_on: z.string().date(),
  due_on: z.string().date(),
});

const editLoanSchema = z.object({
  due_on: z.string().date(),
});

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly databaseService: DatabaseService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('members')
  async getMembers() {
    return this.databaseService.query('SELECT * FROM members LIMIT 5');
  }

  @Get('items')
  async getItems() {
    const result = await this.databaseService.query(
      `SELECT l.loan_id, l.book_title, l.borrowed_on, l.due_on,
              m.member_id, m.full_name, m.email
       FROM loans l
       JOIN members m ON l.member_id = m.member_id
       ORDER BY l.loan_id`,
    );
    return result;
  }

  @Get('items/:id')
  async getItem(@Param('id') id: string) {
    const result = await this.databaseService.query(
      `SELECT l.loan_id, l.book_title, l.borrowed_on, l.due_on,
              m.member_id, m.full_name, m.email
       FROM loans l
       JOIN members m ON l.member_id = m.member_id
       WHERE l.loan_id = $1`,
      [Number(id)],
    );
    return result[0] ?? { message: 'Not found' };
  }

  @Post('items')
  async createItem(@Body() body: unknown) {
    const parsed = createItemSchema.safeParse(body);

    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues);
    }

    const { member_id, book_title, borrowed_on, due_on } = parsed.data;

    const rows = await this.databaseService.query(
      `INSERT INTO loans (member_id, book_title, borrowed_on, due_on)
       VALUES ($1, $2, $3, $4)
       RETURNING loan_id, member_id, book_title, borrowed_on, due_on`,
      [member_id, book_title, borrowed_on, due_on],
    );

    return rows[0];
  }

  @Patch('items/:id')
  async editLoan(@Param('id') id: string, @Body() body: unknown) {
    const parsed = editLoanSchema.safeParse(body);

    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues);
    }

    const rows = await this.databaseService.query(
      `UPDATE loans SET due_on = $1 WHERE loan_id = $2
       RETURNING loan_id, member_id, book_title, borrowed_on, due_on`,
      [parsed.data.due_on, Number(id)],
    );

    if (rows.length === 0) {
      throw new NotFoundException(`Loan ${id} not found`);
    }

    return rows[0];
  }

  @Delete('items/:id')
  async deleteItem(@Param('id') id: string) {
    const result = await this.databaseService.query(
      'DELETE FROM loans WHERE loan_id = $1 RETURNING loan_id',
      [Number(id)],
    );

    if (result.length === 0) {
      throw new NotFoundException(`Loan ${id} not found`);
    }

    return { deleted: Number(id) };
  }
}
