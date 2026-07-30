-- aifreeware.net
-- Accounts and saved course progress.
--
-- The four auth tables follow Better Auth's expected shape so we are not
-- hand-rolling password hashing or session handling. `progress` is ours.

create table if not exists "user" (
  id             text primary key,
  name           text,
  email          text not null unique,
  "emailVerified" boolean not null default false,
  image          text,
  "createdAt"    timestamptz not null default now(),
  "updatedAt"    timestamptz not null default now()
);

create table if not exists session (
  id          text primary key,
  "userId"    text not null references "user"(id) on delete cascade,
  token       text not null unique,
  "expiresAt" timestamptz not null,
  "ipAddress" text,
  "userAgent" text,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);
create index if not exists session_user_idx on session("userId");
create index if not exists session_token_idx on session(token);

create table if not exists account (
  id                      text primary key,
  "userId"                text not null references "user"(id) on delete cascade,
  "accountId"             text not null,
  "providerId"            text not null,
  "accessToken"           text,
  "refreshToken"          text,
  "accessTokenExpiresAt"  timestamptz,
  "refreshTokenExpiresAt" timestamptz,
  scope                   text,
  "idToken"               text,
  password                text,
  "createdAt"             timestamptz not null default now(),
  "updatedAt"             timestamptz not null default now()
);
create index if not exists account_user_idx on account("userId");

create table if not exists verification (
  id           text primary key,
  identifier   text not null,
  value        text not null,
  "expiresAt"  timestamptz not null,
  "createdAt"  timestamptz not null default now(),
  "updatedAt"  timestamptz not null default now()
);
create index if not exists verification_identifier_idx on verification(identifier);

-- One row per file the student has edited. Small text files only; the course
-- itself is never stored here, just the student's own work.
create table if not exists progress (
  "userId"    text not null references "user"(id) on delete cascade,
  course      text not null,
  path        text not null,
  content     text not null,
  "updatedAt" timestamptz not null default now(),
  primary key ("userId", course, path)
);
create index if not exists progress_user_course_idx on progress("userId", course);

-- Guard rails: a runaway client should not be able to fill the database.
alter table progress drop constraint if exists progress_path_len;
alter table progress add constraint progress_path_len check (length(path) <= 300);
alter table progress drop constraint if exists progress_content_len;
alter table progress add constraint progress_content_len check (length(content) <= 200000);
alter table progress drop constraint if exists progress_course_known;
alter table progress add constraint progress_course_known
  check (course in ('code-skool', 'py-skool', 'ai-skool'));
