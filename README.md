# pi-arc-history-cap

Keeps the undo history of pi-workspace-history under 5 GB: deletes whole project histories, least recently used first, never one used in the last day.

[pi-workspace-history](https://www.npmjs.com/package/pi-workspace-history) keeps one copy of each project and every version of the files the agent changed, with no size limit. Once per pi start, 20 s in, in the background, this deletes whole project histories (least recently used first) until the store is under 5 GB. A project used in the last day is never deleted.

## Install

```
pi install git:github.com/arda-kahraman/pi-arc-history-cap
```

Updates come with `pi update --extensions`.
