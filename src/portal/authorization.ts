// Role-Based Authorization & Security Rules
// ENS Djelfa — ملحقة المدرسة العليا للأساتذة - الجلفة
import { UserProfile, UserRole, AdministrativePermissions, TeacherRecord, AuditLogItem } from './types';

/**
 * IDOR Prevention: Checks if an actor is authorized to read or update a specific student record
 */
export function canAccessStudentRecord(
  actor: UserProfile | null,
  targetStudentId: string,
  targetStudentGroupId?: number,
  teacherRecord?: TeacherRecord
): boolean {
  if (!actor || !actor.is_active) return false;

  // 1. Super Admin and Admin can access student records
  if (actor.role === 'super_admin' || actor.role === 'admin') {
    return true;
  }

  // 2. Student can ONLY access their own record
  if (actor.role === 'student') {
    return actor.id === targetStudentId;
  }

  // 3. Teacher can only access students enrolled in groups assigned to them
  if (actor.role === 'teacher' && teacherRecord && targetStudentGroupId !== undefined) {
    return teacherRecord.assigned_groups.some((g) => g.group_id === targetStudentGroupId);
  }

  return false;
}

/**
 * Checks if a teacher is authorized to record or modify attendance for a specific academic group
 */
export function canRecordAttendanceForGroup(
  actor: UserProfile | null,
  targetGroupId: number,
  teacherRecord?: TeacherRecord
): boolean {
  if (!actor || !actor.is_active) return false;

  // Super Admin and Admin with permissions
  if (actor.role === 'super_admin' || actor.role === 'admin') {
    return true;
  }

  // Teacher must have explicit assignment for this group
  if (actor.role === 'teacher' && teacherRecord) {
    return teacherRecord.assigned_groups.some((g) => g.group_id === targetGroupId);
  }

  return false;
}

/**
 * Granular Administrative Permission Enforcement
 */
export function canPerformAdminAction(
  actor: UserProfile | null,
  permissions: AdministrativePermissions | null,
  actionKey: keyof Omit<AdministrativePermissions, 'admin_id' | 'granted_by' | 'updated_at'>
): boolean {
  if (!actor || !actor.is_active) return false;

  // Super administrator has unrestricted authority
  if (actor.role === 'super_admin') {
    return true;
  }

  // Sub-administrator must have explicit permission
  if (actor.role === 'admin' && permissions) {
    return Boolean(permissions[actionKey]);
  }

  return false;
}

/**
 * Create a structured audit log entry for security and administrative accountability
 */
export function createAuditLogEntry(
  actor: UserProfile | null,
  action: string,
  targetTable: string,
  targetId: string,
  details: Record<string, any>
): AuditLogItem {
  return {
    id: 'log_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6),
    actor_id: actor?.id || 'anonymous',
    actor_name: actor?.full_name || 'مستخدم غير مسجل',
    actor_role: actor?.role || 'guest',
    action,
    target_table: targetTable,
    target_id: targetId,
    details,
    created_at: new Date().toISOString(),
  };
}
