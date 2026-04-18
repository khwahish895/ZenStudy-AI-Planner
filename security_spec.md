# ZenStudy Security Specification

## Data Invariants
1. **User Ownership**: All documents (users, subjects, topics, sessions) must be owned by the authenticated user.
2. **Temporal Integrity**: Study sessions must have `startTime` before `endTime` and be within a reasonable duration (max 12 hours).
3. **Immutability**: `userId` fields must never change after creation.
4. **Referential Integrity**: A session must reference a valid subject ID if provided.

## The Dirty Dozen Payloads (Rejection Tests)
1. **The Hijacker**: Create a subject with `userId` of another user.
2. **The Time Traveler**: Create a session with `endTime` earlier than `startTime`.
3. **The Marathoner**: Create a session with a 24-hour duration.
4. **The Shadow Field**: Add a `hiddenAdmin: true` field to a user profile.
5. **The Identity Shifter**: Update a topic to change its `userId`.
6. **The Status Spoofer**: Set a topic status to `expert` (invalid enum).
7. **The Nameless**: Create a subject with an empty name.
8. **The Orphaned Session**: Create a session for a non-existent subject ID (checked via `exists`).
9. **The Unverified**: Write data without `email_verified == true`.
10. **The Anonymous Intruder**: Write data with an anonymous account.
11. **The ID Poisoner**: Use a 2KB string as a document ID.
12. **The Quick Edit**: Update a session's `startTime` but not the `updatedAt` field.

## Rules Draft
(Drafting in firestore.rules)
