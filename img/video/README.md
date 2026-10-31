# Background loops

Drop the four files below in this folder and the site picks them up on the next
build. Nothing else needs to change. Before a file lands, its slot shows the
still image it has always shown, so the site is never broken while you shoot.

| File | Slot | Poster it falls back to |
| --- | --- | --- |
| `hero.mp4` | Front page hero, full screen | `img/hero-court.jpg` |
| `chapel.mp4` | Front page chapel band + chapel page hero | `img/sign-band.jpg` |
| `courtyard.mp4` | Events page hero + visit page hero | `img/court2-band.jpg`, `img/court-band.jpg` |
| `bar.mp4` | Menu page hero | `img/bar-band.jpg` |

Spec: 1920x1080, H.264, 24 fps, **no audio track**, 8–12 s, under ~2.5 MB.
A `.webm` beside any of them (same name) is used instead when present.

## The loop contract

The clip sits behind a 60–90% black gradient, so it reads as movement and
texture, not as the subject. It must loop without a visible seam:

- Locked camera with the room moving, or
- a move that eases out and comes home in the same take, or
- a cut on a wipe (a person, a car, a light filling the frame).

A whip pan or a push-in that never comes home will show a jump every 10
seconds. Don't ship one.

## On phones

The video only plays on screens 900 px and wider, only when the slot is near
the viewport, and never on a save-data or 2G connection. Everyone else sees the
poster, so **the poster frame is the phone experience** — pull it from the clip
with `ffmpeg -i hero.mp4 -vf "select=eq(n\,0)" -frames:v 1 poster.jpg` rather
than letting it default to frame one, and export it 1600 px wide.
