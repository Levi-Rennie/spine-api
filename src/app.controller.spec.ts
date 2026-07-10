import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseService } from './database.service';

describe('AppController', () => {
  let appController: AppController;
  let query: jest.Mock;

  beforeEach(async () => {
    query = jest.fn();
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        { provide: DatabaseService, useValue: { query } },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!');
    });
  });

  describe('returnLoan', () => {
    it('marks an outstanding loan as returned', async () => {
      query
        .mockResolvedValueOnce([{ loan_id: 1, returned_on: null }]) // lookup
        .mockResolvedValueOnce([
          { loan_id: 1, book_title: 'Dune', returned_on: '2026-07-10' },
        ]); // update

      const result = await appController.returnLoan('1');

      expect(result).toEqual({
        loan_id: 1,
        book_title: 'Dune',
        returned_on: '2026-07-10',
      });
      // second call is the UPDATE ... SET returned_on = CURRENT_DATE
      expect(query).toHaveBeenCalledTimes(2);
      expect(query).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('CURRENT_DATE'),
        [1],
      );
    });

    it('rejects a second return with 409 (already returned)', async () => {
      // loan exists but already carries a return date
      query.mockResolvedValueOnce([{ loan_id: 1, returned_on: '2026-07-01' }]);

      await expect(appController.returnLoan('1')).rejects.toBeInstanceOf(
        ConflictException,
      );
      // no UPDATE should be attempted
      expect(query).toHaveBeenCalledTimes(1);
    });

    it('returns 404 for an unknown loan id', async () => {
      query.mockResolvedValueOnce([]); // lookup finds nothing

      await expect(appController.returnLoan('999')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(query).toHaveBeenCalledTimes(1);
    });
  });
});
