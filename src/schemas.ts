/**
 * Collection schemas — the single source of truth for data shape and
 * permissions, imported by BOTH the worker (enforcement) and the frontend.
 */

import type { CollectionSchema } from 'deepspace/schema'
import { usersSchema } from './schemas/users-schema'
import { projectsSchema } from './schemas/projects-schema'
import { messagesSchema } from './schemas/messages-schema'
import { aiUsageSchema } from './schemas/usage-schema'

export const schemas: CollectionSchema[] = [usersSchema, projectsSchema, messagesSchema, aiUsageSchema]
