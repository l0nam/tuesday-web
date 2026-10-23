"use client";

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import type { BlockedRow, ReviewRow } from "./types";
import { Empty, Panel, Pill } from "./utils";
import { formatDate, pluralRu } from "@/lib/utils/formatting";

type ReviewsTabProps = {
  reviews: ReviewRow[];
  blockedRows: BlockedRow[];
  blockedUsers: Record<string, boolean>;
  can: (permission: string) => boolean;
  onBlockReview: (row: ReviewRow, blocked: boolean) => void;
  onDeleteReview: (row: ReviewRow) => void;
  onUnblockUser: (userId: string) => void;
};

export function ReviewsTab({
  reviews,
  blockedRows,
  blockedUsers,
  can,
  onBlockReview,
  onDeleteReview,
  onUnblockUser,
}: ReviewsTabProps) {
  return (
    <div className="mt-6 space-y-5">
      <Panel>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Модерация отзывов</h2>
          </div>

          <Pill>
            {reviews.length}{" "}
            {pluralRu(reviews.length, "отзыв", "отзова", "отзывов")}
          </Pill>
        </div>

        <div className="mt-4 space-y-3">
          {reviews.map((row) => (
            <Card key={row.id}>
              <CardHeader>
                <CardTitle>{row.mcName ?? row.userName}</CardTitle>

                <CardDescription>
                  {row.discordId} · {formatDate(row.createdAt)}
                </CardDescription>

                <CardAction className="flex items-center gap-1.5">
                  {can("reviews.block") && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        onBlockReview(row, !blockedUsers[row.userId])
                      }
                    >
                      {blockedUsers[row.userId]
                        ? "Разблокировать отзывы"
                        : "Запретить новые отзывы"}
                    </Button>
                  )}

                  {can("reviews.delete") && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => onDeleteReview(row)}
                    >
                      Удалить отзыв
                    </Button>
                  )}
                </CardAction>
              </CardHeader>

              <CardContent className="mt-3 whitespace-pre-wrap wrap-anywhere leading-relaxed">
                {row.text}
              </CardContent>
            </Card>
          ))}

          {reviews.length === 0 && <Empty>Отзывов пока нет.</Empty>}
        </div>
      </Panel>

      {can("reviews.block") && (
        <Panel>
          <h2 className="text-lg font-semibold">
            Пользователи с ограничением на отзывы
          </h2>

          <div className="mt-4 space-y-2">
            {blockedRows.map((row) => (
              <Card key={row.userId}>
                <CardHeader>
                  <CardTitle>{row.mcName ?? row.userName}</CardTitle>
                  <CardDescription>
                    Discord: {row.discordId} ·{" "}
                    {row.reason || "Причина не указана"}
                  </CardDescription>

                  <CardAction>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onUnblockUser(row.userId)}
                    >
                      Разблокировать
                    </Button>
                  </CardAction>
                </CardHeader>
              </Card>
            ))}

            {blockedRows.length === 0 && (
              <Empty>Заблокированных пользователей нет.</Empty>
            )}
          </div>
        </Panel>
      )}
    </div>
  );
}
