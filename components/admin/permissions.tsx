"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

import type { PermissionRole } from "./types";
import { Empty, Panel, Pill } from "./utils";
import { pluralRu } from "@/lib/utils/formatting";
import { Input } from "@/components/ui/input";
import { Checkbox } from "../ui/checkbox";
import { Label } from "../ui/label";

type PermissionsTabProps = {
  roles: PermissionRole[];
  selectedRole: PermissionRole | null;
  selectedRoleId: string;
  newRoleLabel: string;
  newRoleId: string;
  permissionKeys: string[];
  draftPermissions: string[];
  saving: boolean;
  canManage: boolean;
  permissionLabels: Record<string, { label: string; description: string }>;
  onSelectRole: (roleId: string) => void;
  onNewRoleLabelChange: (value: string) => void;
  onNewRoleIdChange: (value: string) => void;
  onCreateRole: () => void;
  onDraftPermissionsChange: (permissions: string[]) => void;
  onSavePermissions: () => void;
};

export function PermissionsTab({
  roles,
  selectedRole,
  selectedRoleId,
  newRoleLabel,
  newRoleId,
  permissionKeys,
  draftPermissions,
  saving,
  canManage,
  permissionLabels,
  onSelectRole,
  onNewRoleLabelChange,
  onNewRoleIdChange,
  onCreateRole,
  onDraftPermissionsChange,
  onSavePermissions,
}: PermissionsTabProps) {
  if (!canManage) return null;

  return (
    <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
      <Panel>
        <h2 className="text-lg font-semibold">Роли Discord</h2>

        <p className="mt-1 text-sm text-muted-foreground">
          Права привязаны к ID Discord-роли.
        </p>

        <div className="mt-4 space-y-2">
          {roles.map((role) => (
            <button
              key={role.discordRoleId}
              type="button"
              onClick={() => onSelectRole(role.discordRoleId)}
              className={cn(
                "w-full rounded-md border p-3 text-left transition",
                selectedRoleId === role.discordRoleId
                  ? "border-primary bg-primary/5"
                  : "hover:bg-muted/50",
              )}
            >
              <span className="flex items-center justify-between gap-2 font-medium">
                {role.label}

                {role.root ? (
                  <Pill tone="good">Полный доступ</Pill>
                ) : role.builtin ? (
                  <Pill>Системная</Pill>
                ) : (
                  <Pill>Дополнительная</Pill>
                )}
              </span>

              <span className="mt-1 block text-muted-foreground">
                {role.discordRoleId}
              </span>

              <span className="mt-2 block text-xs text-muted-foreground">
                {role.permissions.length}{" "}
                {pluralRu(
                  role.permissions.length,
                  "разрешение",
                  "разрешения",
                  "разрешений",
                )}
              </span>
            </button>
          ))}
        </div>

        <div className="mt-5 border-t pt-5">
          <h3 className="font-semibold">Добавить роль</h3>

          <div className="mt-3 space-y-2">
            <Input
              value={newRoleLabel}
              onChange={(event) => onNewRoleLabelChange(event.target.value)}
              placeholder="Название роли"
            />

            <Input
              value={newRoleId}
              onChange={(event) => onNewRoleIdChange(event.target.value)}
              placeholder="ID роли Discord"
            />

            <Button
              className="w-full"
              onClick={onCreateRole}
              disabled={saving || !newRoleId.trim() || !newRoleLabel.trim()}
            >
              Добавить профиль прав
            </Button>
          </div>
        </div>
      </Panel>

      <Panel>
        {selectedRole ? (
          <>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">{selectedRole.label}</h2>

                <p className="mt-1 text-muted-foreground">
                  {selectedRole.discordRoleId}
                </p>
              </div>

              {selectedRole.root && (
                <Pill tone="good">Системный полный доступ</Pill>
              )}
            </div>

            <p className="mt-3 text-sm text-muted-foreground">
              Отметь операции, доступные обладателям этой роли.
            </p>

            <div className="mt-4 space-y-2">
              {permissionKeys.map((key) => {
                const item = permissionLabels[key] ?? {
                  label: key,
                  description: "Разрешение системы",
                };

                const checked = draftPermissions.includes(key);
                const disabled =
                  selectedRole.root || key === "permissions.manage";

                return (
                  <Label
                    key={key}
                    className={cn(
                      "flex gap-3 rounded-md border px-4 py-2.5",
                      disabled && "opacity-60",
                    )}
                  >
                    <Checkbox
                      checked={checked}
                      disabled={disabled}
                      onCheckedChange={(event) =>
                        onDraftPermissionsChange(
                          event
                            ? [...draftPermissions, key]
                            : draftPermissions.filter((item) => item !== key),
                        )
                      }
                    />

                    <span>
                      <span className="block text-sm font-medium">
                        {item.label}
                      </span>

                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {item.description}
                      </span>
                    </span>
                  </Label>
                );
              })}
            </div>

            <Button
              className="mt-5 w-full"
              onClick={onSavePermissions}
              disabled={saving || selectedRole.root}
            >
              {saving ? "Сохраняем…" : "Сохранить права"}
            </Button>
          </>
        ) : (
          <Empty>Выбери роль слева.</Empty>
        )}
      </Panel>
    </div>
  );
}
