import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
});

export const createProjectSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
});

export const updateProjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  status: z.enum(["ACTIVE", "COMPLETED", "ARCHIVED"]).optional(),
});

export const createMilestoneSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  dueDate: z.string().datetime().optional(),
});

export const createTaskSchema = z.object({
  title: z.string().min(1).max(200),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  status: z.enum(["TODO", "DONE"]).optional(),
  assigneeId: z.string().optional().nullable(),
});
