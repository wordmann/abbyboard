# **AbbyBoard Documentation**

## > TO DO
- v1.3 Boards system 
  - frontend changes 
  - /api/feed/ changes 
  - /api/postimg changes DONE
  - boards column for posts DONE 
  - boards table DONE 

## > Tables

**boards**
```
board_id text NOT NULL UNIQUE,
flags text,
dname text,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
post_qty int
```

**posts**
```
file_name text NOT NULL,
id text NOT NULL,
board text NOT NULL DEFAULT('main'),
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
```

**users**
```
id text NOT NULL UNIQUE,
flags text
```

## > Flags
User flags: admin, banned\
Board flags: banned

## > Endpoints
**POST /api/postimg** 
> Headers: {token} \
Body: {image} \
Image needs to be provided in DataURL format, image/png only. You can't post too fast (checks for time of post before it), you can't post if you're banned

**POST /api/deletepost** 
> Headers: {token} {filename} \
Removes post only if it's your own OR you're an admin. removing a post does not delete the image from the storage

**POST /api/ban** 
> Headers: {token} {filename} \
If you're an admin, sets flags to 'banned' for the user who made the {filename} post and deletes all their posts from the posts table.

**GET /api/flags** 
> Headers: {uid} \
Gets the flags from the user with discord id {uid}. Flags are separated by spaces.

**GET /api/feed** 
> Headers: {page} \
Returns an array with all aveilable info for the ammount of posts requested 

**GET /api/board** 
> Headers: {board} \
Returns all aveilable info for that specific board, or nothing

