import { describe, it, expect } from 'vitest';
import { EqualSplitStrategy } from '../../../../src/domain/expense/EqualSplitStrategy';
import { Money } from '../../../../src/domain/money/Money';
import { UserId } from '../../../../src/domain/user/UserId';

/** Pruebas doradas (docs/Algorithms.md § Equal Split y Residuales): los valores esperados son fijos. */
function splitAsText(amount: string, currency: string, userIds: string[]): [string, string][] {
  return new EqualSplitStrategy()
    .split(
      Money.parsePositive(amount, currency),
      userIds.map((id) => UserId.fromString(id)),
    )
    .map((share) => [share.userId.toString(), share.amount.toString()]);
}

describe('EqualSplitStrategy', () => {
  it('shouldSplit100CopAmongThreeAs34_33_33GivingTheRemainderByAscendingUserId', () => {
    expect(splitAsText('100', 'COP', ['user-c', 'user-a', 'user-b'])).toEqual([
      ['user-a', '34'],
      ['user-b', '33'],
      ['user-c', '33'],
    ]);
  });

  it('shouldSplit100UsdAmongThreeAs33_34_33_33', () => {
    expect(splitAsText('100.00', 'USD', ['user-b', 'user-c', 'user-a'])).toEqual([
      ['user-a', '33.34'],
      ['user-b', '33.33'],
      ['user-c', '33.33'],
    ]);
  });

  it('shouldSplit120AmongFourAs30EachAndGiveEverythingToASingleParticipant', () => {
    expect(splitAsText('120', 'COP', ['user-d', 'user-c', 'user-b', 'user-a'])).toEqual([
      ['user-a', '30'],
      ['user-b', '30'],
      ['user-c', '30'],
      ['user-d', '30'],
    ]);
    expect(splitAsText('45.67', 'EUR', ['user-a'])).toEqual([['user-a', '45.67']]);
  });
});
