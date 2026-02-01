/**
 * MindfulPath Shared Types
 * 
 * Common TypeScript types shared between web and API applications.
 */

// ==========================================
// User Types
// ==========================================

export enum UserRole {
    PATIENT = 'PATIENT',
    THERAPIST = 'THERAPIST',
    ADMIN = 'ADMIN',
}

export interface User {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    avatarUrl?: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface TherapistProfile {
    id: string;
    userId: string;
    licenseNumber?: string;
    specialty?: string;
    bio?: string;
}

export interface PatientProfile {
    id: string;
    userId: string;
    dateOfBirth?: string;
    emergencyContact?: string;
}

// ==========================================
// Homework Types
// ==========================================

export enum HomeworkType {
    READING = 'READING',
    WRITING = 'WRITING',
    QUIZ = 'QUIZ',
    DRAWING = 'DRAWING',
    VOICE_NOTE = 'VOICE_NOTE',
    CHECKLIST = 'CHECKLIST',
    CUSTOM = 'CUSTOM',
}

export enum AssignmentStatus {
    PENDING = 'PENDING',
    IN_PROGRESS = 'IN_PROGRESS',
    COMPLETED = 'COMPLETED',
    OVERDUE = 'OVERDUE',
}

export interface Homework {
    id: string;
    title: string;
    description?: string;
    type: HomeworkType;
    content: Record<string, unknown>;
    createdById: string;
    isTemplate: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface HomeworkAssignment {
    id: string;
    homeworkId: string;
    patientId: string;
    dueDate?: string;
    status: AssignmentStatus;
    response?: Record<string, unknown>;
    completedAt?: string;
    createdAt: string;
    updatedAt: string;
    homework?: Homework;
}

// ==========================================
// Mood Types
// ==========================================

export interface MoodEntry {
    id: string;
    patientId: string;
    moodScore: number; // 1-10
    notes?: string;
    tags: string[];
    createdAt: string;
}

export interface CreateMoodEntryDto {
    moodScore: number;
    notes?: string;
    tags?: string[];
}

// ==========================================
// Session Types
// ==========================================

export enum SessionStatus {
    SCHEDULED = 'SCHEDULED',
    IN_PROGRESS = 'IN_PROGRESS',
    COMPLETED = 'COMPLETED',
    CANCELLED = 'CANCELLED',
    NO_SHOW = 'NO_SHOW',
}

export interface Session {
    id: string;
    patientId: string;
    scheduledAt: string;
    startedAt?: string;
    endedAt?: string;
    status: SessionStatus;
    videoRoomId?: string;
    videoProvider?: string;
    createdAt: string;
    updatedAt: string;
}

export interface SessionSummary {
    id: string;
    sessionId: string;
    summary: string;
    keyPoints: string[];
    nextSteps: string[];
    createdAt: string;
}

// ==========================================
// API Response Types
// ==========================================

export interface ApiResponse<T> {
    data: T;
    message?: string;
}

export interface ApiError {
    statusCode: number;
    message: string;
    error?: string;
}

export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

// ==========================================
// Auth Types
// ==========================================

export interface LoginDto {
    email: string;
    password: string;
}

export interface AuthResponse {
    accessToken: string;
    refreshToken: string;
    user: User;
}

export interface TokenPayload {
    sub: string;
    email: string;
    role: UserRole;
    iat: number;
    exp: number;
}
