# **AbbyBoard Documentation**
## Overview

meow

## Tables

### boards
```sql
board_id text NOT NULL UNIQUE,
flags text,
dname text,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
post_qty int
```

### posts
```sql
file_name text NOT NULL,
id text NOT NULL,
board text NOT NULL DEFAULT 'main',
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
```

### users
```sql
id text NOT NULL UNIQUE,
flags text
```

## Flags

- **User flags**: admin, banned
- **Board flags**: banned

## Endpoints

### POST /api/postimg
- **Headers**: `{token}`
- **Body**: `{image}`
- **Description**: Image needs to be provided in DataURL format, image/png only. You can't post too fast (checks for time of post before it), you can't post if you're banned.

### POST /api/deletepost
- **Headers**: `{token}`, `{filename}`
- **Description**: Removes post only if it's your own OR you're an admin. Removing a post does not delete the image from the storage.

### POST /api/ban
- **Headers**: `{token}`, `{filename}`
- **Description**: If you're an admin, sets flags to 'banned' for the user who made the `{filename}` post and deletes all their posts from the posts table.

### GET /api/flags
- **Headers**: `{uid}`
- **Description**: Gets the flags from the user with Discord ID `{uid}`. Flags are separated by spaces.

### GET /api/feed
- **Headers**: `{page}`
- **Description**: Returns an array with all available info for the amount of posts requested.

### GET /api/board
- **Headers**: `{board}`
- **Description**: Returns all available info for that specific board, or nothing.

## Tables

**boards**
```sql
board_id text NOT NULL UNIQUE,
flags text,
dname text,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
post_qty int
```

**posts**
```sql
file_name text NOT NULL,
id text NOT NULL,
board text NOT NULL DEFAULT 'main',
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
```

**users**
```sql
id text NOT NULL UNIQUE,
flags text
```

## Flags

**User flags**: admin, banned  
**Board flags**: banned


