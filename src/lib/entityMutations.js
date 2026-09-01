/**
 * Authorized entity mutation helpers.
 *
 * All protected frontend mutations MUST go through these helpers (which call
 * the `manageRecord` backend function) instead of direct SDK calls. The backend
 * function checks Designation Access permissions before performing the mutation.
 *
 * Usage (drop-in replacement for base44.entities.X.create/update/delete):
 *   import { createEntity, updateEntity, deleteEntity, bulkUpdateEntities, bulkDeleteEntities } from '@/lib/entityMutations';
 *   await createEntity('Employee', data);
 *   await updateEntity('Employee', id, partialData);
 *   await deleteEntity('Employee', id);
 *   await bulkUpdateEntities('Employee', [id1, id2], { status: 'active' });
 *
 * Self-service (user creates/updates their own record):
 *   await createEntity('Expense', data, { context: 'self' });
 */

import { base44 } from '@/api/base44Client';

async function callManageRecord(payload) {
  const res = await base44.functions.invoke('manageRecord', payload);
  if (res?.data?.error) throw new Error(res.data.error);
  return res?.data?.data;
}

export function createEntity(entity, data, options = {}) {
  return callManageRecord({ entity, action: 'create', data, context: options.context });
}

export function updateEntity(entity, id, data, options = {}) {
  return callManageRecord({ entity, action: 'update', id, data, context: options.context });
}

export function deleteEntity(entity, id, options = {}) {
  return callManageRecord({ entity, action: 'delete', id, context: options.context });
}

export function bulkCreateEntities(entity, data, options = {}) {
  return callManageRecord({ entity, action: 'bulkCreate', data, context: options.context });
}

export function bulkUpdateEntities(entity, ids, data, options = {}) {
  return callManageRecord({ entity, action: 'bulkUpdate', ids, data, context: options.context });
}

export function bulkDeleteEntities(entity, ids, options = {}) {
  return callManageRecord({ entity, action: 'bulkDelete', ids, context: options.context });
}

export function bulkDeleteByFilter(entity, filter, options = {}) {
  return callManageRecord({ entity, action: 'bulkDelete', filter, context: options.context });
}