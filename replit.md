# Overview

This is an IT Support Ticketing System built as a full-stack web application. The system allows employees to create support tickets, tracks ticket status and priorities, manages assignments, and provides role-based access control. It features a modern React frontend with a Node.js/Express backend, using PostgreSQL for data persistence and implementing session-based authentication with Passport.js.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript, built using Vite for fast development and optimized builds
- **UI Library**: Radix UI components with Tailwind CSS for styling, implementing the shadcn/ui design system
- **State Management**: TanStack React Query for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **Form Handling**: React Hook Form with Zod validation for type-safe form management
- **Authentication**: Session-based authentication with protected routes and role-based access control

## Backend Architecture
- **Runtime**: Node.js with Express.js framework using TypeScript and ES modules
- **Authentication**: Passport.js with LocalStrategy for username/password authentication
- **Session Management**: Express-session with PostgreSQL session store for persistence
- **File Handling**: Multer middleware for attachment uploads with file system storage
- **API Design**: RESTful API endpoints with comprehensive error handling and request logging

## Database Design
- **ORM**: Drizzle ORM with Neon serverless PostgreSQL connection
- **Schema**: Relational design with users, tickets, comments, attachments, and audit_logs tables
- **Enums**: PostgreSQL enums for user roles, ticket status, and priority levels
- **Relationships**: Foreign key constraints with cascade delete for data integrity

## Key Features
- **Role-Based Access Control**: Four user roles (admin, agent, employee, manager) with different permissions
- **Ticket Management**: Complete CRUD operations with status tracking, priority levels, and SLA monitoring
- **File Attachments**: Support for multiple file uploads per ticket with secure storage
- **Audit Trail**: Comprehensive logging of all ticket changes and user actions
- **Real-time Updates**: Optimistic updates with React Query for responsive user experience

## Security Measures
- **Authentication**: Session-based auth with secure cookies and CSRF protection
- **Password Security**: Bcrypt hashing with salt rounds for password storage
- **File Security**: Validated file uploads with type checking and secure storage paths
- **SQL Injection Prevention**: Parameterized queries through Drizzle ORM

# External Dependencies

## Core Runtime
- **Database**: PostgreSQL via Neon serverless with connection pooling
- **Session Store**: PostgreSQL-backed session storage using connect-pg-simple

## Development Tools
- **Build System**: Vite with TypeScript compilation and hot module replacement
- **Package Manager**: npm with lockfile for dependency consistency
- **Development Server**: Vite dev server with Express API proxy

## UI and Styling
- **Component Library**: Radix UI primitives for accessible components
- **Styling**: Tailwind CSS with custom design tokens and dark mode support
- **Icons**: Lucide React for consistent iconography
- **Fonts**: Google Fonts integration (Inter, Architects Daughter, DM Sans, Fira Code, Geist Mono)

## Authentication and Security
- **Password Hashing**: bcrypt for secure password storage
- **Session Management**: express-session with secure configuration
- **Authentication Strategy**: passport-local for username/password authentication

## File and Data Handling
- **File Uploads**: multer for multipart form handling
- **Date Handling**: date-fns for date manipulation and formatting
- **Validation**: Zod for runtime type validation and schema definition
- **Form Management**: React Hook Form with Radix UI form components

## Development and Build
- **TypeScript**: Full TypeScript support across client and server
- **ESLint/Prettier**: Code formatting and linting (implied by project structure)
- **Environment Variables**: dotenv for configuration management
- **Process Management**: tsx for TypeScript execution in development