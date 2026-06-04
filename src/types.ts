/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Factory {
  id: string;
  name: string;
  createdAt: any; // Can be Firebase Timestamp or ISO string
}

export interface ProductionData {
  allocated: number;
  carried: number;
  days: Record<number, number>; // day index (1-31) -> quantity in liters
  updatedAt: any; // Timestamp or ISO string
}

export interface StatsSummary {
  allocated: number;
  carried: number;
  totalDrawn: number;
  remaining: number;
  percentageDrawn: number;
  totalTrucks: number;
}
